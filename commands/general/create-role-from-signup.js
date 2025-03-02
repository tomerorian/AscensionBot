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
            const gid = extractGid(sheetLink);

            if (!sheetId) return await interaction.editReply('Invalid Google Sheets link.');

            const sheetName = gid ? await getSheetNameByGid(sheetId, gid) : 'Sheet1';
            if (!sheetName) return await interaction.editReply('Could not determine the correct sheet.');

            const { approvedNames, nonApprovedNames } = await fetchNamesFromSheet(sheetId, sheetName);
            if (!approvedNames.length) return await interaction.editReply('No valid approved names found in the sheet.');

            const guild = interaction.guild;
            const members = await guild.members.fetch();
            const matchingMembers = members.filter(member =>
                approvedNames.some(name => member.displayName.toLowerCase() === name.toLowerCase())
            );

            const notFoundMembers = approvedNames.filter(name =>
                !matchingMembers.some(member => member.displayName.toLowerCase() === name.toLowerCase())
            );

            let role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                role = await guild.roles.create({ name: roleName, mentionable: true });
            }

            for (const member of matchingMembers.values()) {
                await member.roles.add(role);
            }

            let responseMessage = `**Role Created: ${role}**\n\n`;
            responseMessage += `✅ **Added to role (${matchingMembers.size}):**\n${matchingMembers.map(m => m.toString()).join(', ') || 'None'}\n\n`;
            responseMessage += `❌ **Not found in Discord (${notFoundMembers.length}):**\n${notFoundMembers.join(', ') || 'None'}\n\n`;
            responseMessage += `🚫 **Non-approved names (${nonApprovedNames.length}):**\n${nonApprovedNames.join(', ') || 'None'}`;

            await interaction.editReply(responseMessage);
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

// Extracts the GID (sheet/tab ID) from a Google Sheets link
const extractGid = (url) => {
    const match = url.match(/gid=(\d+)/);
    return match ? match[1] : null;
};

// Fetches the correct sheet name using the GID
const getSheetNameByGid = async (spreadsheetId, gid) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'service-account-file.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets.find(sheet => sheet.properties.sheetId.toString() === gid);

    return sheet ? sheet.properties.title : null; // Return sheet name
};

// Fetches approved and non-approved names from the correct sheet tab
const fetchNamesFromSheet = async (sheetId, sheetName) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'service-account-file.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const range = `${sheetName}!M3:N`; // M = V column, N = Name

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range
    });

    const rows = response.data.values || [];

    // Ignore empty names or names that are just whitespace
    const isValidName = (name) => name && name.trim().length > 0;

    const approvedNames = rows
        .filter(row => row[0] === '✅' && isValidName(row[1]))
        .map(row => row[1]);

    const nonApprovedNames = rows
        .filter(row => row[0] !== '✅' && isValidName(row[1]))
        .map(row => row[1]);

    return { approvedNames, nonApprovedNames };
};
