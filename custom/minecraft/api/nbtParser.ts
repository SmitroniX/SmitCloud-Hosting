/**
 * Pure TypeScript Minecraft NBT (Named Binary Tag) Parser & Gzip Decompressor
 * Runs directly in modern browsers without external binary dependencies.
 */

export interface PlayerInventoryItem {
    slot: number; // 0-8: Hotbar, 9-35: Main, 100-103: Armor, -106: Off-hand
    id: string; // e.g. "minecraft:diamond_sword"
    count: number;
    displayName?: string;
    damage?: number;
    enchantments?: { id: string; lvl: number }[];
}

export interface PlayerProfileData {
    uuid: string;
    name: string;
    isOnline: boolean;
    dimension: string;
    pos: [number, number, number];
    rotation: [number, number];
    health: number;
    maxHealth: number;
    foodLevel: number;
    foodSaturationLevel: number;
    xpLevel: number;
    xpProgress: number;
    gameMode: number; // 0=Survival, 1=Creative, 2=Adventure, 3=Spectator
    spawnPos?: [number, number, number];
    spawnDimension?: string;
    inventory: PlayerInventoryItem[];
    enderItems: PlayerInventoryItem[];
    firstPlayed?: number;
    lastPlayed?: number;
}

class NBTReader {
    private view: DataView;
    private pos = 0;
    private textDecoder = new TextDecoder('utf-8');

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    private readByte(): number {
        const val = this.view.getInt8(this.pos);
        this.pos += 1;
        return val;
    }

    private readShort(): number {
        const val = this.view.getInt16(this.pos, false);
        this.pos += 2;
        return val;
    }

    private readInt(): number {
        const val = this.view.getInt32(this.pos, false);
        this.pos += 4;
        return val;
    }

    private readLong(): number {
        const high = this.view.getInt32(this.pos, false);
        const low = this.view.getUint32(this.pos + 4, false);
        this.pos += 8;
        return high * 4294967296 + low;
    }

    private readFloat(): number {
        const val = this.view.getFloat32(this.pos, false);
        this.pos += 4;
        return val;
    }

    private readDouble(): number {
        const val = this.view.getFloat64(this.pos, false);
        this.pos += 8;
        return val;
    }

    private readString(): string {
        const length = this.readShort();
        if (length <= 0) return '';
        const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.pos, length);
        this.pos += length;
        return this.textDecoder.decode(bytes);
    }

    public readTag(type: number): any {
        switch (type) {
            case 1: return this.readByte();
            case 2: return this.readShort();
            case 3: return this.readInt();
            case 4: return this.readLong();
            case 5: return this.readFloat();
            case 6: return this.readDouble();
            case 7: {
                const len = this.readInt();
                this.pos += Math.max(0, len);
                return [];
            }
            case 8: return this.readString();
            case 9: {
                const elemType = this.readByte();
                const len = this.readInt();
                const list: any[] = [];
                for (let i = 0; i < len; i++) {
                    list.push(this.readTag(elemType));
                }
                return list;
            }
            case 10: {
                const obj: Record<string, any> = {};
                while (true) {
                    if (this.pos >= this.view.byteLength) break;
                    const tagType = this.readByte();
                    if (tagType === 0) break; // TAG_End
                    const name = this.readString();
                    obj[name] = this.readTag(tagType);
                }
                return obj;
            }
            case 11: {
                const len = this.readInt();
                this.pos += Math.max(0, len * 4);
                return [];
            }
            case 12: {
                const len = this.readInt();
                this.pos += Math.max(0, len * 8);
                return [];
            }
            default:
                return null;
        }
    }
}

/**
 * Decompress gzipped ArrayBuffer using modern native DecompressionStream
 */
export const decompressGzip = async (compressedData: ArrayBuffer): Promise<ArrayBuffer> => {
    if (typeof DecompressionStream !== 'undefined') {
        const stream = new Response(compressedData).body?.pipeThrough(new DecompressionStream('gzip'));
        if (stream) {
            return await new Response(stream).arrayBuffer();
        }
    }
    // Fallback if not gzipped (raw uncompressed NBT)
    return compressedData;
};

/**
 * Parse raw or gzipped player .dat ArrayBuffer into structured PlayerProfileData
 */
export const parsePlayerDat = async (
    rawData: ArrayBuffer,
    uuid: string,
    name: string,
    isOnline = false
): Promise<PlayerProfileData> => {
    let decompressed: ArrayBuffer;
    try {
        decompressed = await decompressGzip(rawData);
    } catch {
        decompressed = rawData;
    }

    const reader = new NBTReader(decompressed);
    const rootType = reader.readTag(1); // root type byte (usually 10 for Compound)
    // Root name
    reader.readTag(8); // read string root name
    const nbt = reader.readTag(rootType || 10) || {};

    const pos = Array.isArray(nbt.Pos)
        ? [Math.round(nbt.Pos[0] * 10) / 10, Math.round(nbt.Pos[1] * 10) / 10, Math.round(nbt.Pos[2] * 10) / 10]
        : [0, 0, 0];

    const rotation = Array.isArray(nbt.Rotation)
        ? [Math.round(nbt.Rotation[0] * 10) / 10, Math.round(nbt.Rotation[1] * 10) / 10]
        : [0, 0];

    const inventory: PlayerInventoryItem[] = (nbt.Inventory || []).map((item: any) => ({
        slot: typeof item.Slot === 'number' ? item.Slot : parseInt(item.Slot || '0', 10),
        id: item.id || 'minecraft:air',
        count: item.count || item.Count || 1,
        damage: item.Damage || item.tag?.Damage || 0,
        displayName: item.tag?.display?.Name || item.components?.['minecraft:custom_name'],
    }));

    const enderItems: PlayerInventoryItem[] = (nbt.EnderItems || []).map((item: any) => ({
        slot: typeof item.Slot === 'number' ? item.Slot : parseInt(item.Slot || '0', 10),
        id: item.id || 'minecraft:air',
        count: item.count || item.Count || 1,
        damage: item.Damage || item.tag?.Damage || 0,
        displayName: item.tag?.display?.Name || item.components?.['minecraft:custom_name'],
    }));

    return {
        uuid,
        name: nbt.lastKnownName || name,
        isOnline,
        dimension: nbt.Dimension || 'minecraft:overworld',
        pos: pos as [number, number, number],
        rotation: rotation as [number, number],
        health: Math.min(20, Math.max(0, Math.round((nbt.Health || 20) * 10) / 10)),
        maxHealth: 20,
        foodLevel: typeof nbt.foodLevel === 'number' ? nbt.foodLevel : 20,
        foodSaturationLevel: typeof nbt.foodSaturationLevel === 'number' ? Math.round(nbt.foodSaturationLevel) : 5,
        xpLevel: typeof nbt.XpLevel === 'number' ? nbt.XpLevel : 0,
        xpProgress: typeof nbt.XpP === 'number' ? nbt.XpP : 0,
        gameMode: typeof nbt.playerGameType === 'number' ? nbt.playerGameType : 0,
        spawnPos: nbt.SpawnX !== undefined ? [nbt.SpawnX, nbt.SpawnY, nbt.SpawnZ] : undefined,
        spawnDimension: nbt.SpawnDimension,
        inventory,
        enderItems,
        firstPlayed: nbt.bukkit?.firstPlayed,
        lastPlayed: nbt.bukkit?.lastPlayed,
    };
};
