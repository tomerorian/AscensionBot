import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rthkuqkvbjozjzoabvfh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildIntegrations
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  console.log('Received an interaction'); // Log when an interaction is received

  // // Check if the interaction is a command
  // if (!interaction.isCommand()) {
  //   console.log('Not a command interaction');
  //   return;
  // }
  //
  // console.log(`Command received: ${interaction.commandName}`); // Log the command name
  //
  // if (interaction.commandName === 'add-balance') {
  //   const amount = interaction.options.getInteger('amount');
  //   console.log(`Amount received: ${amount}`); // Log the amount received
  //
  //   // Your Supabase update logic goes here
  //   try {
  //     // (Assuming you've set up the Supabase client correctly)
  //     const { data, error } = await supabase
  //         .from('users')
  //         .update({ balance: newBalance }) // Update with your logic
  //         .eq('discord_id', interaction.user.id); // Use the actual user's Discord ID
  //
  //     if (error) throw error;
  //
  //     await interaction.reply(`Successfully added ${amount} to your balance!`);
  //     console.log('Balance updated successfully');
  //   } catch (error) {
  //     console.error('Error updating balance:', error);
  //     await interaction.reply('There was an error updating your balance.');
  //   }
  // }
});

client.on('messageCreate', async message => {
  console.log('LOLOLOL');
  await message.reply('Ahoy');
});

client.login(process.env.DISCORD_TOKEN);