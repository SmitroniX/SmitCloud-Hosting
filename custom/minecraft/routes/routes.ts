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
import PluginManagerContainer from '@/components/server/minecraft/plugins/PluginManagerContainer';
import PlayerManagerContainer from '@/components/server/minecraft/players/PlayerManagerContainer';
import PropertiesEditorContainer from '@/components/server/minecraft/properties/PropertiesEditorContainer';
import GeyserManagerContainer from '@/components/server/minecraft/geyser/GeyserManagerContainer';
import VersionManagerContainer from '@/components/server/minecraft/versions/VersionManagerContainer';
import WorldManagerContainer from '@/components/server/minecraft/worlds/WorldManagerContainer';
import HealthMonitorContainer from '@/components/server/minecraft/health/HealthMonitorContainer';
import DiscordIntegrationContainer from '@/components/server/minecraft/discord/DiscordIntegrationContainer';
import DDoSProtectionContainer from '@/components/server/minecraft/ddos/DDoSProtectionContainer';
import DomainManagerContainer from '@/components/server/minecraft/domains/DomainManagerContainer';
import ModManagerContainer from '@/components/server/minecraft/mods/ModManagerContainer';
import ModpackManagerContainer from '@/components/server/minecraft/modpacks/ModpackManagerContainer';

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
