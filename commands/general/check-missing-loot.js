import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

export default {
    data: new SlashCommandBuilder()
        .setName('check-missing-loot')
        .setDescription('Checks for missing looted items that were not deposited, showing who looted them.')
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

            lootedData = lootedData.map(item => ({
                player: item['player_name'],
                item: item['item_name'],
                amount: parseInt(item['quantity'], 10) || 0
            }));

            depositedData = depositedData.map(item => ({
                item: item['Item'],
                amount: parseInt(item['Amount'], 10) || 0
            }));

            // Track who looted what
            const lootedSummary = {};
            for (const { player, item, amount } of lootedData) {
                if (!lootedSummary[item]) lootedSummary[item] = {};
                lootedSummary[item][player] = (lootedSummary[item][player] || 0) + amount;
            }

            const depositedSummary = depositedData.reduce((acc, { item, amount }) => {
                acc[item] = (acc[item] || 0) + amount;
                return acc;
            }, {});

            const missingItems = Object.keys(lootedSummary)
                .filter(item => {
                    const lootedTotal = Object.values(lootedSummary[item]).reduce((sum, qty) => sum + qty, 0);
                    return lootedTotal > (depositedSummary[item] || 0);
                })
                .map(item => {
                    const missingByPlayer = Object.entries(lootedSummary[item])
                        .map(([player, amount]) => `- ${player}: ${amount}`)
                        .join('\n');
                    return `**${item}**:\n${missingByPlayer}`;
                });

            if (missingItems.length === 0) {
                return await interaction.editReply('No missing looted items found.');
            }

            await interaction.editReply(`**Missing Looted Items:**\n${missingItems.join('\n').slice(0, 2000)}`);
        } catch (error) {
            console.error("Error processing loot logs:", error);
            await interaction.editReply('An error occurred while processing the files.');
        }
    },
};
