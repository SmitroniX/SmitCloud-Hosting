import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ITerminalOptions, Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { SearchBarAddon } from 'xterm-addon-search-bar';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { ScrollDownHelperAddon } from '@/plugins/XtermScrollDownHelperAddon';
import SpinnerOverlay from '@/components/elements/SpinnerOverlay';
import { ServerContext } from '@/state/server';
import { usePermissions } from '@/plugins/usePermissions';
import { theme as th } from 'twin.macro';
import useEventListener from '@/plugins/useEventListener';
import { debounce } from 'debounce';
import { usePersistedState } from '@/plugins/usePersistedState';
import { SocketEvent, SocketRequest } from '@/components/server/events';
import classNames from 'classnames';
import { ChevronDoubleRightIcon, LightningBoltIcon, PaperAirplaneIcon, SearchIcon, TerminalIcon, TrashIcon } from '@heroicons/react/solid';

import 'xterm/css/xterm.css';
import styles from './style.module.css';

const theme = {
    background: '#05070d',
    cursor: '#38bdf8',
    cursorAccent: '#05070d',
    black: '#0f172a',
    red: '#f87171',
    green: '#4ade80',
    yellow: '#facc15',
    blue: '#60a5fa',
    magenta: '#c084fc',
    cyan: '#38bdf8',
    white: '#f1f5f9',
    brightBlack: '#475569',
    brightRed: '#ef4444',
    brightGreen: '#22c55e',
    brightYellow: '#eab308',
    brightBlue: '#3b82f6',
    brightMagenta: '#a855f7',
    brightCyan: '#06b6d4',
    brightWhite: '#ffffff',
    selection: 'rgba(56, 189, 248, 0.3)',
};

const terminalProps: ITerminalOptions = {
    disableStdin: true,
    cursorStyle: 'underline',
    allowTransparency: true,
    fontSize: 12,
    fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
    lineHeight: 1.25,
    rows: 30,
    scrollback: 5000,
    scrollSensitivity: 1,
    theme: theme,
};

export default () => {
    const TERMINAL_PRELUDE = '\u001b[1m\u001b[33mcontainer@pterodactyl~ \u001b[0m';
    const ref = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const terminal = useMemo(() => new Terminal({ ...terminalProps }), []);
    const fitAddon = useMemo(() => new FitAddon(), []);
    const searchAddon = useMemo(() => new SearchAddon(), []);
    const searchBar = useMemo(() => new SearchBarAddon({ searchAddon }), [searchAddon]);
    const webLinksAddon = useMemo(() => new WebLinksAddon(), []);
    const unicode11Addon = useMemo(() => new Unicode11Addon(), []);
    const scrollDownHelperAddon = useMemo(() => new ScrollDownHelperAddon(), []);
    const { connected, instance } = ServerContext.useStoreState((state) => state.socket);
    const [canSendCommands] = usePermissions(['control.console']);
    const serverId = ServerContext.useStoreState((state) => state.server.data!.id);
    const isTransferring = ServerContext.useStoreState((state) => state.server.data!.isTransferring);
    const [history, setHistory] = usePersistedState<string[]>(`${serverId}:command_history`, []);
    const [historyIndex, setHistoryIndex] = useState(-1);
    // SearchBarAddon has hardcoded z-index: 999 :(
    const zIndex = `
    .xterm-search-bar__addon {
        z-index: 20;
    }`;

    const handleClear = () => {
        terminal.clear();
    };

    const handleSearch = () => {
        try {
            searchBar.show();
        } catch (e) {}
    };

    const sendCommand = (cmd?: string) => {
        const command = cmd !== undefined ? cmd : (inputRef.current?.value || '');
        if (command.trim().length > 0) {
            setHistory((prevHistory) => [command, ...prevHistory!].slice(0, 32));
            setHistoryIndex(-1);

            instance && instance.send('send command', command);
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        }
    };

    const handleConsoleOutput = (line: string, prelude = false) =>
        terminal.writeln((prelude ? TERMINAL_PRELUDE : '') + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m');

    const handleTransferStatus = (status: string) => {
        switch (status) {
            // Sent by either the source or target node if a failure occurs.
            case 'failure':
                terminal.writeln(TERMINAL_PRELUDE + 'Transfer has failed.\u001b[0m');
                return;
        }
    };

    const handleDaemonErrorOutput = (line: string) =>
        terminal.writeln(
            TERMINAL_PRELUDE + '\u001b[1m\u001b[41m' + line.replace(/(?:\r\n|\r|\n)$/im, '') + '\u001b[0m'
        );

    const handlePowerChangeEvent = (state: string) =>
        terminal.writeln(TERMINAL_PRELUDE + 'Server marked as ' + state + '...\u001b[0m');

    const handleCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            const newIndex = Math.min(historyIndex + 1, history!.length - 1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';

            // By default up arrow will also bring the cursor to the start of the line,
            // so we'll preventDefault to keep it at the end.
            e.preventDefault();
        }

        if (e.key === 'ArrowDown') {
            const newIndex = Math.max(historyIndex - 1, -1);

            setHistoryIndex(newIndex);
            e.currentTarget.value = history![newIndex] || '';
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            sendCommand(e.currentTarget.value);
        }
    };

    useEffect(() => {
        if (connected && ref.current && !terminal.element) {
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(searchAddon);
            terminal.loadAddon(searchBar);
            terminal.loadAddon(webLinksAddon);
            terminal.loadAddon(unicode11Addon);
            terminal.loadAddon(scrollDownHelperAddon);

            terminal.open(ref.current);

            // Activate Unicode 11 for proper emoji and special character width handling
            terminal.unicode.activeVersion = '11';

            if (terminal.element) {
                terminal.element.style.overscrollBehavior = 'contain';
                terminal.element.style.touchAction = 'none';
            }

            setTimeout(() => {
                try {
                    fitAddon.fit();
                } catch (e) {}
            }, 50);

            searchBar.addNewStyle(zIndex);

            // Add support for capturing keys
            terminal.attachCustomKeyEventHandler((e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                    document.execCommand('copy');
                    return false;
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    searchBar.show();
                    return false;
                } else if (e.key === 'Escape') {
                    searchBar.hidden();
                }
                return true;
            });
        }
    }, [terminal, connected]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        let startY = 0;

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches && e.touches.length > 0) {
                startY = e.touches[0].pageY;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (e.cancelable) {
                e.preventDefault();
            }
            e.stopPropagation();

            if (e.touches && e.touches.length > 0 && terminal.element) {
                const currentY = e.touches[0].pageY;
                const deltaY = startY - currentY;
                startY = currentY;

                const target = e.target as HTMLElement | null;
                if (target && !target.closest('.xterm-screen') && !target.closest('.xterm-viewport')) {
                    const viewport = terminal.element.querySelector('.xterm-viewport');
                    if (viewport && deltaY !== 0) {
                        viewport.scrollTop += deltaY;
                    }
                }
            }
        };

        const onWheel = (e: WheelEvent) => {
            if (e.cancelable) {
                e.preventDefault();
            }
            e.stopPropagation();

            const target = e.target as HTMLElement | null;
            if (target && !target.closest('.xterm-screen') && !target.closest('.xterm-viewport') && terminal.element) {
                const viewport = terminal.element.querySelector('.xterm-viewport');
                if (viewport && e.deltaY !== 0) {
                    viewport.scrollTop += e.deltaY;
                }
            }
        };

        el.addEventListener('touchstart', onTouchStart, { passive: true });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('wheel', onWheel);
        };
    }, [terminal]);

    useEffect(() => {
        if (!ref.current || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(
            debounce(() => {
                if (terminal.element) {
                    try {
                        fitAddon.fit();
                    } catch (e) {}
                }
            }, 100)
        );

        observer.observe(ref.current);

        return () => {
            observer.disconnect();
        };
    }, [terminal, fitAddon]);

    useEventListener(
        'resize',
        debounce(() => {
            if (terminal.element) {
                try {
                    fitAddon.fit();
                } catch (e) {}
            }
        }, 100)
    );

    useEffect(() => {
        const listeners: Record<string, (s: string) => void> = {
            [SocketEvent.STATUS]: handlePowerChangeEvent,
            [SocketEvent.CONSOLE_OUTPUT]: handleConsoleOutput,
            [SocketEvent.INSTALL_OUTPUT]: handleConsoleOutput,
            [SocketEvent.TRANSFER_LOGS]: handleConsoleOutput,
            [SocketEvent.TRANSFER_STATUS]: handleTransferStatus,
            [SocketEvent.DAEMON_MESSAGE]: (line) => handleConsoleOutput(line, true),
            [SocketEvent.DAEMON_ERROR]: handleDaemonErrorOutput,
        };

        if (connected && instance) {
            // Do not clear the console if the server is being transferred.
            if (!isTransferring) {
                terminal.clear();
            }

            Object.keys(listeners).forEach((key: string) => {
                instance.addListener(key, listeners[key]);
            });
            instance.send(SocketRequest.SEND_LOGS);
        }

        return () => {
            if (instance) {
                Object.keys(listeners).forEach((key: string) => {
                    instance.removeListener(key, listeners[key]);
                });
            }
        };
    }, [connected, instance]);

    return (
        <div className={classNames(styles.terminal, 'relative')}>
            <SpinnerOverlay visible={!connected} size={'large'} />

            {/* Terminal Window Header Bar */}
            <div className={'flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-[#0a0f1d] border-b border-cyan-500/20 text-xs select-none'}>
                {/* Left: macOS window controls + Terminal branding */}
                <div className={'flex items-center space-x-2'}>
                    <div className={'flex items-center space-x-1.5 mr-1 sm:mr-2'}>
                        <span className={'w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_6px_rgba(239,68,68,0.6)] inline-block'} />
                        <span className={'w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_6px_rgba(245,158,11,0.6)] inline-block'} />
                        <span className={'w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.6)] inline-block'} />
                    </div>
                    <span className={'text-gray-400 font-mono text-[11px] sm:text-xs flex items-center gap-1.5'}>
                        <TerminalIcon className={'w-3.5 h-3.5 text-cyan-400 inline'} />
                        <span className={'hidden sm:inline text-gray-500'}>server@pterodactyl:</span>
                        <span className={'text-cyan-300 font-semibold'}>~</span>
                        <span className={'text-gray-300 font-mono'}>console</span>
                    </span>
                </div>

                {/* Right: Actions + Live Status indicator */}
                <div className={'flex items-center space-x-2'}>
                    <button
                        type={'button'}
                        onClick={handleSearch}
                        title={'Search in console (Ctrl+F)'}
                        aria-label={'Search in console'}
                        className={'text-gray-400 hover:text-cyan-400 p-1 rounded hover:bg-white/5 transition-colors'}
                    >
                        <SearchIcon className={'w-3.5 h-3.5'} />
                    </button>
                    <button
                        type={'button'}
                        onClick={handleClear}
                        title={'Clear console'}
                        aria-label={'Clear console'}
                        className={'text-gray-400 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors'}
                    >
                        <TrashIcon className={'w-3.5 h-3.5'} />
                    </button>
                    <div
                        className={classNames(
                            'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-medium border',
                            connected
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                        )}
                    >
                        <span
                            className={classNames(
                                'w-1.5 h-1.5 rounded-full',
                                connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                            )}
                        />
                        <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
                    </div>
                </div>
            </div>

            {/* Terminal Body */}
            <div
                ref={containerRef}
                className={classNames(styles.container, { 'rounded-b-2xl': !canSendCommands })}
            >
                <div className={'h-full'}>
                    <div id={styles.terminal} ref={ref} />
                </div>
            </div>

            {/* Quick Command Bar */}
            {canSendCommands && (
                <div className={'flex items-center gap-1.5 px-3 py-1.5 bg-[#080d19] border-t border-cyan-500/15 overflow-x-auto no-scrollbar text-xs select-none'}>
                    <span className={'text-[10px] font-mono text-cyan-400/80 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1 font-bold'}>
                        <LightningBoltIcon className={'w-3 h-3 text-cyan-400'} /> Quick:
                    </span>
                    {[
                        { label: '⚡ TPS', cmd: 'tps' },
                        { label: '📊 Spark Health', cmd: 'spark healthreport' },
                        { label: '☀️ Day', cmd: 'time set day' },
                        { label: '🌙 Night', cmd: 'time set night' },
                        { label: '🌧️ Clear Weather', cmd: 'weather clear' },
                        { label: '⚔️ Survival', cmd: 'gamemode survival @a' },
                        { label: '🎨 Creative', cmd: 'gamemode creative @p' },
                        { label: '💾 Save All', cmd: 'save-all' },
                        { label: '🔄 Reload', cmd: 'reload confirm' },
                        { label: '👥 Players', cmd: 'list' },
                    ].map((item) => (
                        <button
                            key={item.cmd}
                            type={'button'}
                            disabled={!instance || !connected}
                            onClick={() => sendCommand(item.cmd)}
                            className={'shrink-0 px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-gray-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 text-[11px] font-mono transition-all duration-150 disabled:opacity-40 active:scale-95'}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Command Input Bar */}
            {canSendCommands && (
                <div className={'relative w-full border-t border-cyan-500/20 bg-[#0a0f1d]'}>
                    <div className={'absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400 select-none z-10'}>
                        <ChevronDoubleRightIcon className={'w-4 h-4'} />
                    </div>
                    <input
                        ref={inputRef}
                        className={classNames('peer', styles.command_input)}
                        type={'text'}
                        placeholder={'Type a command...'}
                        aria-label={'Console command input.'}
                        disabled={!instance || !connected}
                        onKeyDown={handleCommandKeyDown}
                        autoCorrect={'off'}
                        autoCapitalize={'none'}
                    />
                    <button
                        type={'button'}
                        title={'Send Command'}
                        aria-label={'Send Command'}
                        disabled={!instance || !connected}
                        onClick={() => sendCommand()}
                        className={classNames(
                            'absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg',
                            'text-cyan-400 hover:text-white hover:bg-cyan-500/25 active:scale-95 transition-all duration-150',
                            'disabled:opacity-30 disabled:pointer-events-none'
                        )}
                    >
                        <PaperAirplaneIcon className={'w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-90'} />
                    </button>
                </div>
            )}
        </div>
    );
};
