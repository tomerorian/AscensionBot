import sql from './db.js';

const roles = {
    Admin: 'Admin',
    PartyManage: 'PartyManage',
    BalanceManage: 'BalanceManage',

    async getRoleName(serverId, roleKey) {
        const roleConfig = await sql`
            SELECT role_name FROM roles_config
            WHERE role_key = ${roleKey} AND server_id = ${serverId}
        `;
        return roleConfig.length > 0 ? roleConfig[0].role_name : null;
    },

    async hasRole(member, roleKeys) {
        const serverId = member.guild.id;
        const roleNames = await Promise.all(
            roleKeys.map(roleKey => this.getRoleName(serverId, roleKey))
        );
        return member.roles.cache.some(r => roleNames.includes(r.name));
    }
};

export default roles;
