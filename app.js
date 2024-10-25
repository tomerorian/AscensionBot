import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rthkuqkvbjozjzoabvfh.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'add-balance') {
    const amount = data.options[0].value;

    const balanceResponse = await supabase.from('users').select('balance').eq('discord_id', 'gogofo');
    const balance = balanceResponse.data[0].balance;

    await supabase.from('users').update({ balance: balance + amount }).eq('discord_id', 'gogofo');
    const dbResponse = await supabase.from('users').select();

    await interaction.reply(`@${data.id} ${JSON.stringify(data)}`);
  }
});

client.on('messageCreate', async message => {
  await message.reply('Hello!');
});

client.login(process.env.DISCORD_TOKEN);
