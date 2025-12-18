import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";
import logBalanceChange from "../../log-balance-change.js";
import sendLogMessage from "../../send-log-message.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-fine')
        .setDescription('Fines a user by reducing their balance.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('user to fine')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('Amount to fine')
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('Reason for the fine')
            .setRequired(true)),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin, roles.BalanceManage])) {
            return await interaction.reply({ content: 'You do not have permission to fine users.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason');

        return await interaction.reply({ content: 'Free trial over. This command is unavailable. Please consider purchasing our premium plan for unlimited access.', ephemeral: true });

        let balance = 0;

        try {
            const balanceRes = await sql`
                SELECT balance::numeric FROM balances
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            if (balanceRes.length === 0) {
                console.log(`creating new user for ${user.id}`);
                await sql`
                    INSERT INTO balances (server_id, discord_id, balance)
                    VALUES (${interaction.guildId}, ${user.id}, 0)
                `;
            } else {
                balance = Number(balanceRes[0].balance);  // Explicitly convert to number
            }

            const newBalance = balance - amount;

            await sql`
                UPDATE balances
                SET balance = ${newBalance}
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            await logBalanceChange({
                serverId: interaction.guildId,
                sourceUserId: interaction.user.id,
                targetUserId: user.id,
                amount: -amount,
                reason: 'fine',
                comment: reason
            });

            const message = `<@${interaction.user.id}> fined <@${user.id}> ${amount.toLocaleString()} ${consts.CoinEmoji}. New balance is ${newBalance.toLocaleString()} ${consts.CoinEmoji}`;
            await interaction.reply({
                content: message,
                ephemeral: true
            });
            
            await sendLogMessage(interaction, message);
            
            const fineLogMessage = `<@${interaction.user.id}> issued a fine:\n*   Player: <@${user.id}>\n*   Reason: ${reason}\n*   Amount: ${amount.toLocaleString()} ${consts.CoinEmoji}`;
            
            await sendLogMessage(interaction, fineLogMessage, consts.FineLogChannelId);
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to fine the user.', ephemeral: true });
        }
    },
};

