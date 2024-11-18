import sql from './db.js';

const roles = {
    Admin: 'Admin',
    PartyManage: 'PartyManage',
    BalanceManage: 'BalanceManage',

    async getRoleNames(serverId, roleKey) {
        const roleConfigs = await sql`
            SELECT role_name FROM roles_config
            WHERE role_key = ${roleKey} AND server_id = ${serverId}
        `;
        
        return roleConfigs.map(config => config.role_name);
    },

    async hasRole(member, roleKeys) {
        const serverId = member.guild.id;
        const roleNamesSet = new Set();

        for (const roleKey of roleKeys) {
            const roleNames = await this.getRoleNames(serverId, roleKey);
            roleNames.forEach(name => roleNamesSet.add(name));
        }

        return member.roles.cache.some(r => roleNamesSet.has(r.name));
    }
};

export default roles;
