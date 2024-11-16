import { SlashCommandBuilder } from 'discord.js';
import sql from '../../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName('party-create')
        .setDescription('Creates a new party.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The unique name of the party')
                .setRequired(true)
        ),

    async execute(interaction) {
        const partyName = interaction.options.getString('name');
        const serverId = interaction.guildId;
        const creatorId = interaction.user.id;

        try {
            const existingParty = await sql`
                SELECT 1 FROM parties
                WHERE server_id = ${serverId} AND name = ${partyName}
            `;

            if (existingParty.length > 0) {
                return await interaction.reply({
                    content: `A party with the name "${partyName}" already exists in this server.`,
                    ephemeral: true
                });
            }

            await sql`
                INSERT INTO parties (server_id, name, created_by)
                VALUES (${serverId}, ${partyName}, ${creatorId})
            `;

            await interaction.reply(`Party "${partyName}" has been successfully created by <@${creatorId}>.`);
        } catch (error) {
            console.error(error.message);
            await interaction.reply({
                content: 'An error occurred while trying to create the party.',
                ephemeral: true
            });
        }
    },
};

import { SlashCommandBuilder } from 'discord.js';
// import roles from "../../roles.js";
// import imageToTextClient from "../../image-to-text-client.js";
//
// export default {
//     data: new SlashCommandBuilder()
//         .setName('party-create')
//         .setDescription('Creates a party.')
//         .addStringOption(option => option
//             .setName('name')
//             .setDescription('Name of the party')
//             .setRequired(true))
//         .addAttachmentOption(option => option
//             .setName('image')
//             .setDescription('Image of the party')
//             .setRequired(true)),
//
//     async execute(interaction) {
//         if (!roles.hasRole(interaction.member, [roles.Admin])) {
//             return await interaction.reply({ content: 'You do not have permission create a party.', ephemeral: true });
//         }
//
//         const partyImage = interaction.options.getAttachment('image');
//        
//         await interaction.deferReply({ ephemeral: true });
//        
//         let reply = '';
//        
//         try {
//             const [result] = await imageToTextClient.textDetection(partyImage.url);
//             const detections = result.textAnnotations;
//            
//             if (detections.length > 1) {
//                 const memberNames = detections.slice(1).map(x => x.description);
//                 reply = `${memberNames.length} members detected: \n${memberNames.join('\n')}`;
//             }
//            
//         } catch (error) {
//             reply = 'Error during text detection';
//         }
//
//         await interaction.editReply({ content: reply, ephemeral: true });
//     },
// };
