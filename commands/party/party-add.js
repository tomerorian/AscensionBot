import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: (() => {
        const command = new SlashCommandBuilder()
            .setName('party-add')
            .setDescription('Adds members to an existing party.')
            .addStringOption(option =>
                option
                    .setName('party')
                    .setDescription('The name of the party')
                    .setRequired(false)
            );
        for (let i = 1; i <= 10; i++) {
            command.addUserOption(option =>
                option
                    .setName(`member${i}`)
                    .setDescription(`Member ${i} to add to the party`)
                    .setRequired(i === 1) // Only the first member is required
            );
        }
        return command;
    })(),

    async execute(interaction) {
        let partyName = interaction.options.getString('party');
        const serverId = interaction.guildId;
        const requesterId = interaction.user.id;

        const members = [];
        for (let i = 1; i <= 25; i++) {
            const member = interaction.options.getUser(`member${i}`);
            if (member) {
                members.push(member);
            }
        }

        if (members.length === 0) {
            return await interaction.reply({
                content: 'You must specify at least one member to add.',
                ephemeral: true
            });
        }

        try {
            const isAdmin = await roles.hasRole(interaction.member, [roles.Admin]);

            if (!isAdmin && !await roles.hasRole(interaction.member, [roles.PartyManage])) {
                return await interaction.reply({
                    content: 'You do not have permission to add members to a party.',
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

            const alreadyAdded = [];
            const newlyAdded = [];

            for (const member of members) {
                const memberExists = await sql`
                    SELECT is_active FROM party_members
                    WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
                `;

                if (memberExists.length > 0) {
                    if (memberExists[0].is_active) {
                        alreadyAdded.push(member);
                    } else {
                        await sql`
                            UPDATE party_members
                            SET is_active = TRUE
                            WHERE party_id = ${party[0].id} AND discord_id = ${member.id}
                        `;
                        newlyAdded.push(member);
                    }
                } else {
                    await sql`
                        INSERT INTO party_members (party_id, discord_id, is_active)
                        VALUES (${party[0].id}, ${member.id}, TRUE)
                    `;
                    newlyAdded.push(member);
                }
            }

            let replyMessage = `The following members were added to the party "${partyName}":\n`;
            replyMessage += newlyAdded.map(member => `<@${member.id}>`).join('\n') || 'None';
            if (alreadyAdded.length > 0) {
                replyMessage += `\n\nThe following members were already active in the party:\n`;
                replyMessage += alreadyAdded.map(member => `<@${member.id}>`).join('\n');
            }

            await interaction.reply({
                content: replyMessage,
                ephemeral: true
            });
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to add the members to the party.',
                ephemeral: true
            });
        }
    },
};