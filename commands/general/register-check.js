﻿import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('check-unregistered-with-balance')
        .setDescription('Lists all users in the server who have a balance but have not registered an in-game name.'),

    async execute(interaction) {
        if (!await roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to run this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const serverId = interaction.guildId;

            const unregisteredWithBalance = await sql`
                SELECT b.discord_id, b.balance
                FROM balances b
                LEFT JOIN aliases a
                ON b.server_id = a.server_id AND b.discord_id = a.discord_id
                WHERE b.server_id = ${serverId} AND a.discord_id IS NULL
            `;

            if (unregisteredWithBalance.length === 0) {
                return await interaction.editReply('No users in the server have a balance but are not registered.');
            }

            const unregisteredList = unregisteredWithBalance
                .map(user => `<@${user.discord_id}>: ${Number(user.balance).toLocaleString()} ${consts.CoinEmoji}`)
                .join('\n');

            await interaction.editReply({
                content: `The following users have a balance but have not registered an in-game name:\n${unregisteredList}`
            });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while checking unregistered users with a balance.'
            });
        }
    },
};
