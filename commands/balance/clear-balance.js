import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import consts from "../../consts.js";

export default {
    data: new SlashCommandBuilder()
        .setName('balance-clear')
        .setDescription('Clears the balance of a user.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('user to add balance to')
            .setRequired(true)),

    async execute(interaction) {
        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission to clear balance.', ephemeral: true });
        }

        const user = interaction.options.getUser('user');

        let balance = 0;

        try {
            const balanceRes = await sql`
                SELECT balance::numeric FROM balances
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            if (balanceRes.length === 0) {
                console.log(`creating new user for ${user.id}`);
                await sql`
                    INSERT INTO balances (server_id, discord_id, balance)
                    VALUES (${interaction.guildId}, ${user.id}, 0)
                `;
            } else {
                balance = Number(balanceRes[0].balance);
            }

            await sql`
                UPDATE balances
                SET balance = 0
                WHERE server_id = ${interaction.guildId} AND discord_id = ${user.id}
            `;

            await interaction.reply(`<@${interaction.user.id}> cleared ${balance.toLocaleString()} ${consts.CoinEmoji} from <@${user.id}>. New balance is 0 ${consts.CoinEmoji}`);
        } catch (error) {
            console.log(error.message);
            await interaction.reply({ content: 'An error occurred while trying to clear balance.', ephemeral: true });
        }
    },
};