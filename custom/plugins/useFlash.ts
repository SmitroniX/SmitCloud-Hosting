import { Actions, useStoreActions } from 'easy-peasy';
import { FlashStore } from '@/state/flashes';
import { ApplicationStore } from '@/state';

import { FlashMessageType } from '@/components/MessageBox';

interface KeyedFlashStore {
    addError: (message: string, title?: string) => void;
    addFlash: (flash: { message: string; title?: string; type?: FlashMessageType }) => void;
    clearFlashes: () => void;
    clearAndAddHttpError: (error?: Error | any | null) => void;
}

const useFlash = (): Actions<FlashStore> => {
    return useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
};

const useFlashKey = (key: string): KeyedFlashStore => {
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    return {
        addError: (message, title) => addFlash({ key, message, title, type: 'error' }),
        addFlash: ({ message, title, type = 'info' }) => addFlash({ key, message, title, type }),
        clearFlashes: () => clearFlashes(key),
        clearAndAddHttpError: (error) => clearAndAddHttpError({ key, error }),
    };
};

export { useFlashKey };
export default useFlash;
