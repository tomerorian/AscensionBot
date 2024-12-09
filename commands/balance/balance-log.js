import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-log')
        .setDescription('Displays balance logs with optional filters.')
        .addUserOption(option =>
            option
                .setName('source')
                .setDescription('Filter logs by source user')
                .setRequired(false)
        )
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('Filter logs by target user')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('count')
                .setDescription('Number of logs to display (default: 10, max: 10)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('start')
                .setDescription('How many logs to skip (default: 0)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const source = interaction.options.getUser('source');
        const target = interaction.options.getUser('target');
        const count = Math.min(interaction.options.getInteger('count') || 10, 10);
        const start = interaction.options.getInteger('start') || 0;

        try {
            const logs = await sql`
                SELECT server_id, source_user_id, target_user_id, amount, reason, comment, created_at
                FROM balance_log
                WHERE server_id = ${interaction.guildId}
                ${source ? sql`AND source_user_id = ${source.id}` : sql``}
                ${target ? sql`AND target_user_id = ${target.id}` : sql``}
                ORDER BY created_at DESC
                LIMIT ${count} OFFSET ${start}
            `;

            if (logs.length === 0) {
                return await interaction.reply({
                    content: 'No balance logs found with the specified filters.',
                    ephemeral: true
                });
            }

            const logMessages = logs.map(log =>
                `[${log.created_at.toISOString()}] ` +
                `Source: ${log.source_user_id ? `<@${log.source_user_id}>` : 'System'}, ` +
                `Target: <@${log.target_user_id}>, ` +
                `Amount: ${Number(log.amount).toLocaleString()} ${consts.CoinEmoji}, ` +
                `Reason: ${log.reason}, ` +
                `Comment: ${log.comment || 'None'}`
            ).join('\n');

            await interaction.reply({
                content: `**Balance Logs:**\n${logMessages}`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while retrieving balance logs.',
                ephemeral: true
            });
        }
    },
};
