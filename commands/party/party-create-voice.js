import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-create-vc')
        .setDescription('Creates a new party from the members in your current voice channel.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The unique name of the party')
                .setRequired(true)),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const serverId = interaction.guildId;
        const creatorId = interaction.user.id;

        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({
                content: 'You do not have permission to create a party.',
                ephemeral: true
            });
        }

        const channelId = interaction.member.voice.channelId;
        const voiceChannel = await interaction.guild.channels.fetch(channelId);

        if (!voiceChannel) {
            return await interaction.reply({
                content: 'You must be in a voice channel to run this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const existingParty = await sql`
                SELECT 1 FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (existingParty.length > 0) {
                return await interaction.editReply({
                    content: `A party with the name "${partyName}" already exists in this server.`
                });
            }

            const vcMembers = voiceChannel.members;
            const memberIds = vcMembers.map(member => member.user.id);
            memberIds.push(creatorId); // Ensure the creator is included in the party.

            const party = await sql`
                INSERT INTO parties (server_id, name, created_by)
                VALUES (${serverId}, ${partyName}, ${creatorId})
                RETURNING id
            `;

            await sql`
                INSERT INTO party_members (party_id, discord_id)
                SELECT ${party[0].id}, unnest(${sql.array(memberIds)})
            `;

            const replyMessage = `Party "${partyName}" has been successfully created.\n\nMembers added:\n${memberIds.map(id => `<@${id}>`).join('\n')}`;

            await interaction.editReply({ content: replyMessage });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while trying to create the party.'
            });
        }
    },
};
