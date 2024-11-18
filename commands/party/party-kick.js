import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-kick')
        .setDescription('Removes a member from an existing party.')
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The Discord user to remove from the party')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('party')
                .setDescription('The name of the party')
                .setRequired(false)
        ),

    async execute(interaction) {
        let partyName = interaction.options.getString('party');
        const member = interaction.options.getUser('member');
        const serverId = interaction.guildId;
        const requesterId = interaction.user.id;

        try {
            if (!partyName) {
                const cachedParty = await sql`
                    SELECT party_name FROM player_cache
                    WHERE discord_id = ${requesterId}
                `;
                if (cachedParty.length === 0 || !cachedParty[0].party_name) {
                    return await interaction.reply({
                        content: 'You must specify a party name or have a cached party to use this command.',
                        ephemeral: true
                    });
                }
                partyName = cachedParty[0].party_name;
            }

            const party = await sql`
                SELECT id, created_by FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (party.length === 0) {
                return await interaction.reply({
                    content: `No party with the name "${partyName}" exists in this server.`,
                    ephemeral: true
                });
            }

            const isAdmin = roles.hasRole(interaction.member, [roles.Admin]);
            if (party[0].created_by !== requesterId && !isAdmin) {
                return await interaction.reply({
                    content: `You do not have permission to remove members from the party "${partyName}".`,
                    ephemeral: true
                });
            }

            const memberRecord = await sql`
                SELECT is_active, balance FROM party_members
                WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
            `;

            if (memberRecord.length === 0 || !memberRecord[0].is_active) {
                return await interaction.reply({
                    content: `<@${member.id}> is not an active member of the party "${partyName}".`,
                    ephemeral: true
                });
            }

            if (memberRecord[0].balance === 0) {
                await sql`
                    DELETE FROM party_members
                    WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
                `;
                return await interaction.reply({
                    content: `<@${member.id}> has been removed from the party "${partyName}".`,
                    ephemeral: true
                });
            } else {
                await sql`
                    UPDATE party_members
                    SET is_active = FALSE
                    WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
                `;
                return await interaction.reply({
                    content: `<@${member.id}> has been deactivated in the party "${partyName}" but their balance remains.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to remove the member from the party.',
                ephemeral: true
            });
        }
    },
};