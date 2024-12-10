import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";
import logBalanceChange from "../../log-balance-change.js";
import sendLogMessage from "../../send-log-message.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-delete')
        .setDescription('Clears the balance of a user by their Discord ID.')
        .addStringOption(option => option
            .setName('user-id')
            .setDescription('Discord ID of the user to clear balance for')
            .setRequired(true))
        .addStringOption(option => option
            .setName('comment')
            .setDescription('Optional comment for clearing the balance')
            .setRequired(false)),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin, roles.BalanceManage])) {
            return await interaction.reply({ content: 'You do not have permission to clear balance.', ephemeral: true });
        }

        const userId = interaction.options.getString('user-id');
        const comment = interaction.options.getString('comment') || null;

        let balance = 0;

        try {
            const balanceRes = await sql`
                SELECT balance::numeric FROM balances
                WHERE server_id = ${interaction.guildId} AND discord_id = ${userId}
            `;

            if (balanceRes.length === 0) {
                return await interaction.reply({
                    content: `No balance entry found for the user with ID ${userId}.`,
                    ephemeral: true
                });
            }

            balance = Number(balanceRes[0].balance);

            await sql`
                UPDATE balances
                SET balance = 0
                WHERE server_id = ${interaction.guildId} AND discord_id = ${userId}
            `;

            await logBalanceChange({
                serverId: interaction.guildId,
                sourceUserId: interaction.user.id,
                targetUserId: userId,
                amount: -balance,
                reason: 'manual',
                comment: comment
            });

            const message = `<@${interaction.user.id}> cleared ${balance.toLocaleString()} ${consts.CoinEmoji} from user ID ${userId}. New balance is 0 ${consts.CoinEmoji}`;
            await interaction.reply({
                content: message,
                ephemeral: true
            });

            await sendLogMessage(interaction, message);
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to clear balance.', ephemeral: true });
        }
    },
};
