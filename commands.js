import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const commands = [
  new SlashCommandBuilder()
      .setName('add-balance')
      .setDescription('Adds balance to a user')
      .addIntegerOption(option =>
          option.setName('amount')
              .setDescription('The amount to add')
              .setRequired(true)
      ),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Started refreshing global application (/) commands.');

    await rest.put(
        Routes.applicationCommands(process.env.APP_ID), // Use the global command route
        { body: commands },
    );

    console.log('Successfully registered global application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();