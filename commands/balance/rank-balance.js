import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'
import * as repl from "node:repl";

export default {
    data: new SlashCommandBuilder()
        .setName('rank-balance')
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

        const coinEmoji = interaction.guild.emojis.cache.find(emoji => emoji.name === 'coin');
        const reply = balanceRes.data.map(x => `<@${x.discord_id}>: ${x.balance} :coin: ${coinEmoji}`).join('\n');

        await interaction.reply(reply);
    },
};