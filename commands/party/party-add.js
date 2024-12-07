﻿import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-add')
        .setDescription('Adds a member to an existing party.')
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('The Discord user to add to the party')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('party')
                .setDescription('The name of the party')
                .setRequired(false)
        ),

    async execute(interaction) {
        let partyName = interaction.options.getString('party');
        const member = interaction.options.getUser('member');
        const serverId = interaction.guildId;
        const requesterId = interaction.user.id;

        try {
            const isAdmin = await roles.hasRole(interaction.member, [roles.Admin]);
            
            if (!isAdmin && !await roles.hasRole(interaction.member, [roles.PartyManage])) {
                return await interaction.reply({
                    content: 'You do not have permission to add a member to a party.',
                    ephemeral: true
                });
            }

            if (!partyName) {
                const cachedParty = await sql`
                    SELECT party_name FROM player_cache
                    WHERE discord_id = ${requesterId}
                `;

                if (cachedParty.length === 0 || !cachedParty[0].party_name) {
                    return await interaction.reply({
                        content: 'You must specify a party name.',
                        ephemeral: true
                    });
                }

                partyName = cachedParty[0].party_name;
            }

            const party = await sql`
                SELECT id, created_by FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (party.length === 0) {
                return await interaction.reply({
                    content: `No party with the name "${partyName}" exists in this server.`,
                    ephemeral: true
                });
            }
            
            if (party[0].created_by !== requesterId && !isAdmin) {
                return await interaction.reply({
                    content: `You do not have permission to add members to the party "${partyName}".`,
                    ephemeral: true
                });
            }

            const memberExists = await sql`
                SELECT is_active FROM party_members
                WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
            `;

            if (memberExists.length > 0) {
                if (memberExists[0].is_active) {
                    return await interaction.reply({
                        content: `<@${member.id}> is already an active member of the party "${partyName}".`,
                        ephemeral: true
                    });
                }

                await sql`
                    UPDATE party_members
                    SET is_active = TRUE
                    WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
                `;
            } else {
                await sql`
                    INSERT INTO party_members (party_id, discord_id, is_active)
                    VALUES (${party[0].id}, ${member.id}, TRUE)
                `;
            }

            await interaction.reply({
                content: `<@${member.id}> has been successfully added to the party "${partyName}".`,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to add the member to the party.',
                ephemeral: true
            });
        }
    },
};