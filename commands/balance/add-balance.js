import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'

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
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        
        const balanceRes = await supabase.from('users').select('balance').eq('discord_id', user.id);
        
        if (balanceRes.error != null) {
            console.log(balanceRes.error.message);
            
            return await interaction.reply('An error occurred while trying to add balance.');
        }
        
        if (balanceRes.data.length === 0 || balanceRes.data[0] === null) {
            return await interaction.reply('User not found.');
        }
        
        const balance = balanceRes.data[0].balance;
        const newBalance = balance + amount;
        
        await supabase.from('users').update({ balance: newBalance }).eq('discord_id', user.id);
        
        await interaction.reply(`Added 100 to <@${interaction.user.id}>. New balance is ${newBalance}`);
    },
};