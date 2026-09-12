import loadDirectory, { FileObject } from '@/api/server/files/loadDirectory';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';
import createDirectory from '@/api/server/files/createDirectory';
import deleteFiles from '@/api/server/files/deleteFiles';
import http from '@/api/http';

export interface RolesAndTabStatus {
    hasLuckPerms: boolean;
    hasTab: boolean;
    hasVault: boolean;
    hasLpc: boolean;
    isConfigured: boolean;
}

export interface TabSettings {
    serverBrandingName: string;
    headerSubtitle: string;
    storeLink: string;
    discordLink: string;
    enablePingNumber: boolean;
}

export const DEFAULT_TAB_SETTINGS: TabSettings = {
    serverBrandingName: 'SmitCloud',
    headerSubtitle: '1.21.x & 26.x Java & Bedrock Crossplay',
    storeLink: 'store.smitronix.dev',
    discordLink: 'discord.gg/smitcloud',
    enablePingNumber: true,
};

export const checkRolesStatus = async (uuid: string): Promise<RolesAndTabStatus> => {
    let hasLuckPerms = false;
    let hasTab = false;
    let hasVault = false;
    let hasLpc = false;

    try {
        const files: FileObject[] = await loadDirectory(uuid, '/plugins');
        hasLuckPerms = files.some((f) => f.name.toLowerCase().includes('luckperms'));
        hasTab = files.some((f) => f.name.toLowerCase().includes('tab'));
        hasVault = files.some((f) => f.name.toLowerCase().includes('vault'));
        hasLpc = files.some((f) => f.name.toLowerCase().includes('lpc'));
    } catch {
        // no plugins dir
    }

    const isConfigured = hasLuckPerms && hasTab && hasVault && hasLpc;

    return {
        hasLuckPerms,
        hasTab,
        hasVault,
        hasLpc,
        isConfigured,
    };
};

export const installPluginJar = async (uuid: string, url: string, filename: string): Promise<void> => {
    try {
        await createDirectory(uuid, '/', 'plugins');
    } catch {
        // ignore
    }

    await http.post(`/api/client/servers/${uuid}/files/pull`, {
        url,
        directory: '/plugins',
        filename,
        use_header: true,
    });
};

export const sendServerCommand = async (uuid: string, command: string): Promise<void> => {
    await http.post(`/api/client/servers/${uuid}/command`, { command });
};

export const sendServerCommands = async (uuid: string, commands: string[]): Promise<void> => {
    try {
        await http.post(`/api/client/servers/${uuid}/command`, { commands });
    } catch {
        for (const command of commands) {
            try {
                await http.post(`/api/client/servers/${uuid}/command`, { command });
            } catch {
                // ignore
            }
        }
    }
};

export const generateTabConfig = (settings: TabSettings): string => {
    const brand = settings.serverBrandingName.toUpperCase();
    return `# ------------------------------------------------------------------
# TAB v6.1 Configuration — Powered by ${settings.serverBrandingName}
# ------------------------------------------------------------------
header-footer:
  enabled: true
  designs:
    default:
      header:
        - "&8&m--------------------------------------------------"
        - "&b&l${brand} NETWORK &8» &f${settings.headerSubtitle}"
        - "&7Welcome, &f%player% &8| &eTPS: &a%tps% &8| &bPing: &f%ping%ms"
        - "&8&m--------------------------------------------------"
      footer:
        - "&8&m--------------------------------------------------"
        - "&fPlayers: &a%online%&8/&2%maxplayers% &8| &fWorld: &e%world%"
        - "&d&lSTORE: &f${settings.storeLink} &8| &9&lDISCORD: &f${settings.discordLink}"
        - "&eOfficial Mojang Java & Bedrock (Xbox) Supported"
        - "&8&m--------------------------------------------------"

tablist-name-formatting:
  enabled: true
  disable-condition: '%world%=disabledworld'

scoreboard-teams:
  enabled: true
  enable-collision: true
  invisible-nametags: false
  sorting-types:
    - "GROUPS:owner,admin,mod,helper,mvpplus,vip,default"
    - "PLACEHOLDER_A_TO_Z:%player%"
  case-sensitive-sorting: true
  can-see-friendly-invisibles: false
  disable-condition: '%world%=disabledworld'

playerlist-objective:
  enabled: ${settings.enablePingNumber}
  value: "%ping%"
  fancy-value: "&a%ping%ms"
  title: "PING"
  render-type: INTEGER
  disable-condition: '%world%=disabledworld'

belowname-objective:
  enabled: false
  value: "%health%"
  fancy-value: "&c%health%"
  fancy-value-default: "NPC"
  title: "&cHealth"
  disable-condition: '%world%=disabledworld'
  view-distance: 10

prevent-spectator-effect:
  enabled: false

bossbar:
  enabled: false
  toggle-command: /bossbar
  remember-toggle-choice: false
  hidden-by-default: false
  bars:
    ServerInfo:
      style: "PROGRESS"
      color: "%animation:barcolors%"
      progress: "100"
      text: "&fStore: &b${settings.storeLink}"

scoreboard:
  enabled: false
  toggle-command: /sb
  remember-toggle-choice: false
  hidden-by-default: false
  delay-on-join-milliseconds: 0

layout:
  enabled: false
  direction: COLUMNS

ping-spoof:
  enabled: false
  value: 0

global-playerlist:
  enabled: false
  display-others-as-spectators: false
  display-vanished-players-as-spectators: true
  isolate-unlisted-servers: false
  update-latency: false

placeholders:
  date-format: "dd.MM.yyyy"
  time-format: "[HH:mm:ss / h:mm a]"
  time-offset: 0
  register-tab-expansion: false
  locale: en-US

placeholder-output-replacements:
  "%essentials_vanished%":
    "yes": "&7| Vanished"
    "no": ""

conditions:
  nick:
    conditions:
      - "%player%=%essentials_nickname%"
    true: "%player%"
    false: "~%essentials_nickname%"

placeholder-refresh-intervals:
  default-refresh-interval: 500
  "%server_uptime%": 1000
  "%server_tps_1_colored%": 1000
  "%server_unique_joins%": 5000
  "%player_health%": 200
  "%player_ping%": 1000
  "%vault_prefix%": 1000

assign-groups-by-permissions: false

primary-group-finding-list:
  - owner
  - admin
  - mod
  - helper
  - mvpplus
  - vip
  - default

permission-refresh-interval: 1000
debug: false

mysql:
  enabled: false

proxy-support:
  enabled: false

components:
  minimessage-support: true
  disable-shadow-for-heads: true

config-version: 7

per-world-playerlist:
  enabled: false

compensate-for-packetevents-bug: false
use-bukkit-permissions-manager: false
use-online-uuid-in-tablist: true
`;
};

export const generateTabGroupsConfig = (): string => {
    return `# ------------------------------------------------------------------
# TAB Groups Configuration — Synchronized with LuckPerms Hierarchy
# ------------------------------------------------------------------
_DEFAULT_:
  tabprefix: "%luckperms-prefix%"
  tagprefix: "%luckperms-prefix%"
  customtabname: "%player%"
  tabsuffix: "%luckperms-suffix%"
  tagsuffix: "%luckperms-suffix%"

owner:
  tabprefix: "&8[&4&lOWNER&8] &4"
  tagprefix: "&8[&4&lOWNER&8] &4"

admin:
  tabprefix: "&8[&c&lADMIN&8] &c"
  tagprefix: "&8[&c&lADMIN&8] &c"

mod:
  tabprefix: "&8[&2&lMOD&8] &a"
  tagprefix: "&8[&2&lMOD&8] &a"

helper:
  tabprefix: "&8[&e&lHELPER&8] &e"
  tagprefix: "&8[&e&lHELPER&8] &e"

mvpplus:
  tabprefix: "&8[&b&lMVP&b+&8] &b"
  tagprefix: "&8[&b&lMVP&b+&8] &b"

vip:
  tabprefix: "&8[&a&lVIP&8] &a"
  tagprefix: "&8[&a&lVIP&8] &a"

default:
  tabprefix: "&8[&7Member&8] &7"
  tagprefix: "&8[&7Member&8] &7"
`;
};

export const generateLpcConfig = (): string => {
    return `# ------------------------------------------------------------------
# LPC Chat Formatter — Configured by SmitCloud
# ------------------------------------------------------------------
chat-format: "{prefix}{name}&r: {message}"
clear-chat-message: "&7Chat has been cleared by a staff member."
`;
};

export const applyRolesAndTabSuite = async (uuid: string, settings: TabSettings): Promise<void> => {
    // 1. Install LuckPerms Bukkit
    await installPluginJar(
        uuid,
        'https://hosting.smitronix.dev/downloads/plugins/LuckPerms-Bukkit.jar',
        'LuckPerms-Bukkit.jar'
    );

    // 2. Install TAB Bukkit
    await installPluginJar(
        uuid,
        'https://hosting.smitronix.dev/downloads/plugins/TAB-Bukkit.jar',
        'TAB-Bukkit.jar'
    );

    // 3. Install Vault
    await installPluginJar(
        uuid,
        'https://hosting.smitronix.dev/downloads/plugins/Vault.jar',
        'Vault.jar'
    );

    // 4. Install LPC
    await installPluginJar(
        uuid,
        'https://hosting.smitronix.dev/downloads/plugins/LPC.jar',
        'LPC.jar'
    );

    // 5. Generate TAB config & groups
    try {
        await createDirectory(uuid, '/plugins', 'TAB');
    } catch {
        // ignore
    }
    const tabYaml = generateTabConfig(settings);
    await saveFileContents(uuid, '/plugins/TAB/config.yml', tabYaml);
    const groupsYaml = generateTabGroupsConfig();
    await saveFileContents(uuid, '/plugins/TAB/groups.yml', groupsYaml);

    // 6. Generate LPC config
    try {
        await createDirectory(uuid, '/plugins', 'LPC');
    } catch {
        // ignore
    }
    const lpcYaml = generateLpcConfig();
    await saveFileContents(uuid, '/plugins/LPC/config.yml', lpcYaml);

    // 7. Execute LuckPerms role hierarchy setup commands via console
    const setupCommands = [
        // Owner
        'lp creategroup owner',
        'lp group owner setweight 100',
        'lp group owner meta setprefix 100 "&8[&4&lOWNER&8] &4"',
        'lp group owner permission set * true',

        // Admin
        'lp creategroup admin',
        'lp group admin setweight 90',
        'lp group admin meta setprefix 90 "&8[&c&lADMIN&8] &c"',
        'lp group admin permission set minecraft.command.* true',
        'lp group admin permission set luckperms.* true',
        'lp group admin permission set worldedit.* true',
        'lp group admin permission set spark.* true',
        'lp group admin permission set tab.admin true',
        'lp group admin permission set authme.admin.* true',
        'lp group admin permission set fastlogin.admin true',

        // Mod
        'lp creategroup mod',
        'lp group mod setweight 80',
        'lp group mod meta setprefix 80 "&8[&2&lMOD&8] &a"',
        'lp group mod permission set minecraft.command.kick true',
        'lp group mod permission set minecraft.command.ban true',
        'lp group mod permission set minecraft.command.teleport true',
        'lp group mod permission set minecraft.command.gamemode true',
        'lp group mod permission set authme.admin.getemail true',
        'lp group mod permission set authme.admin.accounts true',

        // Helper
        'lp creategroup helper',
        'lp group helper setweight 70',
        'lp group helper meta setprefix 70 "&8[&e&lHELPER&8] &e"',
        'lp group helper permission set minecraft.command.teleport true',
        'lp group helper permission set minecraft.command.msg true',

        // MVP+
        'lp creategroup mvpplus',
        'lp group mvpplus setweight 50',
        'lp group mvpplus meta setprefix 50 "&8[&b&lMVP&b+&8] &b"',
        'lp group mvpplus permission set tab.bypass true',

        // VIP
        'lp creategroup vip',
        'lp group vip setweight 30',
        'lp group vip meta setprefix 30 "&8[&a&lVIP&8] &a"',
        'lp group vip permission set skinsrestorer.command.skin true',

        // Default / Member
        'lp group default setweight 10',
        'lp group default meta setprefix 10 "&8[&7Member&8] &7"',
        'lp group default permission set minecraft.command.help true',
        'lp group default permission set minecraft.command.msg true',
        'lp group default permission set fastlogin.bukkit.command.premium true',
        'lp group default permission set fastlogin.bukkit.command.cracked true',
        'lp group default permission set floodgate.command.link true',
        'lp group default permission set skinsrestorer.command.skin true',
        'lp group default permission set authme.player.* true',

        // Inheritance
        'lp group owner parent add admin',
        'lp group admin parent add mod',
        'lp group mod parent add helper',
        'lp group helper parent add mvpplus',
        'lp group mvpplus parent add vip',
        'lp group vip parent add default',

        // Reload
        'tab reload',
        'lpc reload',
    ];

    try {
        await sendServerCommands(uuid, setupCommands);
    } catch {
        // ignore if server is currently offline
    }
};

export const assignPlayerRank = async (uuid: string, player: string, rank: string): Promise<void> => {
    await sendServerCommand(uuid, `lp user ${player} parent set ${rank}`);
};

export const launchLuckPermsEditor = async (uuid: string): Promise<void> => {
    await sendServerCommand(uuid, 'lp editor');
};

export const removeRolesAndTabSuite = async (uuid: string, removeConfigs = true): Promise<void> => {
    // 1. If server is online, clean custom groups
    const cleanupCommands = [
        'lp deletegroup owner',
        'lp deletegroup admin',
        'lp deletegroup mod',
        'lp deletegroup helper',
        'lp deletegroup mvpplus',
        'lp deletegroup vip',
        'lp group default meta clear',
        'lp group default clear',
    ];

    try {
        await sendServerCommands(uuid, cleanupCommands);
    } catch {
        // ignore if server offline
    }

    // 2. Discover existing files in /plugins to delete
    try {
        const files = await loadDirectory(uuid, '/plugins');
        const toDelete: string[] = [];

        for (const file of files) {
            const nameLower = file.name.toLowerCase();
            // Jars
            if (
                nameLower.startsWith('luckperms') ||
                nameLower.startsWith('tab') ||
                nameLower.startsWith('vault') ||
                nameLower.startsWith('lpc')
            ) {
                if (file.isFile) {
                    toDelete.push(file.name);
                } else if (removeConfigs && (file.name === 'TAB' || file.name === 'LPC' || file.name === 'LuckPerms')) {
                    toDelete.push(file.name);
                }
            }
        }

        if (toDelete.length > 0) {
            await deleteFiles(uuid, '/plugins', toDelete);
        }
    } catch {
        // Fallback directly
        const fallback = ['LuckPerms-Bukkit.jar', 'TAB-Bukkit.jar', 'Vault.jar', 'LPC.jar'];
        if (removeConfigs) {
            fallback.push('TAB', 'LPC', 'LuckPerms');
        }
        await deleteFiles(uuid, '/plugins', fallback).catch(() => null);
    }
};

export const resetRolesAndTabToDefault = async (uuid: string): Promise<void> => {
    // Clear custom groups first
    const resetCommands = [
        'lp group default meta clear',
        'lp group default clear',
        'lp deletegroup vip',
        'lp deletegroup mvpplus',
        'lp deletegroup helper',
        'lp deletegroup mod',
        'lp deletegroup admin',
        'lp deletegroup owner',
    ];
    try {
        await sendServerCommands(uuid, resetCommands);
    } catch {
        // ignore
    }

    // Re-apply suite with DEFAULT_TAB_SETTINGS
    await applyRolesAndTabSuite(uuid, DEFAULT_TAB_SETTINGS);
};
