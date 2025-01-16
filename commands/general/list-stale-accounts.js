import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('list-stale-accounts')
        .setDescription('Lists users that can be removed.')
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
            const memberIds = new Set(members.map(member => member.user.id));

            const filteredMembers = members.filter(member =>
                !rolesToCheck.some(role => role && member.roles.cache.has(role.id))
            );

            const userIds = filteredMembers.map(member => member.user.id);

            // Fetch balances for users in the server
            const balances = await sql`
                SELECT discord_id, balance::numeric
                FROM balances
                WHERE server_id = ${interaction.guildId}
            `;

            const usersWithBalance = balances.filter(balance => Number(balance.balance) !== 0);
            const usersWithoutBalance = userIds.filter(id =>
                !usersWithBalance.some(balance => balance.discord_id === id)
            );

            // Identify users with balance not in the server
            const balancesNotInServer = usersWithBalance.filter(balance =>
                !memberIds.has(balance.discord_id)
            );

            const listWithBalance = usersWithBalance
                .filter(user => memberIds.has(user.discord_id)) // Only those still in the server
                .map(user => `<@${user.discord_id}>: ${Number(user.balance).toLocaleString()} ${consts.CoinEmoji}`)
                .join('\n');

            const listWithoutBalance = usersWithoutBalance
                .map(id => `<@${id}>: 0 ${consts.CoinEmoji}`)
                .join('\n');

            const listNotInServer = balancesNotInServer
                .map(user => `User ID: ${user.discord_id}, Balance: ${Number(user.balance).toLocaleString()} 🪙`)
                .join('\n');

            await interaction.editReply({
                content: `**Users with a balance:**\n${listWithBalance || 'None'}\n\n` +
                    `**Users without a balance:**\n${listWithoutBalance || 'None'}\n\n` +
                    `**Users with a balance but not in the server:**\n${listNotInServer || 'None'}`
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while processing the request.'
            });
        }
    },
};
