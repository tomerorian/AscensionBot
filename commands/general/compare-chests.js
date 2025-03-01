import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('compare-chests')
        .setDescription('Compares two chest inventories and lists missing, excessive, and unexpected items.')
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

            // Normalize data to ensure fields are consistent
            const normalizeEntry = (entry) => ({
                player: entry['Player'] || '',
                item: entry['Item'] || '',
                amount: parseInt(entry['Amount'], 10) || 0,
                enchantment: entry['Enchantment'] || '',
                quality: entry['Quality'] || ''
            });

            const createKey = (entry) => `${entry.player}-${entry.item}-${entry.enchantment}-${entry.quality}`;

            // Convert data into a normalized list
            const lootedEntries = lootedData.map(normalizeEntry);
            const depositedEntries = depositedData.map(normalizeEntry);

            // Aggregate looted amounts by key
            const lootedMap = new Map();
            lootedEntries.forEach(entry => {
                const key = createKey(entry);
                lootedMap.set(key, (lootedMap.get(key) || 0) + entry.amount);
            });

            // Aggregate deposited amounts by key
            const depositedMap = new Map();
            depositedEntries.forEach(entry => {
                const key = createKey(entry);
                depositedMap.set(key, (depositedMap.get(key) || 0) + entry.amount);
            });

            const missingItems = [];
            const excessiveItems = [];
            const extraItems = [];

            for (const [key, lootedAmount] of lootedMap.entries()) {
                const depositedAmount = depositedMap.get(key) || 0;
                if (lootedAmount > depositedAmount) {
                    missingItems.push(`${key.replace(/-/g, ' | ')}: Missing ${lootedAmount - depositedAmount}`);
                } else if (depositedAmount > lootedAmount) {
                    excessiveItems.push(`${key.replace(/-/g, ' | ')}: Excessive ${depositedAmount - lootedAmount}`);
                }
                depositedMap.delete(key);
            }

            for (const [key, depositedAmount] of depositedMap.entries()) {
                extraItems.push(`${key.replace(/-/g, ' | ')}: Extra ${depositedAmount}`);
            }

            const formatList = (title, list) => list.length ? `**${title}**\n${list.join('\n')}` : '';

            const response = [
                formatList('Missing Items', missingItems),
                formatList('Excessive Items', excessiveItems),
                formatList('Extra Items', extraItems)
            ].filter(Boolean).join('\n\n');

            await interaction.editReply(response.slice(0, 2000) || 'No discrepancies found.');
        } catch (error) {
            console.error("Error processing chest logs:", error);
            await interaction.editReply('An error occurred while processing the files.');
        }
    },
};
