import React, { lazy } from 'react';
import ServerConsole from '@/components/server/console/ServerConsoleContainer';
import DatabasesContainer from '@/components/server/databases/DatabasesContainer';
import ScheduleContainer from '@/components/server/schedules/ScheduleContainer';
import UsersContainer from '@/components/server/users/UsersContainer';
import BackupContainer from '@/components/server/backups/BackupContainer';
import NetworkContainer from '@/components/server/network/NetworkContainer';
import StartupContainer from '@/components/server/startup/StartupContainer';
import FileManagerContainer from '@/components/server/files/FileManagerContainer';
import SettingsContainer from '@/components/server/settings/SettingsContainer';
import AccountOverviewContainer from '@/components/dashboard/AccountOverviewContainer';
import AccountApiContainer from '@/components/dashboard/AccountApiContainer';
import AccountSSHContainer from '@/components/dashboard/ssh/AccountSSHContainer';
import ActivityLogContainer from '@/components/dashboard/activity/ActivityLogContainer';
import ServerActivityLogContainer from '@/components/server/ServerActivityLogContainer';
const MinecraftHubOverviewContainer = lazy(() => import(/* webpackChunkName: "mc-hub" */ '@/components/server/minecraft/overview/MinecraftHubOverviewContainer'));
const VersionManagerContainer = lazy(() => import(/* webpackChunkName: "mc-version" */ '@/components/server/minecraft/versions/VersionManagerContainer'));
const PluginManagerContainer = lazy(() => import(/* webpackChunkName: "mc-plugins" */ '@/components/server/minecraft/plugins/PluginManagerContainer'));
const ModManagerContainer = lazy(() => import(/* webpackChunkName: "mc-mods" */ '@/components/server/minecraft/mods/ModManagerContainer'));
const ModpackManagerContainer = lazy(() => import(/* webpackChunkName: "mc-modpacks" */ '@/components/server/minecraft/modpacks/ModpackManagerContainer'));
const WorldManagerContainer = lazy(() => import(/* webpackChunkName: "mc-worlds" */ '@/components/server/minecraft/worlds/WorldManagerContainer'));
const PlayerManagerContainer = lazy(() => import(/* webpackChunkName: "mc-players" */ '@/components/server/minecraft/players/PlayerManagerContainer'));
const GeyserManagerContainer = lazy(() => import(/* webpackChunkName: "mc-geyser" */ '@/components/server/minecraft/geyser/GeyserManagerContainer'));
const DomainManagerContainer = lazy(() => import(/* webpackChunkName: "mc-domains" */ '@/components/server/minecraft/domains/DomainManagerContainer'));
const PropertiesEditorContainer = lazy(() => import(/* webpackChunkName: "mc-properties" */ '@/components/server/minecraft/properties/PropertiesEditorContainer'));
const HealthMonitorContainer = lazy(() => import(/* webpackChunkName: "mc-health" */ '@/components/server/minecraft/health/HealthMonitorContainer'));
const DDoSProtectionContainer = lazy(() => import(/* webpackChunkName: "mc-ddos" */ '@/components/server/minecraft/ddos/DDoSProtectionContainer'));
const DiscordIntegrationContainer = lazy(() => import(/* webpackChunkName: "mc-discord" */ '@/components/server/minecraft/discord/DiscordIntegrationContainer'));
const MOTDStudioContainer = lazy(() => import(/* webpackChunkName: "mc-motd" */ '@/components/server/minecraft/motd/MOTDStudioContainer'));
const CrashDoctorContainer = lazy(() => import(/* webpackChunkName: "mc-doctor" */ '@/components/server/minecraft/doctor/CrashDoctorContainer'));
const ModerationContainer = lazy(() => import(/* webpackChunkName: "mc-moderation" */ '@/components/server/minecraft/moderation/ModerationContainer'));
const DatapackManagerContainer = lazy(() => import(/* webpackChunkName: "mc-datapacks" */ '@/components/server/minecraft/datapacks/DatapackManagerContainer'));
const OptimizerContainer = lazy(() => import(/* webpackChunkName: "mc-optimizer" */ '@/components/server/minecraft/optimizer/OptimizerContainer'));
const LiveMapContainer = lazy(() => import(/* webpackChunkName: "mc-map" */ '@/components/server/minecraft/map/LiveMapContainer'));

// Each of the router files is already code split out appropriately — so
// all of the items above will only be loaded in when that router is loaded.
//
// These specific lazy loaded routes are to avoid loading in heavy screens
// for the server dashboard when they're only needed for specific instances.
const FileEditContainer = lazy(() => import(/* webpackChunkName: "files" */ '@/components/server/files/FileEditContainer'));

interface RouteDefinition {
    path: string;
    // If undefined is passed, this route will still be rendered into the
    // router itself, but no navigation link will be looked up or rendered
    // for it.
    name: string | undefined;
    component: React.ComponentType;
    exact?: boolean;
}

interface ServerRouteDefinition extends RouteDefinition {
    permission: string | string[] | null;
}

interface Routes {
    // These routes are covered by /account
    account: RouteDefinition[];
    // These routes are covered by /server/:id
    server: ServerRouteDefinition[];
}

export default {
    account: [
        {
            path: '/',
            name: 'Overview',
            component: AccountOverviewContainer,
            exact: true,
        },
        {
            path: '/api',
            name: 'API Credentials',
            component: AccountApiContainer,
        },
        {
            path: '/ssh',
            name: 'SSH Keys',
            component: AccountSSHContainer,
        },
        {
            path: '/activity',
            name: 'Activity',
            component: ActivityLogContainer,
        },
    ],
    server: [
        {
            path: '/',
            permission: null,
            name: 'Console',
            component: ServerConsole,
            exact: true,
        },
        {
            path: '/files',
            permission: 'file.*',
            name: 'Files',
            component: FileManagerContainer,
        },
        {
            path: '/files/:action(edit|new)',
            permission: 'file.*',
            name: undefined,
            component: FileEditContainer,
        },
        {
            path: '/databases',
            permission: 'database.*',
            name: 'Databases',
            component: DatabasesContainer,
        },
        {
            path: '/schedules',
            permission: 'schedule.*',
            name: 'Schedules',
            component: ScheduleContainer,
        },
        {
            path: '/users',
            permission: 'user.*',
            name: 'Users',
            component: UsersContainer,
        },
        {
            path: '/backups',
            permission: 'backup.*',
            name: 'Backups',
            component: BackupContainer,
        },
        {
            path: '/network',
            permission: 'allocation.*',
            name: 'Network',
            component: NetworkContainer,
        },
        {
            path: '/startup',
            permission: 'startup.*',
            name: 'Startup',
            component: StartupContainer,
        },
        {
            path: '/minecraft',
            permission: null,
            name: 'Minecraft Hub',
            component: MinecraftHubOverviewContainer,
            exact: true,
        },
        {
            path: '/minecraft/version',
            permission: 'file.*',
            name: 'Software & Version',
            component: VersionManagerContainer,
        },
        {
            path: '/minecraft/plugins',
            permission: 'file.*',
            name: 'Plugin Manager',
            component: PluginManagerContainer,
        },
        {
            path: '/minecraft/mods',
            permission: 'file.*',
            name: 'Mod Manager',
            component: ModManagerContainer,
        },
        {
            path: '/minecraft/modpacks',
            permission: 'file.*',
            name: 'Modpack Manager',
            component: ModpackManagerContainer,
        },
        {
            path: '/minecraft/worlds',
            permission: 'file.*',
            name: 'Worlds & Maps',
            component: WorldManagerContainer,
        },
        {
            path: '/minecraft/health',
            permission: null,
            name: 'Server Health & TPS',
            component: HealthMonitorContainer,
        },
        {
            path: '/minecraft/geyser',
            permission: 'file.*',
            name: 'Bedrock Crossplay',
            component: GeyserManagerContainer,
        },
        {
            path: '/minecraft/players',
            permission: 'file.*',
            name: 'Player Manager',
            component: PlayerManagerContainer,
        },
        {
            path: '/minecraft/properties',
            permission: 'file.*',
            name: 'Server Properties',
            component: PropertiesEditorContainer,
        },
        {
            path: '/minecraft/discord',
            permission: 'file.*',
            name: 'Discord & Widget',
            component: DiscordIntegrationContainer,
        },
        {
            path: '/minecraft/ddos',
            permission: 'file.*',
            name: 'DDoS & Security',
            component: DDoSProtectionContainer,
        },
        {
            path: '/minecraft/domain',
            permission: 'allocation.*',
            name: 'Custom Domains',
            component: DomainManagerContainer,
        },
        {
            path: '/minecraft/motd',
            permission: 'file.*',
            name: 'MOTD & Icon Studio',
            component: MOTDStudioContainer,
        },
        {
            path: '/minecraft/doctor',
            permission: 'file.*',
            name: 'Crash Doctor',
            component: CrashDoctorContainer,
        },
        {
            path: '/minecraft/moderation',
            permission: 'file.*',
            name: 'Moderation & Whitelist',
            component: ModerationContainer,
        },
        {
            path: '/minecraft/datapacks',
            permission: 'file.*',
            name: 'Datapacks',
            component: DatapackManagerContainer,
        },
        {
            path: '/minecraft/optimizer',
            permission: 'file.*',
            name: 'JVM Optimizer',
            component: OptimizerContainer,
        },
        {
            path: '/minecraft/map',
            permission: 'file.*',
            name: '3D Live Map',
            component: LiveMapContainer,
        },
        {
            path: '/settings',
            permission: ['settings.*', 'file.sftp'],
            name: 'Settings',
            component: SettingsContainer,
        },
        {
            path: '/activity',
            permission: 'activity.*',
            name: 'Activity',
            component: ServerActivityLogContainer,
        },
    ],
} as Routes;
