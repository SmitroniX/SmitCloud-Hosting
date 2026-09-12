import React, { useEffect, useState } from 'react';
import { ServerContext } from '@/state/server';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import FlashMessageRender from '@/components/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Label from '@/components/elements/Label';
import Input from '@/components/elements/Input';
import Button from '@/components/elements/Button';
import GreyRowBox from '@/components/elements/GreyRowBox';
import TitledGreyBox from '@/components/elements/TitledGreyBox';
import Select from '@/components/elements/Select';
import {
    MinecraftPlayer,
    MinecraftBannedIp,
    getWhitelist,
    getOperators,
    getBannedPlayers,
    getBannedIps,
    sendServerCommand,
} from '@/api/server/minecraft/players';

type Tab = 'quick' | 'whitelist' | 'ops' | 'banned_players' | 'banned_ips';

export default () => {
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();

    const [activeTab, setActiveTab] = useState<Tab>('quick');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Data states
    const [whitelist, setWhitelist] = useState<MinecraftPlayer[]>([]);
    const [operators, setOperators] = useState<MinecraftPlayer[]>([]);
    const [bannedPlayers, setBannedPlayers] = useState<MinecraftPlayer[]>([]);
    const [bannedIps, setBannedIps] = useState<MinecraftBannedIp[]>([]);

    // Form inputs
    const [targetPlayer, setTargetPlayer] = useState('');
    const [commandReason, setCommandReason] = useState('');
    const [selectedGamemode, setSelectedGamemode] = useState('survival');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = () => {
        setLoading(true);
        clearFlashes('players');

        if (activeTab === 'whitelist') {
            getWhitelist(uuid)
                .then(setWhitelist)
                .catch((error) => clearAndAddHttpError({ key: 'players', error }))
                .finally(() => setLoading(false));
        } else if (activeTab === 'ops') {
            getOperators(uuid)
                .then(setOperators)
                .catch((error) => clearAndAddHttpError({ key: 'players', error }))
                .finally(() => setLoading(false));
        } else if (activeTab === 'banned_players') {
            getBannedPlayers(uuid)
                .then(setBannedPlayers)
                .catch((error) => clearAndAddHttpError({ key: 'players', error }))
                .finally(() => setLoading(false));
        } else if (activeTab === 'banned_ips') {
            getBannedIps(uuid)
                .then(setBannedIps)
                .catch((error) => clearAndAddHttpError({ key: 'players', error }))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    };

    const handleRunCommand = (cmd: string, successMsg: string) => {
        if (!targetPlayer.trim() && !cmd.includes('whitelist reload')) {
            addFlash({
                key: 'players',
                type: 'error',
                title: 'Error',
                message: 'Please enter a target player name.',
            });
            return;
        }

        setSubmitting(true);
        clearFlashes('players');

        sendServerCommand(uuid, cmd)
            .then(() => {
                addFlash({
                    key: 'players',
                    type: 'success',
                    title: 'Command Sent',
                    message: successMsg,
                });
                setTargetPlayer('');
                setCommandReason('');
                setTimeout(loadData, 1000);
            })
            .catch((error) => clearAndAddHttpError({ key: 'players', error }))
            .finally(() => setSubmitting(false));
    };

    const renderPlayerAvatar = (name: string) => (
        <img
            src={`https://minotar.net/avatar/${encodeURIComponent(name)}/36`}
            alt={name}
            className={'w-9 h-9 rounded shadow mr-3'}
            onError={(e) => {
                // Fallback to default steve avatar
                (e.target as HTMLImageElement).src = 'https://minotar.net/avatar/MHF_Steve/36';
            }}
        />
    );

    return (
        <ServerContentBlock title={'Minecraft Player Manager'}>
            <FlashMessageRender byKey={'players'} className={'mb-4'} />

            {/* Header and Tabs */}
            <div className={'flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4'}>
                <div>
                    <h2 className={'text-2xl text-neutral-100 font-medium'}>Player Manager</h2>
                    <p className={'text-sm text-neutral-400 mt-1'}>
                        Manage online players, operators, whitelists, and bans directly from this dashboard.
                    </p>
                </div>
                <div className={'flex flex-wrap gap-2'}>
                    {(['quick', 'whitelist', 'ops', 'banned_players', 'banned_ips'] as Tab[]).map((tab) => (
                        <Button
                            key={tab}
                            isSecondary={activeTab !== tab}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'quick' && '⚡ Quick Actions'}
                            {tab === 'whitelist' && '📜 Whitelist'}
                            {tab === 'ops' && '⭐ Operators'}
                            {tab === 'banned_players' && '🔨 Banned Players'}
                            {tab === 'banned_ips' && '🚫 Banned IPs'}
                        </Button>
                    ))}
                </div>
            </div>

            {loading ? (
                <Spinner size={'large'} centered />
            ) : (
                <>
                    {/* QUICK ACTIONS TAB */}
                    {activeTab === 'quick' && (
                        <div className={'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
                            <TitledGreyBox title={'Player Command Center'}>
                                <div className={'mb-4'}>
                                    <Label>Target Player Username</Label>
                                    <Input
                                        type={'text'}
                                        placeholder={'e.g. Notch'}
                                        value={targetPlayer}
                                        onChange={(e) => setTargetPlayer(e.target.value)}
                                    />
                                </div>
                                <div className={'mb-4'}>
                                    <Label>Reason / Note (Optional)</Label>
                                    <Input
                                        type={'text'}
                                        placeholder={'e.g. Rule violation'}
                                        value={commandReason}
                                        onChange={(e) => setCommandReason(e.target.value)}
                                    />
                                </div>
                                <div className={'grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4'}>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`kick ${targetPlayer} ${commandReason}`.trim(), `Kicked player ${targetPlayer}.`)}
                                    >
                                        👢 Kick
                                    </Button>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`ban ${targetPlayer} ${commandReason}`.trim(), `Banned player ${targetPlayer}.`)}
                                    >
                                        🔨 Ban
                                    </Button>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`pardon ${targetPlayer}`, `Unbanned player ${targetPlayer}.`)}
                                    >
                                        🤝 Unban
                                    </Button>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`op ${targetPlayer}`, `Granted OP to ${targetPlayer}.`)}
                                    >
                                        ⭐ Make OP
                                    </Button>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`deop ${targetPlayer}`, `Revoked OP from ${targetPlayer}.`)}
                                    >
                                        ❌ Remove OP
                                    </Button>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`kill ${targetPlayer}`, `Killed player ${targetPlayer}.`)}
                                    >
                                        ☠️ Kill
                                    </Button>
                                </div>
                            </TitledGreyBox>

                            <TitledGreyBox title={'Gamemode & Utilities'}>
                                <div className={'mb-4'}>
                                    <Label>Target Gamemode</Label>
                                    <Select
                                        value={selectedGamemode}
                                        onChange={(e) => setSelectedGamemode(e.target.value)}
                                    >
                                        <option value={'survival'}>Survival</option>
                                        <option value={'creative'}>Creative</option>
                                        <option value={'adventure'}>Adventure</option>
                                        <option value={'spectator'}>Spectator</option>
                                    </Select>
                                </div>
                                <div className={'mb-4'}>
                                    <Button
                                        disabled={submitting || !targetPlayer.trim()}
                                        onClick={() => handleRunCommand(`gamemode ${selectedGamemode} ${targetPlayer}`, `Set ${targetPlayer}'s gamemode to ${selectedGamemode}.`)}
                                    >
                                        Change Gamemode
                                    </Button>
                                </div>
                                <hr className={'border-neutral-700 my-4'} />
                                <Label>Server Whitelist Shortcuts</Label>
                                <div className={'flex flex-wrap gap-2 mt-2'}>
                                    <Button isSecondary onClick={() => handleRunCommand('whitelist on', 'Whitelist turned ON.')}>
                                        Turn Whitelist ON
                                    </Button>
                                    <Button isSecondary onClick={() => handleRunCommand('whitelist off', 'Whitelist turned OFF.')}>
                                        Turn Whitelist OFF
                                    </Button>
                                    <Button isSecondary onClick={() => handleRunCommand('whitelist reload', 'Whitelist reloaded.')}>
                                        Reload Whitelist
                                    </Button>
                                </div>
                            </TitledGreyBox>
                        </div>
                    )}

                    {/* WHITELIST TAB */}
                    {activeTab === 'whitelist' && (
                        <div>
                            <div className={'flex gap-2 mb-4 max-w-lg'}>
                                <Input
                                    placeholder={'Minecraft username to whitelist'}
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                />
                                <Button
                                    disabled={submitting || !targetPlayer.trim()}
                                    onClick={() => handleRunCommand(`whitelist add ${targetPlayer}`, `Added ${targetPlayer} to whitelist.`)}
                                >
                                    Add to Whitelist
                                </Button>
                            </div>
                            {whitelist.length === 0 ? (
                                <GreyRowBox className={'justify-center text-neutral-400 p-8'}>
                                    No players on the whitelist or whitelist.json is empty.
                                </GreyRowBox>
                            ) : (
                                <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}>
                                    {whitelist.map((p) => (
                                        <GreyRowBox key={p.uuid || p.name} className={'justify-between items-center p-3'}>
                                            <div className={'flex items-center truncate mr-2'}>
                                                {renderPlayerAvatar(p.name)}
                                                <div>
                                                    <p className={'font-medium text-neutral-200'}>{p.name}</p>
                                                    {p.uuid && <p className={'text-xs text-neutral-500 truncate max-w-[140px]'}>{p.uuid}</p>}
                                                </div>
                                            </div>
                                            <Button
                                                isSecondary
                                                onClick={() => handleRunCommand(`whitelist remove ${p.name}`, `Removed ${p.name} from whitelist.`)}
                                            >
                                                Remove
                                            </Button>
                                        </GreyRowBox>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* OPERATORS TAB */}
                    {activeTab === 'ops' && (
                        <div>
                            <div className={'flex gap-2 mb-4 max-w-lg'}>
                                <Input
                                    placeholder={'Minecraft username to OP'}
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                />
                                <Button
                                    disabled={submitting || !targetPlayer.trim()}
                                    onClick={() => handleRunCommand(`op ${targetPlayer}`, `Granted OP permissions to ${targetPlayer}.`)}
                                >
                                    Grant OP
                                </Button>
                            </div>
                            {operators.length === 0 ? (
                                <GreyRowBox className={'justify-center text-neutral-400 p-8'}>
                                    No operators found in ops.json.
                                </GreyRowBox>
                            ) : (
                                <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'}>
                                    {operators.map((p) => (
                                        <GreyRowBox key={p.uuid || p.name} className={'justify-between items-center p-3'}>
                                            <div className={'flex items-center truncate mr-2'}>
                                                {renderPlayerAvatar(p.name)}
                                                <div>
                                                    <p className={'font-medium text-yellow-400'}>⭐ {p.name}</p>
                                                    <p className={'text-xs text-neutral-400'}>Level: {p.level ?? 4}</p>
                                                </div>
                                            </div>
                                            <Button
                                                isSecondary
                                                onClick={() => handleRunCommand(`deop ${p.name}`, `Revoked OP permissions from ${p.name}.`)}
                                            >
                                                De-OP
                                            </Button>
                                        </GreyRowBox>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BANNED PLAYERS TAB */}
                    {activeTab === 'banned_players' && (
                        <div>
                            <div className={'flex flex-col sm:flex-row gap-2 mb-4 max-w-2xl'}>
                                <Input
                                    placeholder={'Player username to ban'}
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                />
                                <Input
                                    placeholder={'Reason (optional)'}
                                    value={commandReason}
                                    onChange={(e) => setCommandReason(e.target.value)}
                                />
                                <Button
                                    disabled={submitting || !targetPlayer.trim()}
                                    onClick={() => handleRunCommand(`ban ${targetPlayer} ${commandReason}`.trim(), `Banned player ${targetPlayer}.`)}
                                >
                                    Ban Player
                                </Button>
                            </div>
                            {bannedPlayers.length === 0 ? (
                                <GreyRowBox className={'justify-center text-neutral-400 p-8'}>
                                    No banned players recorded in banned-players.json.
                                </GreyRowBox>
                            ) : (
                                <div className={'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                                    {bannedPlayers.map((p) => (
                                        <GreyRowBox key={p.uuid || p.name} className={'justify-between items-center p-3'}>
                                            <div className={'flex items-center truncate mr-2'}>
                                                {renderPlayerAvatar(p.name)}
                                                <div>
                                                    <p className={'font-medium text-red-400'}>{p.name}</p>
                                                    <p className={'text-xs text-neutral-400 truncate max-w-[200px]'}>
                                                        Reason: {p.reason || 'Banned by operator'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                isSecondary
                                                onClick={() => handleRunCommand(`pardon ${p.name}`, `Unbanned player ${p.name}.`)}
                                            >
                                                Pardon
                                            </Button>
                                        </GreyRowBox>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* BANNED IPS TAB */}
                    {activeTab === 'banned_ips' && (
                        <div>
                            <div className={'flex flex-col sm:flex-row gap-2 mb-4 max-w-2xl'}>
                                <Input
                                    placeholder={'IP address to ban (e.g. 192.168.1.1)'}
                                    value={targetPlayer}
                                    onChange={(e) => setTargetPlayer(e.target.value)}
                                />
                                <Input
                                    placeholder={'Reason (optional)'}
                                    value={commandReason}
                                    onChange={(e) => setCommandReason(e.target.value)}
                                />
                                <Button
                                    disabled={submitting || !targetPlayer.trim()}
                                    onClick={() => handleRunCommand(`ban-ip ${targetPlayer} ${commandReason}`.trim(), `Banned IP ${targetPlayer}.`)}
                                >
                                    Ban IP
                                </Button>
                            </div>
                            {bannedIps.length === 0 ? (
                                <GreyRowBox className={'justify-center text-neutral-400 p-8'}>
                                    No banned IP addresses recorded in banned-ips.json.
                                </GreyRowBox>
                            ) : (
                                <div className={'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                                    {bannedIps.map((ip) => (
                                        <GreyRowBox key={ip.ip} className={'justify-between items-center p-3'}>
                                            <div>
                                                <p className={'font-mono text-sm text-red-400 font-bold'}>{ip.ip}</p>
                                                <p className={'text-xs text-neutral-400'}>Reason: {ip.reason || 'Banned by operator'}</p>
                                            </div>
                                            <Button
                                                isSecondary
                                                onClick={() => handleRunCommand(`pardon-ip ${ip.ip}`, `Unbanned IP ${ip.ip}.`)}
                                            >
                                                Pardon IP
                                            </Button>
                                        </GreyRowBox>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </ServerContentBlock>
    );
};
