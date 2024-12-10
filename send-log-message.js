import consts from "./consts.js";

async function sendLogMessage(interaction, message) {
    const logChannel = interaction.guild.channels.cache.get(consts.LogChannelId);
    if (logChannel) {
        await logChannel.send(message);
    } else {
        console.error('Log channel not found.');
    }
}

export default sendLogMessage;