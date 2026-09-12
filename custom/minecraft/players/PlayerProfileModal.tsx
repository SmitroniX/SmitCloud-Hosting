import React, { useState } from 'react';
import Modal from '@/components/elements/Modal';
import Spinner from '@/components/elements/Spinner';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import {
    HeartIcon,
    SparklesIcon,
    LocationMarkerIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    DuplicateIcon,
    LightningBoltIcon,
    TrashIcon,
    PaperAirplaneIcon,
    GiftIcon,
    XIcon,
} from '@heroicons/react/solid';
import { PlayerProfileData, PlayerInventoryItem } from '@/api/server/minecraft/nbtParser';
import {
    healPlayer,
    setPlayerGamemode,
    givePlayerItem,
    clearPlayerInventory,
    smitePlayer,
    teleportPlayerToCoords,
    sendServerCommand,
} from '@/api/server/minecraft/players';

interface Props {
    visible: boolean;
    onDismiss: () => void;
    serverUuid: string;
    profile: PlayerProfileData | null;
    loading: boolean;
    onActionSuccess?: (msg: string) => void;
}

const formatItemName = (id: string): string => {
    return id
        .replace(/^minecraft:/, '')
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
};

const getItemTexture = (id: string): string => {
    const clean = id.replace(/^minecraft:/, '');
    return `https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/${clean}.png`;
};

export default ({ visible, onDismiss, serverUuid, profile, loading, onActionSuccess }: Props) => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'ender' | 'actions'>('inventory');
    const [copiedUuid, setCopiedUuid] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form inputs for actions
    const [giveItemId, setGiveItemId] = useState('diamond');
    const [giveItemCount, setGiveItemCount] = useState(64);
    const [tpX, setTpX] = useState('');
    const [tpY, setTpY] = useState('');
    const [tpZ, setTpZ] = useState('');
    const [privateMsg, setPrivateMsg] = useState('');

    if (!visible) return null;

    const handleCopyUuid = (uuid: string) => {
        copy(uuid);
        setCopiedUuid(true);
        setTimeout(() => setCopiedUuid(false), 2000);
    };

    const runAction = async (fn: () => Promise<void>, msg: string) => {
        try {
            setActionLoading(true);
            await fn();
            if (onActionSuccess) onActionSuccess(msg);
        } catch (e: any) {
            alert(e?.message || 'Failed to execute command.');
        } finally {
            setActionLoading(false);
        }
    };

    const getSlotItem = (items: PlayerInventoryItem[], slot: number): PlayerInventoryItem | undefined => {
        return items.find((i) => i.slot === slot && i.id !== 'minecraft:air');
    };

    // Hotbar: slots 0-8
    // Main inventory: slots 9-35
    // Armor: 103 (helm), 102 (chest), 101 (legs), 100 (boots)
    // Off-hand: -106

    const renderInventorySlot = (slot: number, items: PlayerInventoryItem[], label?: string) => {
        const item = getSlotItem(items, slot);

        return (
            <div
                key={slot}
                title={item ? `${formatItemName(item.id)} (${item.id}) - Count: ${item.count}` : label || `Slot ${slot}`}
                className={classNames(
                    'relative flex h-8 w-8 sm:h-9 sm:w-9 md:h-11 md:w-11 items-center justify-center rounded-lg border transition duration-150 select-none group',
                    {
                        'border-cyan-500/30 bg-neutral-900/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]': !item,
                        'border-cyan-400/80 bg-neutral-850 shadow-[0_0_10px_rgba(6,182,212,0.15)]': item,
                    }
                )}
            >
                {item ? (
                    <>
                        <img
                            src={getItemTexture(item.id)}
                            alt={item.id}
                            className={'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.includes('/textures/item/')) {
                                    target.src = target.src.replace('/textures/item/', '/textures/block/');
                                } else {
                                    target.style.display = 'none';
                                }
                            }}
                        />
                        <span className={'pointer-events-none absolute bottom-0.5 right-0.5 md:right-1 font-mono text-[9px] sm:text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'}>
                            {item.count > 1 ? item.count : ''}
                        </span>

                        {/* Tooltip */}
                        <div className={'pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col rounded-lg bg-neutral-950/95 border border-cyan-500/40 px-2.5 py-1.5 shadow-2xl z-50 whitespace-nowrap min-w-max text-left'}>
                            <p className={'font-bold text-cyan-300 text-xs'}>{item.displayName || formatItemName(item.id)}</p>
                            <p className={'text-[10px] text-neutral-400 font-mono'}>{item.id}</p>
                            <p className={'text-[10px] text-emerald-400'}>Count: {item.count}</p>
                            {item.damage ? (
                                <p className={'text-[10px] text-amber-400'}>Damage: {item.damage}</p>
                            ) : null}
                        </div>
                    </>
                ) : (
                    label && <span className={'text-[10px] sm:text-xs text-neutral-600 font-mono'}>{label}</span>
                )}
            </div>
        );
    };

    return (
        <Modal visible={visible} onDismissed={onDismiss} showSpinnerOverlay={actionLoading}>
            {loading || !profile ? (
                <div className={'py-16 flex flex-col items-center justify-center gap-3'}>
                    <Spinner size={'large'} centered />
                    <p className={'text-xs text-cyan-400 font-mono animate-pulse'}>
                        Reading Player NBT Data & Inventory...
                    </p>
                </div>
            ) : (
                <div className={'flex flex-col gap-5 max-h-[85vh] overflow-y-auto pr-1'}>
                    {/* Header with 3D Skin & Info */}
                    <div className={'relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0a0f1d] p-5 shadow-2xl'}>
                        <div className={'pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-2xl'} />

                        <div className={'relative flex flex-col sm:flex-row items-center sm:items-start gap-5'}>
                            {/* 3D Skin Render */}
                            <div className={'relative flex flex-col items-center shrink-0'}>
                                <div className={'flex h-36 w-28 items-center justify-center rounded-xl bg-neutral-900/80 border border-neutral-800 p-2 shadow-inner'}>
                                    <img
                                        src={`https://mc-heads.net/body/${profile.uuid}/right`}
                                        alt={profile.name}
                                        className={'h-32 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]'}
                                        onError={(e) => {
                                            // Fallback to avatar if 3D body fails
                                            (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/${profile.uuid}/96`;
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Details */}
                            <div className={'flex-1 min-w-0 text-center sm:text-left'}>
                                <div className={'flex flex-wrap items-center justify-center sm:justify-start gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black text-white tracking-tight'}>
                                        {profile.name}
                                    </h1>
                                    <span
                                        className={classNames(
                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase border',
                                            {
                                                'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]': profile.isOnline,
                                                'bg-neutral-800 text-neutral-400 border-neutral-700': !profile.isOnline,
                                            }
                                        )}
                                    >
                                        <span className={classNames('h-1.5 w-1.5 rounded-full', {
                                            'bg-emerald-400 animate-pulse': profile.isOnline,
                                            'bg-neutral-500': !profile.isOnline,
                                        })} />
                                        {profile.isOnline ? 'Online Now' : 'Offline'}
                                    </span>

                                    {profile.name.startsWith('.') || profile.name.startsWith('*') ? (
                                        <span className={'rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold'}>
                                            📱 Bedrock Player
                                        </span>
                                    ) : null}
                                </div>

                                <div className={'mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-xs text-neutral-400 font-mono'}>
                                    <span className={'truncate'}>{profile.uuid}</span>
                                    <button
                                        type={'button'}
                                        onClick={() => handleCopyUuid(profile.uuid)}
                                        className={'text-cyan-400 hover:text-cyan-300'}
                                        title={'Copy UUID'}
                                    >
                                        <DuplicateIcon className={'h-3.5 w-3.5'} />
                                    </button>
                                    {copiedUuid && <span className={'text-[10px] text-emerald-400'}>Copied!</span>}
                                </div>

                                {/* Location & Dimension */}
                                <div className={'mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs'}>
                                    <span className={'rounded-lg bg-neutral-800/90 border border-neutral-700/60 px-2.5 py-1 text-neutral-200 flex items-center gap-1.5 font-mono'}>
                                        <LocationMarkerIcon className={'h-3.5 w-3.5 text-cyan-400'} />
                                        X: {profile.pos[0]} | Y: {profile.pos[1]} | Z: {profile.pos[2]}
                                    </span>

                                    <span className={'rounded-lg bg-neutral-800/90 border border-neutral-700/60 px-2.5 py-1 text-neutral-300'}>
                                        {profile.dimension.includes('nether') ? '🔥 Nether' : profile.dimension.includes('end') ? '🌌 The End' : '🌲 Overworld'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Vitals Stats Bar */}
                        <div className={'grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-neutral-800/80 text-xs'}>
                            {/* Health */}
                            <div className={'rounded-xl bg-neutral-900/80 p-2.5 border border-neutral-800'}>
                                <div className={'flex items-center justify-between text-[11px] font-semibold text-neutral-400'}>
                                    <span className={'flex items-center gap-1 text-red-400 font-bold'}>
                                        <HeartIcon className={'h-3.5 w-3.5'} /> Health
                                    </span>
                                    <span>{profile.health} / 20</span>
                                </div>
                                <div className={'mt-1.5 h-2 w-full rounded-full bg-neutral-800 overflow-hidden'}>
                                    <div
                                        className={'h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full transition-all duration-300'}
                                        style={{ width: `${Math.min(100, (profile.health / 20) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Food */}
                            <div className={'rounded-xl bg-neutral-900/80 p-2.5 border border-neutral-800'}>
                                <div className={'flex items-center justify-between text-[11px] font-semibold text-neutral-400'}>
                                    <span className={'text-amber-400 font-bold'}>🍖 Hunger</span>
                                    <span>{profile.foodLevel} / 20</span>
                                </div>
                                <div className={'mt-1.5 h-2 w-full rounded-full bg-neutral-800 overflow-hidden'}>
                                    <div
                                        className={'h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-300'}
                                        style={{ width: `${Math.min(100, (profile.foodLevel / 20) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* XP */}
                            <div className={'rounded-xl bg-neutral-900/80 p-2.5 border border-neutral-800'}>
                                <div className={'flex items-center justify-between text-[11px] font-semibold text-neutral-400'}>
                                    <span className={'text-emerald-400 font-bold'}>🧪 XP Level</span>
                                    <span>Lvl {profile.xpLevel}</span>
                                </div>
                                <div className={'mt-1.5 h-2 w-full rounded-full bg-neutral-800 overflow-hidden'}>
                                    <div
                                        className={'h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-300'}
                                        style={{ width: `${Math.min(100, (profile.xpProgress || 0) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Gamemode */}
                            <div className={'rounded-xl bg-neutral-900/80 p-2.5 border border-neutral-800'}>
                                <span className={'block text-[10px] text-neutral-400 uppercase font-bold'}>Gamemode</span>
                                <span className={'font-bold text-white text-xs mt-0.5 block'}>
                                    {profile.gameMode === 1 ? '🎨 Creative' : profile.gameMode === 2 ? '🗺️ Adventure' : profile.gameMode === 3 ? '👻 Spectator' : '⚔️ Survival'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className={'flex items-center gap-2 border-b border-neutral-800 pb-2 text-xs font-semibold'}>
                        <button
                            type={'button'}
                            onClick={() => setActiveTab('inventory')}
                            className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20': activeTab === 'inventory',
                                'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'inventory',
                            })}
                        >
                            🎒 Player Inventory ({profile.inventory.length})
                        </button>
                        <button
                            type={'button'}
                            onClick={() => setActiveTab('ender')}
                            className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20': activeTab === 'ender',
                                'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'ender',
                            })}
                        >
                            👁️ Ender Chest ({profile.enderItems.length})
                        </button>
                        <button
                            type={'button'}
                            onClick={() => setActiveTab('actions')}
                            className={classNames('px-3.5 py-1.5 rounded-xl transition', {
                                'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20': activeTab === 'actions',
                                'text-neutral-400 hover:text-white hover:bg-neutral-800': activeTab !== 'actions',
                            })}
                        >
                            ⚡ Admin Actions
                        </button>
                    </div>

                    {/* Inventory Tab */}
                    {activeTab === 'inventory' && (
                        <div className={'flex flex-col gap-4'}>
                            <div className={'flex flex-col md:flex-row gap-4 items-start justify-center'}>
                                {/* Armor Column & Off-hand */}
                                <div className={'flex md:flex-col gap-2 p-3 rounded-2xl bg-[#0a0f1d]/90 border border-neutral-800/80 shadow-lg'}>
                                    <span className={'hidden md:block text-[10px] text-center font-bold text-neutral-500 uppercase'}>
                                        Armor
                                    </span>
                                    {renderInventorySlot(103, profile.inventory, '🪖')}
                                    {renderInventorySlot(102, profile.inventory, '🦺')}
                                    {renderInventorySlot(101, profile.inventory, '👖')}
                                    {renderInventorySlot(100, profile.inventory, '👢')}
                                    <div className={'my-1 border-t border-neutral-800 hidden md:block'} />
                                    {renderInventorySlot(-106, profile.inventory, '🛡️')}
                                </div>

                                {/* Main Inventory Matrix (3x9) & Hotbar (1x9) */}
                                <div className={'flex flex-col gap-3 p-4 rounded-2xl bg-[#0a0f1d]/90 border border-neutral-800/80 shadow-lg overflow-x-auto max-w-full'}>
                                    <div className={'flex items-center justify-between text-[10px] font-bold text-neutral-500 uppercase'}>
                                        <span>Main Inventory (Slots 9-35)</span>
                                    </div>
                                    <div className={'grid grid-cols-9 gap-1.5'}>
                                        {Array.from({ length: 27 }, (_, i) => renderInventorySlot(i + 9, profile.inventory))}
                                    </div>

                                    <div className={'my-1 border-t border-neutral-800/80'} />

                                    <div className={'flex items-center justify-between text-[10px] font-bold text-cyan-400 uppercase'}>
                                        <span>Hotbar (Slots 0-8)</span>
                                    </div>
                                    <div className={'grid grid-cols-9 gap-1.5'}>
                                        {Array.from({ length: 9 }, (_, i) => renderInventorySlot(i, profile.inventory))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ender Chest Tab */}
                    {activeTab === 'ender' && (
                        <div className={'flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#0a0f1d]/90 border border-purple-800/40 shadow-xl overflow-x-auto'}>
                            <div className={'flex items-center justify-between w-full text-xs font-bold text-purple-300'}>
                                <span>Ender Chest Storage (27 Slots)</span>
                                <span className={'text-[10px] text-neutral-400'}>Personal safe cross-dimension storage</span>
                            </div>
                            <div className={'grid grid-cols-9 gap-1.5 mt-2'}>
                                {Array.from({ length: 27 }, (_, i) => renderInventorySlot(i, profile.enderItems))}
                            </div>
                        </div>
                    )}

                    {/* Admin Actions Tab */}
                    {activeTab === 'actions' && (
                        <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'}>
                            {/* Quick Actions */}
                            <div className={'rounded-xl bg-neutral-900/80 p-4 border border-neutral-800 flex flex-col gap-2.5'}>
                                <span className={'font-bold text-white text-xs uppercase tracking-wider text-cyan-400'}>
                                    Instant Power Triggers
                                </span>
                                <button
                                    type={'button'}
                                    onClick={() => runAction(() => healPlayer(serverUuid, profile.name), `Healed and fed ${profile.name}!`)}
                                    className={'flex items-center justify-between p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-emerald-400 transition font-medium'}
                                >
                                    <span>💖 Full Heal & Feed</span>
                                    <span className={'text-[10px] text-neutral-400'}>/effect health & food</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => runAction(() => smitePlayer(serverUuid, profile.name), `Smote ${profile.name} with lightning!`)}
                                    className={'flex items-center justify-between p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-amber-400 transition font-medium'}
                                >
                                    <span>⚡ Smite With Lightning</span>
                                    <span className={'text-[10px] text-neutral-400'}>/execute lightning</span>
                                </button>
                                <button
                                    type={'button'}
                                    onClick={() => {
                                        if (confirm(`Clear all items in ${profile.name}'s inventory?`)) {
                                            runAction(() => clearPlayerInventory(serverUuid, profile.name), `Cleared inventory of ${profile.name}!`);
                                        }
                                    }}
                                    className={'flex items-center justify-between p-2.5 rounded-lg bg-neutral-800 hover:bg-red-950/40 text-red-400 transition font-medium'}
                                >
                                    <span>🧹 Clear All Items</span>
                                    <span className={'text-[10px] text-neutral-400'}>/clear</span>
                                </button>
                            </div>

                            {/* Gamemode Switcher */}
                            <div className={'rounded-xl bg-neutral-900/80 p-4 border border-neutral-800 flex flex-col gap-2'}>
                                <span className={'font-bold text-white text-xs uppercase tracking-wider text-cyan-400'}>
                                    Change Gamemode
                                </span>
                                <div className={'grid grid-cols-2 gap-2 mt-1'}>
                                    {['survival', 'creative', 'adventure', 'spectator'].map((gm) => (
                                        <button
                                            key={gm}
                                            type={'button'}
                                            onClick={() => runAction(() => setPlayerGamemode(serverUuid, profile.name, gm), `Set ${profile.name} to ${gm}!`)}
                                            className={'p-2 rounded-lg bg-neutral-800 hover:bg-cyan-900/30 text-neutral-200 capitalize font-medium border border-neutral-700/50 hover:border-cyan-500/40 transition'}
                                        >
                                            {gm}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Give Item */}
                            <div className={'rounded-xl bg-neutral-900/80 p-4 border border-neutral-800 flex flex-col gap-2'}>
                                <span className={'font-bold text-white text-xs uppercase tracking-wider text-cyan-400'}>
                                    Give Item
                                </span>
                                <div className={'flex gap-2'}>
                                    <input
                                        type={'text'}
                                        placeholder={'Item ID (e.g. diamond_sword)'}
                                        value={giveItemId}
                                        onChange={(e) => setGiveItemId(e.target.value)}
                                        className={'flex-1 rounded-lg bg-neutral-950 border border-neutral-700 p-2 text-xs text-white'}
                                    />
                                    <input
                                        type={'number'}
                                        min={1}
                                        max={64}
                                        value={giveItemCount}
                                        onChange={(e) => setGiveItemCount(parseInt(e.target.value, 10) || 1)}
                                        className={'w-16 rounded-lg bg-neutral-950 border border-neutral-700 p-2 text-xs text-white text-center'}
                                    />
                                </div>
                                <button
                                    type={'button'}
                                    onClick={() => runAction(() => givePlayerItem(serverUuid, profile.name, giveItemId, giveItemCount), `Gave ${giveItemCount}x ${giveItemId} to ${profile.name}!`)}
                                    className={'mt-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 py-1.5 text-xs font-bold text-white transition'}
                                >
                                    Deliver Items
                                </button>
                            </div>

                            {/* Teleport Controls */}
                            <div className={'rounded-xl bg-neutral-900/80 p-4 border border-neutral-800 flex flex-col gap-2'}>
                                <span className={'font-bold text-white text-xs uppercase tracking-wider text-cyan-400'}>
                                    Teleport Coordinates
                                </span>
                                <div className={'grid grid-cols-3 gap-1.5'}>
                                    <input
                                        type={'text'}
                                        placeholder={'X'}
                                        value={tpX}
                                        onChange={(e) => setTpX(e.target.value)}
                                        className={'rounded-lg bg-neutral-950 border border-neutral-700 p-1.5 text-xs text-white text-center'}
                                    />
                                    <input
                                        type={'text'}
                                        placeholder={'Y'}
                                        value={tpY}
                                        onChange={(e) => setTpY(e.target.value)}
                                        className={'rounded-lg bg-neutral-950 border border-neutral-700 p-1.5 text-xs text-white text-center'}
                                    />
                                    <input
                                        type={'text'}
                                        placeholder={'Z'}
                                        value={tpZ}
                                        onChange={(e) => setTpZ(e.target.value)}
                                        className={'rounded-lg bg-neutral-950 border border-neutral-700 p-1.5 text-xs text-white text-center'}
                                    />
                                </div>
                                <div className={'flex gap-2 mt-1'}>
                                    <button
                                        type={'button'}
                                        onClick={() => runAction(() => sendServerCommand(serverUuid, `spawn ${profile.name}`), `Teleported ${profile.name} to spawn!`)}
                                        className={'flex-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 py-1.5 text-xs font-semibold text-neutral-300 transition'}
                                    >
                                        To Spawn
                                    </button>
                                    <button
                                        type={'button'}
                                        onClick={() => {
                                            if (!tpX || !tpY || !tpZ) return alert('Enter X, Y, and Z');
                                            runAction(
                                                () => teleportPlayerToCoords(serverUuid, profile.name, parseFloat(tpX), parseFloat(tpY), parseFloat(tpZ)),
                                                `Teleported ${profile.name} to ${tpX}, ${tpY}, ${tpZ}!`
                                            );
                                        }}
                                        className={'flex-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 py-1.5 text-xs font-bold text-white transition'}
                                    >
                                        Teleport
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer buttons */}
                    <div className={'mt-2 pt-3 border-t border-neutral-800 flex justify-end'}>
                        <button
                            type={'button'}
                            onClick={onDismiss}
                            className={'rounded-xl bg-neutral-800 hover:bg-neutral-700 px-5 py-2 text-xs font-semibold text-neutral-300 transition'}
                        >
                            Close Profile
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
