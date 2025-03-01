import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('compare-chests')
        .setDescription('Compares two chest inventories and lists missing, excessive, and extra items.')
        .addAttachmentOption(option =>
            option
                .setName('withdrawn')
                .setDescription('CSV file of withdrawn items (negative amounts)')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName('deposited')
                .setDescription('CSV file of deposited items')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const withdrawnAttachment = interaction.options.getAttachment('withdrawn');
            const depositedAttachment = interaction.options.getAttachment('deposited');

            if (!withdrawnAttachment || !depositedAttachment) {
                return await interaction.editReply('Both chest inventory files must be provided.');
            }

            const withdrawnFilePath = path.join('/tmp', 'withdrawn.csv');
            const depositedFilePath = path.join('/tmp', 'deposited.csv');

            const withdrawnFile = await fetch(withdrawnAttachment.url);
            const depositedFile = await fetch(depositedAttachment.url);

            const withdrawnBuffer = await withdrawnFile.arrayBuffer();
            const depositedBuffer = await depositedFile.arrayBuffer();

            fs.writeFileSync(withdrawnFilePath, Buffer.from(withdrawnBuffer));
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

            let withdrawnData = await parseCSV(withdrawnFilePath, '\t');
            let depositedData = await parseCSV(depositedFilePath, '\t');

            // Normalize data to ensure fields are consistent
            const normalizeEntry = (entry) => ({
                player: (entry['Player'] || ''),
                item: (entry['Item'] || ''),
                amount: parseInt(entry['Amount'], 10) || 0,
                enchantment: (entry['Enchantment'] || ''),
                quality: qualityMap[entry['Quality']] || 'None'
            });

            const createKey = (entry) => `${entry.player}-${entry.item}-${entry.enchantment}-${entry.quality}`;

            // Convert data into a normalized list
            const withdrawnEntries = withdrawnData.map(normalizeEntry);
            const depositedEntries = depositedData.map(normalizeEntry);

            // Aggregate withdrawn amounts by key (negative amounts)
            const withdrawnMap = new Map();
            withdrawnEntries.forEach(entry => {
                const key = createKey(entry);
                withdrawnMap.set(key, (withdrawnMap.get(key) || 0) + Math.abs(entry.amount)); // Convert to positive
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

            for (const [key, withdrawnAmount] of withdrawnMap.entries()) {
                const depositedAmount = depositedMap.get(key) || 0;
                if (withdrawnAmount > depositedAmount) {
                    missingItems.push(formatItemOutput(key, withdrawnAmount - depositedAmount));
                } else if (depositedAmount > withdrawnAmount) {
                    excessiveItems.push(formatItemOutput(key, depositedAmount - withdrawnAmount));
                }
                depositedMap.delete(key);
            }

            for (const [key, depositedAmount] of depositedMap.entries()) {
                extraItems.push(formatItemOutput(key, depositedAmount));
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

const qualityMap = {
    '0': 'None',
    '1': 'Normal',
    '2': 'Good',
    '3': 'Outstanding',
    '4': 'Excellent',
    '5': 'Masterpiece'
};

const formatItemOutput = (key, amount) => {
    const [player, item, enchantment, quality] = key.split('-');
    return `${player} | ${item}.${enchantment} (${quality}) x ${amount}`;
};
