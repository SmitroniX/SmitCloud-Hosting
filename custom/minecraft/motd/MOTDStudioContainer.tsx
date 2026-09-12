import React, { useEffect, useRef, useState } from 'react';
import ServerContentBlock from '@/components/elements/ServerContentBlock';
import { ServerContext } from '@/state/server';
import useFlash from '@/plugins/useFlash';
import Spinner from '@/components/elements/Spinner';
import Input from '@/components/elements/Input';
import classNames from 'classnames';
import {
    SparklesIcon,
    PhotographIcon,
    RefreshIcon,
    CheckCircleIcon,
    UploadIcon,
    ColorSwatchIcon,
    ExclamationIcon,
} from '@heroicons/react/solid';
import {
    MOTDConfig,
    loadMotdConfig,
    saveMotdConfig,
    uploadServerIcon,
    minecraftColorMap,
} from '@/api/server/minecraft/motd';

const COLOR_BUTTONS = [
    { code: '&0', name: 'Black', color: '#000000' },
    { code: '&1', name: 'Dark Blue', color: '#0000AA' },
    { code: '&2', name: 'Dark Green', color: '#00AA00' },
    { code: '&3', name: 'Dark Aqua', color: '#00AAAA' },
    { code: '&4', name: 'Dark Red', color: '#AA0000' },
    { code: '&5', name: 'Dark Purple', color: '#AA00AA' },
    { code: '&6', name: 'Gold', color: '#FFAA00' },
    { code: '&7', name: 'Gray', color: '#AAAAAA' },
    { code: '&8', name: 'Dark Gray', color: '#555555' },
    { code: '&9', name: 'Blue', color: '#5555FF' },
    { code: '&a', name: 'Green', color: '#55FF55' },
    { code: '&b', name: 'Aqua', color: '#55FFFF' },
    { code: '&c', name: 'Red', color: '#FF5555' },
    { code: '&d', name: 'Light Purple', color: '#FF55FF' },
    { code: '&e', name: 'Yellow', color: '#FFFF55' },
    { code: '&f', name: 'White', color: '#FFFFFF' },
];

const FORMAT_BUTTONS = [
    { code: '&l', name: 'Bold', label: 'B' },
    { code: '&o', name: 'Italic', label: 'I' },
    { code: '&n', name: 'Underline', label: 'U' },
    { code: '&m', name: 'Strike', label: 'S' },
    { code: '&k', name: 'Magic', label: '?' },
    { code: '&r', name: 'Reset', label: 'R' },
];

const PRESET_MOTDS = [
    {
        title: 'Cyber / Modern SMP',
        line1: '&b&lSMITCLOUD &8| &fSurvival Multiplayer &7[&a1.21.1&7]',
        line2: '&e✦ &6Custom World &e✦ &aNo Lag &e✦ &dJoin Now!',
    },
    {
        title: 'Hardcore Survival',
        line1: '&4&lHARDCORE SMP &8» &7One Life, Ultimate Stakes',
        line2: '&c☠ &7PvP Enabled &8| &a24/7 Dedicated Server &c☠',
    },
    {
        title: 'Bedrock Crossplay',
        line1: '&a&lPLAY.SHADOWPIXEL.FUN &8[Java &amp; Bedrock]',
        line2: '&3⚡ &bGeyser Support &7&l» &eBedrock Port: 19132',
    },
];

export default () => {
    const server = ServerContext.useStoreState((state) => state.server.data!);
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);

    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [serverIconExists, setServerIconExists] = useState(false);
    const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);

    const [focusedInput, setFocusedInput] = useState<'line1' | 'line2'>('line1');

    useEffect(() => {
        loadData();
    }, [server.uuid]);

    const loadData = async () => {
        try {
            setLoading(true);
            clearFlashes('motd');
            const data = await loadMotdConfig(server.uuid);
            setLine1(data.line1);
            setLine2(data.line2);
            setServerIconExists(data.serverIconExists);
        } catch (error) {
            clearAndAddHttpError({ error, key: 'motd' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            clearFlashes('motd');
            await saveMotdConfig(server.uuid, line1, line2);
            addFlash({
                key: 'motd',
                type: 'success',
                message: '✅ MOTD saved to server.properties! Restart or run /reload to apply in-game.',
            });
        } catch (error) {
            clearAndAddHttpError({ error, key: 'motd' });
        } finally {
            setSaving(false);
        }
    };

    const insertCode = (code: string) => {
        if (focusedInput === 'line1') {
            setLine1((prev) => prev + code);
        } else {
            setLine2((prev) => prev + code);
        }
    };

    const handleIconSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                // Resize to 64x64 on client canvas
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.imageSmoothingEnabled = false; // crisp pixel art
                ctx.drawImage(img, 0, 0, 64, 64);

                canvas.toBlob(async (blob) => {
                    if (!blob) return;
                    try {
                        setUploadingIcon(true);
                        clearFlashes('motd');
                        const iconFile = new File([blob], 'server-icon.png', { type: 'image/png' });
                        await uploadServerIcon(server.uuid, iconFile);
                        setServerIconExists(true);
                        setIconPreviewUrl(canvas.toDataURL('image/png'));
                        addFlash({
                            key: 'motd',
                            type: 'success',
                            message: '✅ Server icon resized to 64x64 and saved as server-icon.png!',
                        });
                    } catch (error) {
                        clearAndAddHttpError({ error, key: 'motd' });
                    } finally {
                        setUploadingIcon(false);
                    }
                }, 'image/png');
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Parser for Minecraft colors & formatting
    const parseMinecraftText = (text: string) => {
        if (!text) return null;

        const parts: { text: string; color: string; bold: boolean; italic: boolean; underline: boolean }[] = [];
        let currentColor = '#ffffff';
        let currentBold = false;
        let currentItalic = false;
        let currentUnderline = false;
        let buffer = '';

        for (let i = 0; i < text.length; i++) {
            if ((text[i] === '&' || text[i] === '§') && i + 1 < text.length) {
                const code = text[i + 1].toLowerCase();
                if (buffer) {
                    parts.push({
                        text: buffer,
                        color: currentColor,
                        bold: currentBold,
                        italic: currentItalic,
                        underline: currentUnderline,
                    });
                    buffer = '';
                }

                if (minecraftColorMap[code]) {
                    currentColor = minecraftColorMap[code];
                    currentBold = false;
                    currentItalic = false;
                    currentUnderline = false;
                } else if (code === 'l') {
                    currentBold = true;
                } else if (code === 'o') {
                    currentItalic = true;
                } else if (code === 'n') {
                    currentUnderline = true;
                } else if (code === 'r') {
                    currentColor = '#ffffff';
                    currentBold = false;
                    currentItalic = false;
                    currentUnderline = false;
                }
                i++; // skip code char
            } else {
                buffer += text[i];
            }
        }

        if (buffer) {
            parts.push({
                text: buffer,
                color: currentColor,
                bold: currentBold,
                italic: currentItalic,
                underline: currentUnderline,
            });
        }

        return parts.map((p, idx) => (
            <span
                key={idx}
                style={{
                    color: p.color,
                    fontWeight: p.bold ? 'bold' : 'normal',
                    fontStyle: p.italic ? 'italic' : 'normal',
                    textDecoration: p.underline ? 'underline' : 'none',
                    fontFamily: 'monospace, "Courier New", Courier',
                }}
            >
                {p.text}
            </span>
        ));
    };

    return (
        <ServerContentBlock title={'MOTD & Server Icon Studio'} showFlashKey={'motd'}>
            <div className={'flex flex-col gap-6'}>
                {/* Header Card */}
                <div className={'relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0a0f1d]/90 p-6 shadow-2xl backdrop-blur-xl'}>
                    <div className={'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl'} />
                    <div className={'pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl'} />

                    <div className={'relative flex flex-col md:flex-row md:items-center md:justify-between gap-6'}>
                        <div className={'flex items-start gap-4'}>
                            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25 text-white'}>
                                <ColorSwatchIcon className={'h-7 w-7'} />
                            </div>
                            <div>
                                <div className={'flex flex-wrap items-center gap-2'}>
                                    <h1 className={'text-xl sm:text-2xl font-black tracking-tight text-white'}>
                                        MOTD &amp; Server Icon Studio
                                    </h1>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30'}>
                                        <SparklesIcon className={'h-3.5 w-3.5'} />
                                        MULTIPLAYER BRANDING
                                    </span>
                                </div>
                                <p className={'mt-1 text-xs sm:text-sm text-neutral-400'}>
                                    Customize your 2-line in-game MOTD with colors, format codes, and upload a custom 64x64 server-icon.png with live Minecraft preview.
                                </p>
                            </div>
                        </div>

                        <div className={'flex items-center gap-3 shrink-0'}>
                            <button
                                type={'button'}
                                onClick={handleSave}
                                disabled={saving}
                                className={'rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-5 py-2.5 text-xs shadow-lg shadow-amber-500/20 transition'}
                            >
                                {saving ? 'Saving MOTD...' : '💾 Save MOTD'}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className={'py-16 text-center'}>
                        <Spinner size={'large'} centered />
                    </div>
                ) : (
                    <div className={'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
                        {/* Left 7 cols: Editor & Tools */}
                        <div className={'lg:col-span-7 flex flex-col gap-6'}>
                            {/* In-Game Live Multiplayer Server List Preview */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                <h3 className={'text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between'}>
                                    <span>Minecraft Multiplayer Menu Preview</span>
                                    <span className={'text-[10px] text-emerald-400 font-mono'}>● 1.21.1 Compatible</span>
                                </h3>

                                {/* Multiplayer Row Simulation */}
                                <div className={'rounded-xl border border-neutral-800 bg-[#12141a] p-4 font-mono shadow-inner flex items-start gap-4'}>
                                    {/* 64x64 Server Icon */}
                                    <div className={'relative group'}>
                                        {iconPreviewUrl ? (
                                            <img
                                                src={iconPreviewUrl}
                                                alt={'Server Icon'}
                                                className={'h-16 w-16 shrink-0 rounded border border-neutral-700 bg-neutral-900 object-cover image-render-pixel'}
                                            />
                                        ) : serverIconExists ? (
                                            <img
                                                src={`/api/client/servers/${server.uuid}/files/contents?file=%2Fserver-icon.png`}
                                                alt={'Server Icon'}
                                                className={'h-16 w-16 shrink-0 rounded border border-neutral-700 bg-neutral-900 object-cover image-render-pixel'}
                                                onError={(e: any) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-3xl shadow'}>
                                                🟩
                                            </div>
                                        )}

                                        <button
                                            type={'button'}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={'absolute inset-0 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] text-white font-sans font-bold'}
                                        >
                                            Change
                                        </button>
                                    </div>

                                    {/* Text Info */}
                                    <div className={'min-w-0 flex-1 flex flex-col justify-between h-16'}>
                                        <div className={'flex items-center justify-between'}>
                                            <span className={'text-sm font-bold text-white tracking-wide truncate'}>
                                                {server.name}
                                            </span>
                                            <div className={'flex items-center gap-2 text-xs text-neutral-400'}>
                                                <span className={'text-[11px] text-neutral-400'}>50/100</span>
                                                {/* Green signal bars */}
                                                <div className={'flex items-end gap-0.5 h-3'}>
                                                    <span className={'w-1 h-1 bg-emerald-400 rounded-sm'} />
                                                    <span className={'w-1 h-1.5 bg-emerald-400 rounded-sm'} />
                                                    <span className={'w-1 h-2 bg-emerald-400 rounded-sm'} />
                                                    <span className={'w-1 h-2.5 bg-emerald-400 rounded-sm'} />
                                                    <span className={'w-1 h-3 bg-emerald-400 rounded-sm'} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Line 1 Preview */}
                                        <div className={'text-xs truncate h-5 leading-5'}>
                                            {parseMinecraftText(line1) || <span className={'text-neutral-500'}>Line 1 text...</span>}
                                        </div>

                                        {/* Line 2 Preview */}
                                        <div className={'text-xs truncate h-5 leading-5'}>
                                            {parseMinecraftText(line2) || <span className={'text-neutral-500'}>Line 2 text...</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* MOTD Inputs */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md flex flex-col gap-4'}>
                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        MOTD Line 1
                                    </label>
                                    <Input
                                        value={line1}
                                        onChange={(e) => setLine1(e.target.value)}
                                        onFocus={() => setFocusedInput('line1')}
                                        placeholder={'&b&lSMITCLOUD &8| &fMinecraft Server'}
                                    />
                                </div>

                                <div>
                                    <label className={'block text-xs font-semibold text-neutral-300 mb-1'}>
                                        MOTD Line 2
                                    </label>
                                    <Input
                                        value={line2}
                                        onChange={(e) => setLine2(e.target.value)}
                                        onFocus={() => setFocusedInput('line2')}
                                        placeholder={'&e✦ &6Survival &e✦ &aNo Lag &e✦ &dJoin Now!'}
                                    />
                                </div>

                                {/* Color & Format Palette */}
                                <div className={'mt-2 pt-3 border-t border-neutral-800'}>
                                    <span className={'text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2'}>
                                        Click to Insert Formatting Code (into {focusedInput.toUpperCase()})
                                    </span>

                                    <div className={'flex flex-wrap gap-1.5 mb-3'}>
                                        {COLOR_BUTTONS.map((c) => (
                                            <button
                                                key={c.code}
                                                type={'button'}
                                                onClick={() => insertCode(c.code)}
                                                className={'flex items-center gap-1 px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] font-mono transition'}
                                                title={c.name}
                                            >
                                                <span className={'h-2.5 w-2.5 rounded-full border border-neutral-600'} style={{ backgroundColor: c.color }} />
                                                <span className={'text-neutral-300'}>{c.code}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className={'flex flex-wrap gap-1.5'}>
                                        {FORMAT_BUTTONS.map((f) => (
                                            <button
                                                key={f.code}
                                                type={'button'}
                                                onClick={() => insertCode(f.code)}
                                                className={'px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] font-mono font-bold text-white border border-neutral-600 transition'}
                                                title={f.name}
                                            >
                                                {f.code} ({f.label})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right 5 cols: Server Icon Upload & Presets */}
                        <div className={'lg:col-span-5 flex flex-col gap-6'}>
                            {/* Server Icon Uploader */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                <h3 className={'text-base font-bold text-white flex items-center gap-2 mb-2'}>
                                    <PhotographIcon className={'h-5 w-5 text-amber-400'} />
                                    Server Icon (64x64 PNG)
                                </h3>
                                <p className={'text-xs text-neutral-400 mb-4'}>
                                    Upload any image — we automatically resize, center, and crop it to the exact 64x64 PNG format required by Minecraft.
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type={'file'}
                                    accept={'image/*'}
                                    onChange={handleIconSelected}
                                    className={'hidden'}
                                />

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={'border-2 border-dashed border-neutral-700 hover:border-amber-400 rounded-xl p-6 text-center cursor-pointer bg-neutral-900/40 hover:bg-neutral-900/70 transition'}
                                >
                                    <UploadIcon className={'mx-auto h-8 w-8 text-neutral-400'} />
                                    <p className={'text-xs font-bold text-white mt-2'}>
                                        {uploadingIcon ? 'Processing & Uploading...' : 'Click to Upload Server Icon'}
                                    </p>
                                    <p className={'text-[10px] text-neutral-500 mt-1'}>
                                        PNG, JPG, or GIF (Auto-scaled to 64x64)
                                    </p>
                                </div>
                            </div>

                            {/* Preset MOTDs */}
                            <div className={'rounded-2xl border border-neutral-800 bg-[#0a0f1d]/80 p-5 backdrop-blur-md'}>
                                <h3 className={'text-base font-bold text-white flex items-center gap-2 mb-3'}>
                                    <SparklesIcon className={'h-5 w-5 text-indigo-400'} />
                                    Quick MOTD Presets
                                </h3>

                                <div className={'flex flex-col gap-2.5'}>
                                    {PRESET_MOTDS.map((p, i) => (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setLine1(p.line1);
                                                setLine2(p.line2);
                                            }}
                                            className={'p-3 rounded-xl border border-neutral-800 bg-neutral-900/60 hover:border-amber-500/40 hover:bg-neutral-800/80 cursor-pointer transition'}
                                        >
                                            <p className={'text-xs font-bold text-amber-300'}>{p.title}</p>
                                            <p className={'text-[11px] font-mono text-neutral-400 mt-1 truncate'}>{p.line1}</p>
                                            <p className={'text-[11px] font-mono text-neutral-500 truncate'}>{p.line2}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ServerContentBlock>
    );
};
