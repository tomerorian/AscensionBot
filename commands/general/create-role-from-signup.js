import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { google } from 'googleapis';

export default {
    data: new SlashCommandBuilder()
        .setName('create-role-from-signup')
        .setDescription('Creates a role and adds members from a signup sheet')
        .addStringOption(option =>
            option.setName('role_name')
                .setDescription('The name of the role to create')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sheet_link')
                .setDescription('The Google Sheets link containing the member list')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const roleName = interaction.options.getString('role_name');
            const sheetLink = interaction.options.getString('sheet_link');

            const sheetId = extractSheetId(sheetLink);
            if (!sheetId) return await interaction.editReply('Invalid Google Sheets link.');

            const namesList = await fetchNamesFromSheet(sheetId);
            if (!namesList.length) return await interaction.editReply('No valid names found in the sheet.');

            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const matchingMembers = members.filter(member =>
                namesList.some(name => member.displayName.toLowerCase() === name.toLowerCase())
            );

            if (!matchingMembers.size) return await interaction.editReply('No matching Discord members found.');

            let role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                role = await guild.roles.create({ name: roleName, mentionable: true });
            }

            for (const member of matchingMembers.values()) {
                await member.roles.add(role);
            }

            await interaction.editReply(`Role **${roleName}** created and assigned to ${matchingMembers.size} members.`);
        } catch (error) {
            console.error('Error creating role:', error);
            await interaction.editReply('An error occurred while creating the role.');
        }
    },
};

// Extracts sheet ID from a Google Sheets link
const extractSheetId = (url) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : null;
};

// Fetches names from the Google Sheet (only those with a "V" mark)
const fetchNamesFromSheet = async (sheetId) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'service-account-file.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const range = 'N2:O'; // Column N (names) and Column O (checks)

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range
    });

    const rows = response.data.values || [];
    return rows.filter(row => row[1] === 'V').map(row => row[0]); // Only names with "V" in the next column
};
