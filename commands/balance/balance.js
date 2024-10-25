import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabaseClient.js'

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Shows your balance.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('user to check balance for')
            .setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const userId = user?.id ?? interaction.user.id;

        const balanceRes = await supabase
            .from('balances')
            .select('balance')
            .eq('server_id', interaction.guildId)
            .eq('discord_id', userId);

        if (balanceRes.error !== null) {
            console.log(balanceRes.error.message);

            return await interaction.reply('An error occurred while trying to find the balance.');
        }

        let balance = 0;

        if (balanceRes.data.length === 0 || balanceRes.data[0] === null) {
            balance = 0;
        } else {
            balance = balanceRes.data[0].balance;
        }
        
        if (user !== null) {
            await interaction.reply(`<@${user.id}> balance is ${balance}`);
        } else {
            await interaction.reply(`Your balance is ${balance}`);
        }
    },
};