﻿import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('check-missing-loot')
        .setDescription('Lists all looted items that were not deposited')
        .addAttachmentOption(option =>
            option
                .setName('looted')
                .setDescription('CSV file of looted items')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName('deposited')
                .setDescription('TXT file of deposited items')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const lootedAttachment = interaction.options.getAttachment('looted');
            const depositedAttachment = interaction.options.getAttachment('deposited');

            if (!lootedAttachment || !depositedAttachment) {
                return await interaction.editReply('Both looted and deposited files must be provided.');
            }

            const lootedFilePath = path.join('/tmp', 'looted.csv');
            const depositedFilePath = path.join('/tmp', 'deposited.txt');

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

            let lootedData = await parseCSV(lootedFilePath, ';');
            let depositedData = await parseCSV(depositedFilePath, '\t');

            // Ensure we maintain all original fields from looted
            const lootedEntries = lootedData.map(item => ({
                player: item['looted_by__name'],
                item: item['item_name'],
                itemId: item['item_id'],
                quantity: item['quantity'],
                fromName: item['looted_from__name'],
                fromGuild: item['looted_from__guild'],
            }));

            const depositedItems = new Set(depositedData.map(item => item['Item']));

            // Filter only entries that are missing from the deposited list
            const missingEntries = lootedEntries.filter(entry => !entry.item.includes("Trash") && !depositedItems.has(entry.item));

            if (missingEntries.length === 0) {
                return await interaction.editReply('No missing looted items found.');
            }

            const missingList = missingEntries
                .map(entry => `${entry.player} | ${entry.item} | ${entry.itemId} ${entry.quantity > 1 ? ` x ${entry.quantity}` : ''} | [${entry.fromGuild}] ${entry.fromName}`)
                .join('\n');

            await interaction.editReply(missingList.slice(0, 2000));
        } catch (error) {
            console.error("Error processing loot logs:", error);
            await interaction.editReply('An error occurred while processing the files.');
        }
    },
};
