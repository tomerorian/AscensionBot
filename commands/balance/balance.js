import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabase-client.js'
import roles from "../../roles.js";
import consts from "../../consts.js";

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
        
        if (user !== null && !roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to check the balance of other users.', ephemeral: true });
        }

        const balanceRes = await supabase
            .from('balances')
            .select('balance')
            .eq('server_id', interaction.guildId)
            .eq('discord_id', userId);

        if (balanceRes.error !== null) {
            console.log(balanceRes.error.message);

            return await interaction.reply({ content: 'An error occurred while trying to find the balance.', ephemeral: true });
        }

        let balance = 0;

        if (balanceRes.data.length === 0 || balanceRes.data[0] === null) {
            balance = 0;
        } else {
            balance = balanceRes.data[0].balance;
        }
        
        let reply = '';
        
        if (user !== null) {
            reply = `<@${user.id}> balance is ${balance.toLocaleString()} ${consts.CoinEmoji}`;
        } else {
            reply = `Your balance is ${balance.toLocaleString()} ${consts.CoinEmoji}`;
        }

        await interaction.reply({ content: reply, ephemeral: true });
    },
};