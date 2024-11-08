import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-rank')
        .setDescription('Shows the balance rankings.'),

    async execute(interaction) {
        try {
            const balanceRes = await sql`
                SELECT balance, discord_id FROM balances
                WHERE server_id = ${interaction.guildId} AND balance != 0
                ORDER BY balance DESC
                LIMIT 10
            `;

            const reply = balanceRes.map(x => `<@${x.discord_id}>: ${x.balance.toLocaleString()} ${consts.CoinEmoji}`).join('\n');

            await interaction.reply({ content: reply, ephemeral: true });
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to get balance rank.', ephemeral: true });
        }
    },
};