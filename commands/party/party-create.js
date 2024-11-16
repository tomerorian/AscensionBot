import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('party-create')
        .setDescription('Creates a new party.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The unique name of the party')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const serverId = interaction.guildId;
        const creatorId = interaction.user.id;

        try {
            const existingParty = await sql`
                SELECT 1 FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (existingParty.length > 0) {
                return await interaction.reply({
                    content: `A party with the name "${partyName}" already exists in this server.`,
                    ephemeral: true
                });
            }

            await sql`
                INSERT INTO parties (server_id, name, created_by)
                VALUES (${serverId}, ${partyName}, ${creatorId})
            `;

            await interaction.reply(`Party "${partyName}" has been successfully created by <@${creatorId}>.`);
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to create the party.',
                ephemeral: true
            });
        }
    },
};
