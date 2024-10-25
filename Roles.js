export default {
    Admin: 'AscensionBotAdmin',
    
    hasRole(member, role) {
        return member.roles.cache.some(r => r.name === role);
    }
}