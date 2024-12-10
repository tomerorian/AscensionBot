import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";
import logBalanceChange from "../../log-balance-change.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-accept')
        .setDescription('Closes an existing party and transfers balances to the main balance table.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the party to accept')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const serverId = interaction.guildId;

        if (!await roles.hasRole(interaction.member, [roles.Admin, roles.BalanceManage])) {
            return await interaction.reply({
                content: 'You do not have permission to close a party.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const party = await sql`
                SELECT id FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (party.length === 0) {
                return await interaction.editReply({
                    content: `No party with the name "${partyName}" exists in this server.`
                });
            }

            const members = await sql`
                SELECT discord_id, balance FROM party_members
                WHERE party_id = ${party[0].id}
            `;
            
            for (const member of members) {
                const currentBalance = await sql`
                    SELECT balance::numeric FROM balances
                    WHERE server_id = ${serverId} AND discord_id = ${member.discord_id}
                `;

                if (currentBalance.length === 0) {
                    await sql`
                        INSERT INTO balances (server_id, discord_id, balance)
                        VALUES (${serverId}, ${member.discord_id}, ${Number(member.balance)})
                    `;
                } else {
                    const newBalance = Number(currentBalance[0].balance) + Number(member.balance);
                    await sql`
                        UPDATE balances
                        SET balance = ${newBalance}
                        WHERE server_id = ${serverId} AND discord_id = ${member.discord_id}
                    `;
                }

                await logBalanceChange({
                    serverId: serverId,
                    sourceUserId: interaction.user.id,
                    targetUserId: member.discord_id,
                    amount: Number(member.balance),
                    reason: 'party-close',
                    comment: `Party "${partyName}" was closed`
                });

                const logChannel = interaction.guild.channels.cache.get(consts.LogChannelId);
                if (logChannel) {
                    await logChannel.send(
                        `<@${interaction.user.id}> added ${Number(member.balance).toLocaleString()} ${consts.CoinEmoji} to <@${member.discord_id}>.`
                    );
                } else {
                    console.error('Log channel not found.');
                }
            }

            await sql`
                DELETE FROM party_members
                WHERE party_id = ${party[0].id}
            `;

            await sql`
                DELETE FROM parties
                WHERE id = ${party[0].id}
            `;

            await interaction.editReply({
                content: `The party "${partyName}" has been successfully closed, and all member balances have been transferred.`
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while trying to close the party.'
            });
        }
    },
};
