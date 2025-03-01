import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('compare-chests')
        .setDescription('Compares two chest inventories and lists missing items')
        .addAttachmentOption(option =>
            option
                .setName('looted')
                .setDescription('CSV file of the first chest inventory')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName('deposited')
                .setDescription('CSV file of the second chest inventory')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const lootedAttachment = interaction.options.getAttachment('looted');
            const depositedAttachment = interaction.options.getAttachment('deposited');

            if (!lootedAttachment || !depositedAttachment) {
                return await interaction.editReply('Both chest inventory files must be provided.');
            }

            const lootedFilePath = path.join('/tmp', 'looted.csv');
            const depositedFilePath = path.join('/tmp', 'deposited.csv');

            const lootedFile = await fetch(lootedAttachment.url);
            const depositedFile = await fetch(depositedAttachment.url);

            const lootedBuffer = await lootedFile.arrayBuffer();
            const depositedBuffer = await depositedFile.arrayBuffer();

            fs.writeFileSync(lootedFilePath, Buffer.from(lootedBuffer));
            fs.writeFileSync(depositedFilePath, Buffer.from(depositedBuffer));

            const parseCSV = (filePath, delimiter = ',') => {
                return new Promise((resolve, reject) => {
                    const results = [];
                    fs.createReadStream(filePath)
                        .pipe(csv({ separator: delimiter }))
                        .on('data', (data) => results.push(data))
                        .on('end', () => resolve(results))
                        .on('error', (error) => reject(error));
                });
            };

            let lootedData = await parseCSV(lootedFilePath, '\t');
            let depositedData = await parseCSV(depositedFilePath, '\t');

            const lootedEntries = lootedData.map(item => ({
                item: item['Item'],
                amount: item['Amount'],
                player: item['Player'],
                enchantment: item['Enchantment'],
                quality: item['Quality'],
            }));

            const depositedItems = new Set(depositedData.map(item => item['Item']));

            const missingEntries = lootedEntries.filter(entry => !entry.item.includes("Trash") && !depositedItems.has(entry.item));

            if (missingEntries.length === 0) {
                return await interaction.editReply('No missing items found between the chests.');
            }

            const missingList = missingEntries
                .map(entry => `${entry.player} | ${entry.item}.${entry.enchantment} ${entry.amount > 1 ? ` x ${entry.amount}` : ''} | ${entry.quality}`)
                .join('\n');

            await interaction.editReply(`**Missing Items:**\n${missingList.slice(0, 2000)}`);
        } catch (error) {
            console.error("Error processing chest logs:", error);
            await interaction.editReply('An error occurred while processing the files.');
        }
    },
};
