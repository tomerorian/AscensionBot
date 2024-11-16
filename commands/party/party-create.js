import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';
import roles from "../../roles.js";
import imageToTextClient from "../../image-to-text-client.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-create')
        .setDescription('Creates a new party.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The unique name of the party')
                .setRequired(true))
        .addAttachmentOption(option => option
            .setName('image')
            .setDescription('Image of the party')
            .setRequired(false)),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const partyImage = interaction.options.getAttachment('image');
        const serverId = interaction.guildId;
        const creatorId = interaction.user.id;

        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({
                content: 'You do not have permission to create a party.',
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

            let detectedNames = [];
            if (partyImage) {
                try {
                    const [result] = await imageToTextClient.textDetection(partyImage.url);
                    const detections = result.textAnnotations;

                    if (detections.length > 1) {
                        detectedNames = detections.slice(1).map(x => x.description.trim());
                    }
                } catch (error) {
                    return await interaction.editReply({
                        content: 'Error occurred while processing the image for text detection.'
                    });
                }
            }

            const aliasMappings = detectedNames.length > 0
                ? await sql`
                    SELECT alias, discord_id
                    FROM aliases
                    WHERE server_id = ${serverId} 
                      AND alias ILIKE ANY(${sql.array(detectedNames)})
                  `
                : [];

            const aliasToIdMap = new Map(aliasMappings.map(row => [row.alias, row.discord_id]));
            const foundMembers = [...aliasToIdMap.values()];
            const notFoundNames = detectedNames.filter(name => !aliasToIdMap.has(name));

            const party = await sql`
                INSERT INTO parties (server_id, name, created_by)
                VALUES (${serverId}, ${partyName}, ${creatorId})
                RETURNING id
            `;

            if (foundMembers.length > 0) {
                await sql`
                    INSERT INTO party_members (party_id, discord_id)
                    SELECT ${party[0].id}, unnest(${sql.array(foundMembers)})
                `;
            }

            let replyMessage = `Party "${partyName}" has been successfully created.`;
            if (foundMembers.length > 0) {
                replyMessage += `\n\nMembers added:\n${foundMembers.map(id => `<@${id}>`).join('\n')}`;
            }
            if (notFoundNames.length > 0) {
                replyMessage += `\n\nNames not found:\n${notFoundNames.join('\n')}`;
            }

            await interaction.editReply({ content: replyMessage });
        } catch (error) {
            console.error(error.message);
            await interaction.editReply({
                content: 'An error occurred while trying to create the party.'
            });
        }
    },
};
