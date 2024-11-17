import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-members')
        .setDescription('Lists the members of a party and their balances.')
        .addStringOption(option =>
            option
                .setName('party')
                .setDescription('The name of the party')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('party');
        const serverId = interaction.guildId;

        try {
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
                SELECT discord_id, balance FROM party_members
                WHERE party_id = ${party[0].id}
            `;

            if (members.length === 0) {
                return await interaction.reply({
                    content: `The party "${partyName}" has no members.`,
                    ephemeral: true
                });
            }

            const totalBalance = members.reduce((sum, member) => sum + Number(member.balance), 0);
            const memberList = members.map(member => `<@${member.discord_id}>: ${member.balance.toLocaleString()} ${consts.CoinEmoji}`).join('\n');

            await interaction.reply({
                content: `Members of "${partyName}":\n\n**Total Balance**: ${totalBalance.toLocaleString()} ${consts.CoinEmoji}\n\n${memberList}`,
                ephemeral: false
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to retrieve the party members.',
                ephemeral: true
            });
        }
    },
};
