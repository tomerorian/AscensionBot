import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('check-registrations')
        .setDescription('Checks if all users in the server have a registered in-game name.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const serverId = interaction.guildId;

            const memberIds = members.map(member => member.user.id);

            const registeredUsers = await sql`
                SELECT discord_id FROM aliases
                WHERE server_id = ${serverId} AND discord_id = ANY(${sql.array(memberIds)})
            `;

            const registeredIds = new Set(registeredUsers.map(user => user.discord_id));

            const unregisteredMembers = members.filter(member => !registeredIds.has(member.user.id));

            if (unregisteredMembers.size === 0) {
                return await interaction.editReply('All users in the server have a registered in-game name.');
            }

            const unregisteredList = unregisteredMembers.map(member => `<@${member.user.id}>`).join('\n');

            await interaction.editReply({
                content: `The following users do not have a registered in-game name:\n${unregisteredList}`
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while checking registrations.'
            });
        }
    },
};
