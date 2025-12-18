import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";
import logBalanceChange from "../../log-balance-change.js";
import sendLogMessage from "../../send-log-message.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-add')
        .setDescription('Adds balance to a user.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('user to add balance to')
            .setRequired(true))
        .addIntegerOption(option => option
            .setName('amount')
            .setDescription('Amount to add')
            .setRequired(true))
        .addStringOption(option => option
            .setName('comment')
            .setDescription('Optional comment for the balance change')
            .setRequired(false)),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin, roles.BalanceManage])) {
            return await interaction.reply({ content: 'You do not have permission to add balance.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const comment = interaction.options.getString('comment') || null;
        
        if (amount > 500000 || amount < -500000) {
            return await interaction.reply({ content: 'Free trial over. Balance changes are limited to 500k. Please consider purchasing our premium plan for unlimited access.', ephemeral: true });
        }

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

            const newBalance = balance + amount;

            await sql`
                UPDATE balances
                SET balance = ${newBalance}
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            await logBalanceChange({
                serverId: interaction.guildId,
                sourceUserId: interaction.user.id,
                targetUserId: user.id,
                amount: amount,
                reason: 'manual',
                comment: comment
            });

            const message = `<@${interaction.user.id}> added ${amount.toLocaleString()} ${consts.CoinEmoji} to <@${user.id}>. New balance is ${newBalance.toLocaleString()} ${consts.CoinEmoji}${comment ? ` (Comment: ${comment})` : ''}`;
            await interaction.reply({
                content: message,
                ephemeral: true
            });
            
            await sendLogMessage(interaction, message);
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to add balance.', ephemeral: true });
        }
    },
};