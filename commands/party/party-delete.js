import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-delete')
        .setDescription('Deletes an existing party.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the party to delete')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const serverId = interaction.guildId;
        const requesterId = interaction.user.id;

        try {
            const isAdmin = await roles.hasRole(interaction.member, [roles.Admin]);

            if (!isAdmin && !await roles.hasRole(interaction.member, [roles.PartyManage])) {
                return await interaction.reply({
                    content: 'You do not have permission to delete a party.',
                    ephemeral: true
                });
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

            if (party[0].created_by !== requesterId && !isAdmin) {
                return await interaction.reply({
                    content: `You do not have permission to delete the party "${partyName}". Only the creator or an admin can delete it.`,
                    ephemeral: true
                });
            }

            await sql`
                DELETE FROM party_members
                WHERE party_id = ${party[0].id}
            `;

            await sql`
                DELETE FROM parties
                WHERE id = ${party[0].id}
            `;

            await interaction.reply({
                content: `The party "${partyName}" has been successfully deleted.`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to delete the party.',
                ephemeral: true
            });
        }
    },
};