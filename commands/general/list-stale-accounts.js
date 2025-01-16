import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('list-stale-accounts')
        .setDescription('Lists users who do not have specific roles and checks their balance.')
        .addRoleOption(option =>
            option
                .setName('role1')
                .setDescription('First role to check for')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option
                .setName('role2')
                .setDescription('Second role to check for')
                .setRequired(false)
        )
        .addRoleOption(option =>
            option
                .setName('role3')
                .setDescription('Third role to check for')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const role1 = interaction.options.getRole('role1');
            const role2 = interaction.options.getRole('role2');
            const role3 = interaction.options.getRole('role3');
            const rolesToCheck = [role1, role2, role3].filter(Boolean);

            const members = await interaction.guild.members.fetch();

            const filteredMembers = members.filter(member =>
                !rolesToCheck.some(role => role && member.roles.cache.has(role.id))
            );

            if (filteredMembers.size === 0) {
                return await interaction.editReply('All users in the server have at least one of the specified roles.');
            }

            const userIds = filteredMembers.map(member => member.user.id);

            const balances = await sql`
                SELECT discord_id, balance::numeric
                FROM balances
                WHERE server_id = ${interaction.guildId} AND discord_id = ANY(${sql.array(userIds)})
            `;

            const usersWithBalance = balances.filter(balance => Number(balance.balance) !== 0);
            const usersWithoutBalance = userIds.filter(id =>
                !usersWithBalance.some(balance => balance.discord_id === id)
            );

            const listWithBalance = usersWithBalance
                .map(user => `<@${user.discord_id}>: ${user.balance.toLocaleString()} ${consts.CoinEmoji}`)
                .join('\n');

            const listWithoutBalance = usersWithoutBalance
                .map(id => `<@${id}>: 0 🪙`)
                .join('\n');

            await interaction.editReply({
                content: `**Users with a balance:**\n${listWithBalance || 'None'}\n\n**Users without a balance:**\n${listWithoutBalance || 'None'}`.slice(0, 2000)
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while processing the request.'
            });
        }
    },
};
