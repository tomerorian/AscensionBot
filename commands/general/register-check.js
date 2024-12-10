import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('check-registrations')
        .setDescription('Lists all users in the server who have registered an in-game name.'),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const serverId = interaction.guildId;

            const registeredUsers = await sql`
                SELECT discord_id, alias FROM aliases
                WHERE server_id = ${serverId}
            `;

            if (registeredUsers.length === 0) {
                return await interaction.editReply('No users in the server have registered an in-game name.');
            }

            const registeredList = registeredUsers
                .map(user => `<@${user.discord_id}>: ${user.alias}`)
                .join(', ');

            await interaction.editReply({
                content: `The following users have registered an in-game name:\n${registeredList}`
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while retrieving registrations.'
            });
        }
    },
};
