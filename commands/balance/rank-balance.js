import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-rank')
        .setDescription('Shows the balance rankings.'),

    async execute(interaction) {
        try {
            const topBalances = await sql`
                SELECT balance::numeric, discord_id FROM balances
                WHERE server_id = ${interaction.guildId} AND balance > 0
                ORDER BY balance DESC
                LIMIT 10
            `;

            const bottomBalances = await sql`
                SELECT balance::numeric, discord_id FROM balances
                WHERE server_id = ${interaction.guildId} AND balance < 0
                ORDER BY balance ASC
                LIMIT 10
            `;

            const reply = `
                Leaderboard:
                ${topBalances.map(x => `<@${x.discord_id}>: ${Number(x.balance).toLocaleString()} ${consts.CoinEmoji}`).join('\n')}

                Board of Shame:
                ${bottomBalances.map(x => `<@${x.discord_id}>: ${Number(x.balance).toLocaleString()} ${consts.CoinEmoji}`).join('\n')}
            `;

            await interaction.reply({ content: reply, ephemeral: true });
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to get balance rank.', ephemeral: true });
        }
    },
};