import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'
import Roles from "../../Roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('clear-balance')
        .setDescription('Clears the balance of a user.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('user to add balance to')
            .setRequired(true)),
    
    async execute(interaction) {
        if (!Roles.hasRole(interaction.member, [Roles.Admin])) {
            return await interaction.reply('You do not have permission to clear balance.');
        }
        
        const user = interaction.options.getUser('user');
        
        const balanceRes = await supabase
            .from('balances')
            .select('balance')
            .eq('server_id', interaction.guildId)
            .eq('discord_id', user.id);
        
        if (balanceRes.error != null) {
            console.log(balanceRes.error.message);
            
            return await interaction.reply('An error occurred while trying to clear balance.');
        }
        
        let balance = 0;
        
        if (balanceRes.data.length === 0 || balanceRes.data[0] === null) {
            console.log(`creating new user for ${user.id}`);
            
            await supabase.from('balances').insert({ server_id: interaction.guildId, discord_id: user.id, balance: 0 });
        } else {
            balance = balanceRes.data[0].balance;
        }

        await supabase.from('balances').update({ balance: 0 })
            .eq('server_id', interaction.guildId)
            .eq('discord_id', user.id);
        
        await interaction.reply(`Cleared ${balance} from <@${interaction.user.id}>. New balance is 0`);
    },
};