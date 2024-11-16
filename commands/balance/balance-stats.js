import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-stats')
        .setDescription('Shows the balance stats.'),

    async execute(interaction) {
        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to view balance stats.', ephemeral: true });
        }
        
        try {
            // query sum of all balances separated by positives and negatives
            const [result] = await sql`
                SELECT SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as positive_balance,
                       SUM(CASE WHEN balance < 0 THEN balance ELSE 0 END) as negative_balance
                FROM balances
                WHERE server_id = ${interaction.guildId}
            `;
            
            const reply = `
Guild Owes: ${Number(result.positive_balance).toLocaleString()} ${consts.CoinEmoji}
Owed to the guild: ${(-Number(result.negative_balance)).toLocaleString()} ${consts.CoinEmoji}
`;

            await interaction.reply({ content: reply, ephemeral: true });
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to get balance stats.', ephemeral: true });
        }
    },
};