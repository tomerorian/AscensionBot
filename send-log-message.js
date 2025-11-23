import consts from "./consts.js";

async function sendLogMessage(interaction, message, channelId) {
    const targetChannelId = channelId || consts.LogChannelId;
    const logChannel = interaction.guild.channels.cache.get(targetChannelId);
    if (logChannel) {
        await logChannel.send(message);
    } else {
        console.error('Log channel not found.');
    }
}

export default sendLogMessage;