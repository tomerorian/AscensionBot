import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-kick')
        .setDescription('Removes a member from an existing party.')
        .addStringOption(option =>
            option
                .setName('party')
                .setDescription('The name of the party')
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The Discord user to remove from the party')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('party');
        const member = interaction.options.getUser('member');
        const serverId = interaction.guildId;
        const requesterId = interaction.user.id;

        try {
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
                    content: `You do not have permission to remove members from the party "${partyName}". Only the creator or an admin can manage members.`,
                    ephemeral: true
                });
            }

            const memberExists = await sql`
                SELECT 1 FROM party_members
                WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
            `;

            if (memberExists.length === 0) {
                return await interaction.reply({
                    content: `<@${member.id}> is not a member of the party "${partyName}".`,
                    ephemeral: true
                });
            }

            await sql`
                DELETE FROM party_members
                WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
            `;

            await interaction.reply({
                content: `<@${member.id}> has been successfully removed from the party "${partyName}".`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to remove the member from the party.',
                ephemeral: true
            });
        }
    },
};
