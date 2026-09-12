import React, { memo, useCallback, useState } from 'react';
import isEqual from 'react-fast-compare';
import tw from 'twin.macro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNetworkWired } from '@fortawesome/free-solid-svg-icons';
import InputSpinner from '@/components/elements/InputSpinner';
import { Textarea } from '@/components/elements/Input';
import Can from '@/components/elements/Can';
import { Button } from '@/components/elements/button/index';
import GreyRowBox from '@/components/elements/GreyRowBox';
import { Allocation } from '@/api/server/getServer';
import styled from 'styled-components/macro';
import { debounce } from 'debounce';
import setServerAllocationNotes from '@/api/server/network/setServerAllocationNotes';
import { useFlashKey } from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import CopyOnClick from '@/components/elements/CopyOnClick';
import DeleteAllocationButton from '@/components/server/network/DeleteAllocationButton';
import setPrimaryServerAllocation from '@/api/server/network/setPrimaryServerAllocation';
import getServerAllocations from '@/api/swr/getServerAllocations';
import { ip } from '@/lib/formatters';
import Code from '@/components/elements/Code';
import { detectPortRole, syncBedrockPortToGeyser, syncJavaPortToProperties } from '@/api/server/minecraft/portSync';

const Label = styled.label`
    ${tw`uppercase text-xs mt-1 text-neutral-400 block px-1 select-none transition-colors duration-150`}
`;

interface Props {
    allocation: Allocation;
}

const AllocationRow = ({ allocation }: Props) => {
    const [loading, setLoading] = useState(false);
    const [currentNote, setCurrentNote] = useState(allocation.notes || '');
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlashKey('server:network');
    const uuid = ServerContext.useStoreState((state) => state.server.data!.uuid);
    const { mutate } = getServerAllocations();

    const roleInfo = detectPortRole(allocation);

    const onNotesChanged = useCallback((id: number, notes: string) => {
        setCurrentNote(notes);
        mutate((data) => data?.map((a) => (a.id === id ? { ...a, notes } : a)), false);
    }, []);

    const setAllocationNotes = debounce((notes: string) => {
        setLoading(true);
        clearFlashes();

        setServerAllocationNotes(uuid, allocation.id, notes)
            .then(() => onNotesChanged(allocation.id, notes))
            .catch((error) => clearAndAddHttpError(error))
            .then(() => setLoading(false));
    }, 750);

    const applyQuickPreset = async (presetText: string) => {
        setLoading(true);
        clearFlashes();
        try {
            await setServerAllocationNotes(uuid, allocation.id, presetText);
            onNotesChanged(allocation.id, presetText);

            if (presetText.toLowerCase().includes('bedrock') || presetText.toLowerCase().includes('geyser')) {
                await syncBedrockPortToGeyser(uuid, allocation.port);
                addFlash({
                    type: 'success',
                    message: `📱 Port ${allocation.port} tagged as Bedrock and synced to Geyser config!`,
                });
            } else {
                addFlash({
                    type: 'success',
                    message: `Note updated to "${presetText}"`,
                });
            }
        } catch (error) {
            clearAndAddHttpError(error);
        } finally {
            setLoading(false);
        }
    };

    const setPrimaryAllocation = async () => {
        clearFlashes();
        mutate((data) => data?.map((a) => ({ ...a, isDefault: a.id === allocation.id })), false);

        try {
            await setPrimaryServerAllocation(uuid, allocation.id);
            // Automatically sync with server.properties
            await syncJavaPortToProperties(uuid, allocation.port);
            addFlash({
                type: 'success',
                message: `☕ Port ${allocation.port} set as Primary Java port and synced to server.properties!`,
            });
        } catch (error) {
            clearAndAddHttpError(error);
            mutate();
        }
    };

    const setAsBedrock = async () => {
        await applyQuickPreset('Bedrock / Geyser (UDP)');
    };

    return (
        <GreyRowBox $hoverable={false} className={'flex-wrap md:flex-nowrap mt-2.5 border border-white/5 hover:border-white/10 transition-colors'}>
            <div className={'flex items-center w-full md:w-auto'}>
                <div className={'pl-4 pr-5 text-neutral-400'}>
                    <FontAwesomeIcon icon={faNetworkWired} className={'text-cyan-400/70'} />
                </div>
                <div className={'mr-4 flex-1 md:w-44'}>
                    {allocation.alias ? (
                        <CopyOnClick text={allocation.alias}>
                            <Code dark className={'w-44 truncate'}>
                                {allocation.alias}
                            </Code>
                        </CopyOnClick>
                    ) : (
                        <CopyOnClick text={ip(allocation.ip)}>
                            <Code dark>{ip(allocation.ip)}</Code>
                        </CopyOnClick>
                    )}
                    <div className={'flex items-center justify-between'}>
                        <Label>{allocation.alias ? 'Hostname' : 'IP Address'}</Label>
                        <span className={'text-[10px] text-neutral-400'}>{roleInfo.protocol}</span>
                    </div>
                </div>
                <div className={'w-20 md:w-28 overflow-hidden mr-3'}>
                    <CopyOnClick text={String(allocation.port)}>
                        <Code dark>{allocation.port}</Code>
                    </CopyOnClick>
                    <div className={'flex items-center gap-1 mt-1'}>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${roleInfo.bgColor} ${roleInfo.textColor} border ${roleInfo.borderColor}`}>
                            <span>{roleInfo.icon}</span>
                            <span className={'truncate'}>{roleInfo.label}</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className={'mt-3 w-full md:mt-0 md:flex-1 md:w-auto'}>
                <InputSpinner visible={loading}>
                    <Textarea
                        className={'bg-neutral-800/90 hover:border-neutral-600 border-transparent text-xs py-1.5'}
                        rows={1}
                        placeholder={'Add notes for this port allocation (e.g. Bedrock, Dynmap, Voice)'}
                        value={currentNote}
                        onChange={(e) => {
                            setCurrentNote(e.currentTarget.value);
                            setAllocationNotes(e.currentTarget.value);
                        }}
                    />
                </InputSpinner>
                {/* Preset Chips for 1-click tagging */}
                <div className={'flex flex-wrap items-center gap-1.5 mt-1.5'}>
                    <span className={'text-[10px] text-neutral-400 mr-1 select-none'}>Quick Tag:</span>
                    <button
                        type={'button'}
                        onClick={() => applyQuickPreset('Bedrock / Geyser (UDP)')}
                        className={'px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition'}
                    >
                        📱 Bedrock (UDP)
                    </button>
                    <button
                        type={'button'}
                        onClick={() => applyQuickPreset('Minecraft Java (TCP)')}
                        className={'px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition'}
                    >
                        ☕ Java (TCP)
                    </button>
                    <button
                        type={'button'}
                        onClick={() => applyQuickPreset('Simple Voice Chat (UDP)')}
                        className={'px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition'}
                    >
                        🎙️ Voice Chat
                    </button>
                    <button
                        type={'button'}
                        onClick={() => applyQuickPreset('Dynmap / Web Map (TCP)')}
                        className={'px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition'}
                    >
                        🗺️ Web Map
                    </button>
                </div>
            </div>

            <div className={'flex items-center justify-end space-x-2 mt-3 w-full md:mt-0 md:w-auto md:pl-4'}>
                {allocation.isDefault ? (
                    <Button size={Button.Sizes.Small} className={'!text-white !bg-blue-600/90 font-semibold cursor-default text-xs'} disabled>
                        ☕ Java Primary
                    </Button>
                ) : (
                    <>
                        <Can action={'allocation.update'}>
                            {roleInfo.role !== 'bedrock' && (
                                <button
                                    type={'button'}
                                    onClick={setAsBedrock}
                                    className={'px-2 py-1 rounded-md text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition whitespace-nowrap'}
                                    title={'Set as Bedrock crossplay port and sync to Geyser'}
                                >
                                    Set as Bedrock
                                </button>
                            )}
                            <Button.Text size={Button.Sizes.Small} onClick={setPrimaryAllocation} className={'whitespace-nowrap text-xs'}>
                                Make Primary
                            </Button.Text>
                        </Can>
                        <Can action={'allocation.delete'}>
                            <DeleteAllocationButton allocation={allocation.id} />
                        </Can>
                    </>
                )}
            </div>
        </GreyRowBox>
    );
};

export default memo(AllocationRow, isEqual);
