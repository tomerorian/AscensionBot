import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";

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
            .setRequired(true)),

    async execute(interaction) {
        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to add balance.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        let balance = 0;

        try {
            const balanceRes = await sql`
                SELECT balance FROM balances
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            if (balanceRes.length === 0) {
                console.log(`creating new user for ${user.id}`);
                await sql`
                    INSERT INTO balances (server_id, discord_id, balance)
                    VALUES (${interaction.guildId}, ${user.id}, 0)
                `;
            } else {
                balance = balanceRes[0].balance;
            }

            const newBalance = balance + amount;

            await sql`
                UPDATE balances
                SET balance = ${newBalance}
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            await interaction.reply(`<@${interaction.user.id}> added ${amount.toLocaleString()} ${consts.CoinEmoji} to <@${user.id}>. New balance is ${newBalance.toLocaleString()} ${consts.CoinEmoji}`);
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to add balance.', ephemeral: true });
        }
    },
};