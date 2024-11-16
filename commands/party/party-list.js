import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('party-list')
        .setDescription('Lists all parties and their creators.'),

    async execute(interaction) {
        const serverId = interaction.guildId;

        try {
            const parties = await sql`
                SELECT name, created_by FROM parties
                WHERE server_id = ${serverId}
            `;

            if (parties.length === 0) {
                return await interaction.reply({
                    content: `No parties exist in this server.`,
                    ephemeral: true
                });
            }

            const partyList = parties.map(party => `- "${party.name}" (created by <@${party.created_by}>)`).join('\n');
            await interaction.reply({
                content: `Parties in this server:\n${partyList}`,
                ephemeral: false
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to retrieve the party list.',
                ephemeral: true
            });
        }
    },
};
