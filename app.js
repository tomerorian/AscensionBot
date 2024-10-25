import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rthkuqkvbjozjzoabvfh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  console.log('Interaction received'); // Check if this prints in the console

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'add-balance') {
    console.log('add-balance command triggered'); // Check if this prints

    const amount = interaction.options.getInteger('amount');

    const balanceResponse = await supabase
        .from('users')
        .select('balance')
        .eq('discord_id', interaction.user.id);

    const balance = balanceResponse.data?.[0]?.balance || 0;

    await supabase
        .from('users')
        .update({ balance: balance + amount })
        .eq('discord_id', interaction.user.id);

    await interaction.reply(`@${interaction.user.tag}, your balance was updated!`);
  }
});

client.login(process.env.DISCORD_TOKEN);