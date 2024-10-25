import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'

export default {
    data: new SlashCommandBuilder()
        .setName('add-balance')
        .setDescription('Adds balance to a user.'),
    async execute(interaction) {
        const balanceRes = await supabase.from('users').select('balance').eq('discord_id', interaction.user.id);
        
        if (balanceRes.error != null) {
            console.log(balanceRes.error.message);
            
            return await interaction.reply('An error occurred while trying to add balance.');
        }
        
        const balance = balanceRes.data[0].balance;
        const newBalance = balance + 100;
        
        await supabase.from('users').update({ balance: newBalance }).eq('discord_id', interaction.user.id);
        
        await interaction.reply(`Added 100 to <@${interaction.user.id}>. New balance is ${newBalance}`);
    },
};