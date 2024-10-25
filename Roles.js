export default {
    Admin: 'AscensionBotAdmin',
    
    hasRole(member, roles) {
        return member.roles.cache.some(r => roles.includes(r.name));
    }
}