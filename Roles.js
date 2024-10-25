export default {
    Admin: 'AscensionBotAdmin',
    
    hasRole(member, roles) {
        return member.roles.cache.some(r => r.name in roles);
    }
}