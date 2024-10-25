import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'
import roles from "../../roles.js";
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('add-balance')
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
            return await interaction.reply('You do not have permission to add balance.');
        }
        
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        const balanceRes = await supabase
            .from('balances')
            .select('balance')
            .eq('server_id', interaction.guildId)
            .eq('discord_id', user.id);
        
        if (balanceRes.error != null) {
            console.log(balanceRes.error.message);
            
            return await interaction.reply('An error occurred while trying to add balance.');
        }
        
        let balance = 0;
        
        if (balanceRes.data.length === 0 || balanceRes.data[0] === null) {
            console.log(`creating new user for ${user.id}`);
            
            await supabase.from('balances').insert({ server_id: interaction.guildId, discord_id: user.id, balance: 0 });
        } else {
            balance = balanceRes.data[0].balance;
        }
        
        const newBalance = balance + amount;
        
        await supabase.from('balances').update({ balance: newBalance })
            .eq('server_id', interaction.guildId)
            .eq('discord_id', user.id);
        
        await interaction.reply(`Added ${amount} ${consts.CoinEmoji} to <@${user.id}>. New balance is ${newBalance} ${consts.CoinEmoji}`);
    },
};