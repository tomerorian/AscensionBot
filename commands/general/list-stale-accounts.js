import { SlashCommandBuilder } from 'discord.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('list-stale-accounts')
        .setDescription('Lists all users in the server who do not have a specific role.')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to check for')
                .setRequired(true)
        ),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const role = interaction.options.getRole('role');
            const members = await interaction.guild.members.fetch();

            const staleAccounts = members.filter(member => !member.roles.cache.has(role.id));

            if (staleAccounts.size === 0) {
                return await interaction.editReply(`All users in the server have the role "${role.name}".`);
            }

            const staleList = staleAccounts.map(member => `<@${member.user.id}>`).join('\n');

            await interaction.editReply({
                content: `The following users do not have the role "${role.name}":\n${staleList}`.slice(0, 2000)
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while checking stale accounts.'
            });
        }
    },
};
