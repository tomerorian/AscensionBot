import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('party-members')
        .setDescription('Lists the members of a party.')
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
                SELECT discord_id FROM party_members
                WHERE party_id = ${party[0].id}
            `;

            if (members.length === 0) {
                return await interaction.reply({
                    content: `The party "${partyName}" has no members.`,
                    ephemeral: true
                });
            }

            const memberList = members.map(member => `<@${member.discord_id}>`).join('\n');
            await interaction.reply({
                content: `Members of "${partyName}":\n${memberList}`,
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