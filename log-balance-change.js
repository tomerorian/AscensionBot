import sql from './db.js';

async function logBalanceChange({
                                    serverId,
                                    sourceUserId = null,
                                    targetUserId,
                                    amount,
                                    reason,
                                    comment = null
                                }) {
    try {
        await sql`
            INSERT INTO balance_log (
                server_id,
                source_user_id,
                target_user_id,
                amount,
                reason,
                comment
            ) VALUES (
                ${serverId},
                ${sourceUserId},
                ${targetUserId},
                ${amount},
                ${reason},
                ${comment}
            )
        `;
        console.log('Balance change logged successfully.');
    } catch (error) {
        console.error('Failed to log balance change:', error.message);
    }
}

export default logBalanceChange;
