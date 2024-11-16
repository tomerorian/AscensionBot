import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Registers a Discord user with an in-game name.')
        .addStringOption(option => option
            .setName('albion-name')
            .setDescription('In-game name')
            .setRequired(true))
        .addUserOption(option => option
            .setName('discord-user')
            .setDescription('Discord user to register (admin only)')),

    async execute(interaction) {
        const name = interaction.options.getString('albion-name');
        const discordUser = interaction.options.getUser('discord-user');
        const isAdmin = roles.hasRole(interaction.member, [roles.Admin]);

        const targetUser = discordUser || interaction.user;

        try {
            if (!isAdmin && discordUser) {
                return await interaction.reply({ content: 'You do not have permission to register another user.', ephemeral: true });
            }

            const aliasExists = await sql`
                SELECT discord_id FROM aliases
                WHERE server_id = ${interaction.guildId} AND alias = ${name}
                LIMIT 1
            `;

            if (aliasExists.length > 0) {
                const linkedUserId = linkedUser[0]?.discord_id;
                
                return await interaction.reply({ content: `The alias "${name}" is already in use on this server by <@${linkedUserId}>.`, ephemeral: true });
            }

            const existingRecord = await sql`
                SELECT alias FROM aliases
                WHERE server_id = ${interaction.guildId} AND discord_id = ${targetUser.id}
            `;

            if (existingRecord.length > 0) {
                if (isAdmin && discordUser) {
                    await sql`
                        INSERT INTO aliases (server_id, discord_id, alias)
                        VALUES (${interaction.guildId}, ${targetUser.id}, ${name})
                    `;
                } else {
                    await sql`
                        UPDATE aliases
                        SET alias = ${name}
                        WHERE server_id = ${interaction.guildId} AND discord_id = ${targetUser.id}
                    `;
                }
            } else {
                await sql`
                    INSERT INTO aliases (server_id, discord_id, alias)
                    VALUES (${interaction.guildId}, ${targetUser.id}, ${name})
                `;
            }

            const responseMessage = isAdmin && discordUser ? 
                `<@${interaction.user.id}> added a new alias "${name}" for <@${targetUser.id}>.` : 
                `<@${interaction.user.id}> registered with in-game name "${name}".`;

            await interaction.reply(responseMessage);
        } catch (error) {
            console.error(error.message);
            await interaction.reply({ content: 'An error occurred while trying to register.', ephemeral: true });
        }
    },
};
