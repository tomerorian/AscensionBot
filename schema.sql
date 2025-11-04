-- PostgreSQL Database Schema for AscensionBot
-- This schema was recreated by analyzing database queries in the codebase

-- Table: balances
-- Stores user balances per server
CREATE TABLE IF NOT EXISTS balances (
    server_id VARCHAR(20) NOT NULL,
    discord_id VARCHAR(20) NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY (server_id, discord_id)
);

-- Table: balance_log
-- Logs all balance changes for audit purposes
CREATE TABLE IF NOT EXISTS balance_log (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(20) NOT NULL,
    source_user_id VARCHAR(20), -- NULL for system operations
    target_user_id VARCHAR(20) NOT NULL,
    amount NUMERIC NOT NULL,
    reason VARCHAR(50) NOT NULL, -- e.g., 'manual', 'party-close'
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: parties
-- Stores party information
CREATE TABLE IF NOT EXISTS parties (
    id SERIAL PRIMARY KEY,
    server_id VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by VARCHAR(20) NOT NULL,
    UNIQUE (server_id, name)
);

-- Table: party_members
-- Stores party membership and balances
CREATE TABLE IF NOT EXISTS party_members (
    party_id INTEGER NOT NULL,
    discord_id VARCHAR(20) NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (party_id, discord_id),
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);

-- Table: aliases
-- Maps in-game names (aliases) to Discord IDs
CREATE TABLE IF NOT EXISTS aliases (
    server_id VARCHAR(20) NOT NULL,
    discord_id VARCHAR(20) NOT NULL,
    alias VARCHAR(255) NOT NULL,
    PRIMARY KEY (server_id, discord_id, alias),
    UNIQUE (server_id, alias) -- Ensure alias is unique per server
);

-- Table: player_cache
-- Caches player information like last used party name
CREATE TABLE IF NOT EXISTS player_cache (
    discord_id VARCHAR(20) PRIMARY KEY,
    party_name VARCHAR(255)
);

-- Table: roles_config
-- Maps role keys to Discord role names per server
CREATE TABLE IF NOT EXISTS roles_config (
    server_id VARCHAR(20) NOT NULL,
    role_key VARCHAR(50) NOT NULL, -- e.g., 'Admin', 'PartyManage', 'BalanceManage'
    role_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (server_id, role_key, role_name)
);

-- Indexes for performance optimization

-- Balance queries often filter by server_id and discord_id
CREATE INDEX IF NOT EXISTS idx_balances_server_discord ON balances(server_id, discord_id);
CREATE INDEX IF NOT EXISTS idx_balances_server_balance ON balances(server_id, balance);

-- Balance log queries often filter by server_id, target_user_id, and created_at
CREATE INDEX IF NOT EXISTS idx_balance_log_server_target ON balance_log(server_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_balance_log_server_source ON balance_log(server_id, source_user_id);
CREATE INDEX IF NOT EXISTS idx_balance_log_created_at ON balance_log(created_at DESC);

-- Party queries often filter by server_id and name
CREATE INDEX IF NOT EXISTS idx_parties_server_name ON parties(server_id, name);
CREATE INDEX IF NOT EXISTS idx_parties_created_by ON parties(created_by);

-- Party members queries often filter by party_id and is_active
CREATE INDEX IF NOT EXISTS idx_party_members_party_active ON party_members(party_id, is_active);
CREATE INDEX IF NOT EXISTS idx_party_members_discord ON party_members(discord_id);

-- Alias queries often filter by server_id and alias (case-insensitive searches)
CREATE INDEX IF NOT EXISTS idx_aliases_server_alias ON aliases(server_id, alias);
CREATE INDEX IF NOT EXISTS idx_aliases_server_discord ON aliases(server_id, discord_id);

-- Roles config queries filter by server_id and role_key
CREATE INDEX IF NOT EXISTS idx_roles_config_server_key ON roles_config(server_id, role_key);

