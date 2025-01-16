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

            const filteredMemberIds = new Set(filteredMembers.map(member => member.user.id));

            // Fetch balances
            const balances = await sql`
                SELECT discord_id, balance::numeric
                FROM balances
                WHERE server_id = ${interaction.guildId}
            `;

            const usersWithBalanceAndWithoutRoles = balances.filter(balance =>
                filteredMemberIds.has(balance.discord_id) && Number(balance.balance) !== 0
            );

            const usersWithoutBalanceAndWithoutRoles = [...filteredMemberIds].filter(id =>
                !balances.some(balance => balance.discord_id === id)
            );

            const usersNotInServer = balances.filter(balance =>
                !memberIds.has(balance.discord_id) && Number(balance.balance) !== 0
            );

            const listWithBalance = usersWithBalanceAndWithoutRoles
                .map(user => `<@${user.discord_id}>: ${Number(user.balance).toLocaleString()} ${consts.CoinEmoji}`)
                .join('\n');

            const listWithoutBalance = usersWithoutBalanceAndWithoutRoles
                .map(id => `<@${id}>: 0 ${consts.CoinEmoji}`)
                .join('\n');

            const listNotInServer = usersNotInServer
                .map(user => `User ID: <@${user.discord_id}> (${user.discord_id}), Balance: ${Number(user.balance).toLocaleString()} ${consts.CoinEmoji}`)
                .join('\n');

            const message = `**Balance, No roles:**\n${listWithBalance || 'None'}\n\n` +
                `**Balance, Not in the server:**\n${listNotInServer || 'None'}\n\n` +
                `**No balance, No roles:**\n${listWithoutBalance || 'None'}`;

            await interaction.editReply({
                content: message.slice(0, 2000) // Limit to Discord's character limit
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while processing the request.'
            });
        }
    },
};
