import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Label from '@/components/elements/Label';
import Input from '@/components/elements/Input';
import Switch from '@/components/elements/Switch';
import Select from '@/components/elements/Select';
import GreyRowBox from '@/components/elements/GreyRowBox';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Button from '@/components/elements/Button';
import getFileContents from '@/api/server/files/getFileContents';
import saveFileContents from '@/api/server/files/saveFileContents';

interface PropertyDef {
    label: string;
    description: string;
    type: 'boolean' | 'string' | 'number' | 'select';
    options?: string[];
    min?: number;
    max?: number;
}

const PROPERTY_DEFS: Record<string, PropertyDef> = {
    'motd': { label: 'Server MOTD', description: 'Message shown in the server list', type: 'string' },
    'server-port': { label: 'Server Port', description: 'Port the server listens on', type: 'number', min: 1, max: 65535 },
    'max-players': { label: 'Max Players', description: 'Maximum number of players', type: 'number', min: 1, max: 1000 },
    'online-mode': { label: 'Online Mode', description: 'Verify player accounts with Mojang', type: 'boolean' },
    'hardcore': { label: 'Hardcore', description: 'Players are banned on death', type: 'boolean' },
    'pvp': { label: 'PvP', description: 'Allow player vs. player combat', type: 'boolean' },
    'gamemode': { label: 'Gamemode', description: 'Default game mode for new players', type: 'select', options: ['survival', 'creative', 'adventure', 'spectator'] },
    'difficulty': { label: 'Difficulty', description: 'Server difficulty level', type: 'select', options: ['peaceful', 'easy', 'normal', 'hard'] },
    'level-name': { label: 'Level Name', description: 'Name of the world folder', type: 'string' },
    'level-seed': { label: 'Level Seed', description: 'World generation seed', type: 'string' },
    'level-type': { label: 'Level Type', description: 'Type of world generation', type: 'select', options: ['minecraft:normal', 'minecraft:flat', 'minecraft:large_biomes', 'minecraft:amplified', 'minecraft:single_biome_surface'] },
    'spawn-protection': { label: 'Spawn Protection', description: 'Radius of spawn area protection (0 = disabled)', type: 'number', min: 0, max: 256 },
    'view-distance': { label: 'View Distance', description: 'Max view distance in chunks', type: 'number', min: 2, max: 32 },
    'simulation-distance': { label: 'Simulation Distance', description: 'Max simulation distance in chunks', type: 'number', min: 2, max: 32 },
    'generate-structures': { label: 'Generate Structures', description: 'Generate villages, temples, etc.', type: 'boolean' },
    'spawn-monsters': { label: 'Spawn Monsters', description: 'Allow hostile mobs to spawn', type: 'boolean' },
    'spawn-animals': { label: 'Spawn Animals', description: 'Allow animals to spawn', type: 'boolean' },
    'spawn-npcs': { label: 'Spawn NPCs', description: 'Allow villagers to spawn', type: 'boolean' },
    'allow-nether': { label: 'Allow Nether', description: 'Allow travel to the Nether', type: 'boolean' },
    'allow-flight': { label: 'Allow Flight', description: 'Allow players to fly (with mods)', type: 'boolean' },
    'force-gamemode': { label: 'Force Gamemode', description: 'Force players to join in default game mode', type: 'boolean' },
    'player-idle-timeout': { label: 'Idle Timeout', description: 'Minutes before idle players are kicked (0 = disabled)', type: 'number', min: 0, max: 1440 },
    'white-list': { label: 'Whitelist', description: 'Only allow whitelisted players', type: 'boolean' },
    'enforce-whitelist': { label: 'Enforce Whitelist', description: 'Kick non-whitelisted players when enabled', type: 'boolean' },
    'enable-command-block': { label: 'Command Blocks', description: 'Allow command blocks', type: 'boolean' },
    'op-permission-level': { label: 'OP Permission Level', description: 'Default OP permission level', type: 'select', options: ['1', '2', '3', '4'] },
    'max-tick-time': { label: 'Max Tick Time', description: 'Max milliseconds per tick before watchdog (-1 = disabled)', type: 'number', min: -1, max: 600000 },
    'network-compression-threshold': { label: 'Network Compression', description: 'Packet size threshold for compression', type: 'number', min: -1, max: 65535 },
    'entity-broadcast-range-percentage': { label: 'Entity Broadcast Range %', description: 'Percentage of default entity broadcast range', type: 'number', min: 10, max: 1000 },
    'enable-rcon': { label: 'Enable RCON', description: 'Enable remote console', type: 'boolean' },
    'rcon.port': { label: 'RCON Port', description: 'Port for RCON connections', type: 'number', min: 1, max: 65535 },
    'rcon.password': { label: 'RCON Password', description: 'Password for RCON access', type: 'string' },
    'enable-query': { label: 'Enable Query', description: 'Enable GameSpy4 query protocol', type: 'boolean' },
    'query.port': { label: 'Query Port', description: 'Port for query protocol', type: 'number', min: 1, max: 65535 },
    'max-world-size': { label: 'Max World Size', description: 'Maximum world radius in blocks', type: 'number', min: 1, max: 29999984 },
    'enable-status': { label: 'Enable Status', description: 'Show server in multiplayer list', type: 'boolean' },
    'prevent-proxy-connections': { label: 'Prevent Proxy Connections', description: 'Block VPN/proxy connections', type: 'boolean' },
};

const CATEGORIES: Record<string, string[]> = {
    'General': ['motd', 'server-port', 'max-players', 'online-mode', 'hardcore', 'pvp', 'gamemode', 'difficulty', 'enable-status'],
    'World': ['level-name', 'level-seed', 'level-type', 'spawn-protection', 'view-distance', 'simulation-distance', 'generate-structures', 'max-world-size'],
    'Spawning': ['spawn-monsters', 'spawn-animals', 'spawn-npcs', 'allow-nether'],
    'Player': ['allow-flight', 'force-gamemode', 'player-idle-timeout', 'white-list', 'enforce-whitelist', 'enable-command-block', 'op-permission-level', 'prevent-proxy-connections'],
    'Performance': ['max-tick-time', 'network-compression-threshold', 'entity-broadcast-range-percentage'],
    'RCON & Query': ['enable-rcon', 'rcon.port', 'rcon.password', 'enable-query', 'query.port'],
};

const parseProperties = (raw: string): Record<string, string> => {
    const props: Record<string, string> = {};
    raw.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = trimmed.indexOf('=');
        if (idx === -1) return;
        props[trimmed.substring(0, idx)] = trimmed.substring(idx + 1);
    });
    return props;
};

const serializeProperties = (props: Record<string, string>, originalRaw: string): string => {
    const lines = originalRaw.split('\n');
    const result: string[] = [];
    const written = new Set<string>();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            result.push(line);
            continue;
        }
        const idx = trimmed.indexOf('=');
        if (idx === -1) {
            result.push(line);
            continue;
        }
        const key = trimmed.substring(0, idx);
        if (key in props) {
            result.push(`${key}=${props[key]}`);
            written.add(key);
        } else {
            result.push(line);
        }
    }

    // Add any new properties not in original
    for (const key of Object.keys(props)) {
        if (!written.has(key)) {
            result.push(`${key}=${props[key]}`);
        }
    }

    return result.join('\n');
};

const PropertyRow: React.FC<{
    propKey: string;
    value: string;
    onChange: (key: string, value: string) => void;
}> = ({ propKey, value, onChange }) => {
    const def = PROPERTY_DEFS[propKey];
    const label = def?.label || propKey.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const description = def?.description || '';
    const type = def?.type || (value === 'true' || value === 'false' ? 'boolean' : 'string');

    return (
        <GreyRowBox className={'flex-col items-start p-4'}>
            <div className={'flex items-center justify-between w-full mb-1'}>
                <Label className={'mb-0 font-medium'}>{label}</Label>
            </div>
            {description && (
                <p className={'text-xs text-neutral-400 mb-2'}>{description}</p>
            )}
            <div className={'w-full'}>
                {type === 'boolean' ? (
                    <div className={'flex items-center'}>
                        <Switch
                            name={propKey}
                            defaultChecked={value === 'true'}
                            onChange={() => onChange(propKey, value === 'true' ? 'false' : 'true')}
                        />
                        <span className={'ml-3 text-xs uppercase font-bold text-neutral-400'}>
                            {value === 'true' ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                ) : type === 'select' && def?.options ? (
                    <Select
                        value={value}
                        onChange={(e) => onChange(propKey, e.target.value)}
                    >
                        {!def.options.includes(value) && (
                            <option value={value}>{value}</option>
                        )}
                        {def.options.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </option>
                        ))}
                    </Select>
                ) : type === 'number' ? (
                    <Input
                        type={'number'}
                        value={value}
                        min={def?.min}
                        max={def?.max}
                        onChange={(e) => onChange(propKey, e.target.value)}
                    />
                ) : (
                    <Input
                        value={value}
                        onChange={(e) => onChange(propKey, e.target.value)}
                    />
                )}
            </div>
        </GreyRowBox>
    );
};

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [properties, setProperties] = useState<Record<string, string>>({});
    const [originalRaw, setOriginalRaw] = useState('');
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = () => {
        setLoading(true);
        clearFlashes('properties');
        getFileContents(uuid, '/server.properties')
            .then((data) => {
                setOriginalRaw(data);
                setProperties(parseProperties(data));
                setHasChanges(false);
            })
            .catch((error) => clearAndAddHttpError({ key: 'properties', error }))
            .finally(() => setLoading(false));
    };

    const handleChange = (key: string, value: string) => {
        setProperties((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        setSaving(true);
        clearFlashes('properties');
        const content = serializeProperties(properties, originalRaw);
        saveFileContents(uuid, '/server.properties', content)
            .then(() => {
                setOriginalRaw(content);
                setHasChanges(false);
                addFlash({
                    key: 'properties',
                    type: 'success',
                    title: 'Success',
                    message: 'Server properties saved successfully. Restart the server for changes to take effect.',
                });
            })
            .catch((error) => clearAndAddHttpError({ key: 'properties', error }))
            .finally(() => setSaving(false));
    };

    const categorizedKeys = new Set(Object.values(CATEGORIES).flat());
    const miscKeys = Object.keys(properties).filter((k) => !categorizedKeys.has(k));

    if (loading) {
        return (
            <ServerContentBlock title={'Server Properties'}>
                <Spinner size={'large'} centered />
            </ServerContentBlock>
        );
    }

    return (
        <ServerContentBlock title={'Server Properties'}>
            <FlashMessageRender byKey={'properties'} className={'mb-4'} />

            <div className={'flex items-center justify-between mb-6'}>
                <div>
                    <h2 className={'text-2xl text-neutral-100 font-medium'}>Server Properties Editor</h2>
                    <p className={'text-sm text-neutral-400 mt-1'}>
                        Visually edit your server.properties file. Changes require a server restart.
                    </p>
                </div>
                <div className={'flex items-center gap-3'}>
                    <Button
                        isSecondary
                        onClick={loadProperties}
                        disabled={saving}
                    >
                        Reload
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                    >
                        {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
                    </Button>
                </div>
            </div>

            {Object.entries(CATEGORIES).map(([category, keys]) => {
                const activeKeys = keys.filter((k) => k in properties);
                if (activeKeys.length === 0) return null;
                return (
                    <TitledGreyBox key={category} title={category} className={'mb-6'}>
                        <div className={'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
                            {activeKeys.map((key) => (
                                <PropertyRow
                                    key={key}
                                    propKey={key}
                                    value={properties[key]}
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    </TitledGreyBox>
                );
            })}

            {miscKeys.length > 0 && (
                <TitledGreyBox title={'Other Properties'} className={'mb-6'}>
                    <div className={'grid grid-cols-1 lg:grid-cols-2 gap-4'}>
                        {miscKeys.map((key) => (
                            <PropertyRow
                                key={key}
                                propKey={key}
                                value={properties[key]}
                                onChange={handleChange}
                            />
                        ))}
                    </div>
                </TitledGreyBox>
            )}
        </ServerContentBlock>
    );
};
