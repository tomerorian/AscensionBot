import { SlashCommandBuilder } from 'discord.js';
import supabase from '../../supabase-client.js'
import roles from "../../roles.js";
import imageToTextClient from "../../image-to-text-client.js";

export default {
    data: new SlashCommandBuilder()
        .setName('party-create')
        .setDescription('Creates a party.')
        .addStringOption(option => option
            .setName('name')
            .setDescription('Name of the party')
            .setRequired(true))
        .addAttachmentOption(option => option
            .setName('image')
            .setDescription('Image of the party')
            .setRequired(true)),

    async execute(interaction) {
        if (!roles.hasRole(interaction.member, [roles.Admin])) {
            return await interaction.reply({ content: 'You do not have permission create a party.', ephemeral: true });
        }

        const partyImage = interaction.options.getAttachment('image');
        
        await interaction.deferReply({ ephemeral: true });
        
        let reply = '';
        
        try {
            const [result] = await imageToTextClient.textDetection(partyImage.url);
            const detections = result.textAnnotations;
            
            if (detections.length > 1) {
                const memberNames = detections.slice(1).map(x => x.description);
                reply = `${memberNames.length} members detected: \n${memberNames.join('\n')}`;
            }
            
        } catch (error) {
            reply = 'Error during text detection';
        }

        await interaction.editReply({ content: reply, ephemeral: true });
    },
};