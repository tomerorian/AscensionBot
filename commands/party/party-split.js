import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-split')
        .setDescription('Splits an amount among party members, with an optional tax.')
        .addNumberOption(option =>
            option
                .setName('amount')
                .setDescription('The total amount to split')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('party')
                .setDescription('The name of the party')
                .setRequired(false)
        )
        .addNumberOption(option =>
            option
                .setName('tax')
                .setDescription('The tax percentage to apply (default is 35%)')
                .setRequired(false)
        ),

    async execute(interaction) {
        let partyName = interaction.options.getString('party');
        const amount = interaction.options.getNumber('amount');
        const taxPercentage = interaction.options.getNumber('tax') ?? 35;
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
                SELECT id FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (party.length === 0) {
                return await interaction.reply({
                    content: `No party with the name "${partyName}" exists in this server.`,
                    ephemeral: true
                });
            }

            const members = await sql`
                    SELECT discord_id, balance
                    FROM party_members
                    WHERE party_id = ${party[0].id} AND is_active = TRUE
            `;

            if (members.length === 0) {
                return await interaction.reply({
                    content: `The party "${partyName}" has no members to split the amount.`,
                    ephemeral: true
                });
            }

            const taxMultiplier = (100 - taxPercentage) / 100;
            const netAmount = Math.floor(amount * taxMultiplier);
            const splitAmount = Math.floor(netAmount / members.length);

            const updatedBalances = members.map(member => ({
                discord_id: member.discord_id,
                new_balance: Number(member.balance) + splitAmount
            }));

            for (const { discord_id, new_balance } of updatedBalances) {
                await sql`
                    UPDATE party_members
                    SET balance = ${new_balance}
                    WHERE party_id = ${party[0].id} AND discord_id = ${discord_id}
                `;
            }

            await interaction.reply({
                content: `The amount of ${amount.toLocaleString()} ${consts.CoinEmoji} has been split among the party members of "${partyName}". Each member received ${splitAmount.toLocaleString()} ${consts.CoinEmoji} after a ${taxPercentage}% tax.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to split the amount.',
                ephemeral: true
            });
        }
    },
};
