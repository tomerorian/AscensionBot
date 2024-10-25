import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-rank')
        .setDescription('Shows the balance rankings.'),

    async execute(interaction) {
        const balanceRes = await supabase
            .from('balances')
            .select('balance,discord_id')
            .eq('server_id', interaction.guildId)
            .order('balance', { ascending: false })
            .limit(10);

        if (balanceRes.error != null) {
            console.log(balanceRes.error.message);

            return await interaction.reply('An error occurred while trying to get balance rank.');
        }
        
        const reply = balanceRes.data.map(x => `<@${x.discord_id}>: ${x.balance} ${consts.CoinEmoji}`).join('\n');

        await interaction.reply(reply);
    },
};