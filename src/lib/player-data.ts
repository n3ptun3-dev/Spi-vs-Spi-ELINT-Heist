// src/lib/player-data.ts
import type { Faction, PlayerStats, PlayerInventory, VaultSlot, PlayerInventoryItem } from '@/contexts/AppContext'; // Ensure types are consistent
import initialDb from '../../db.json'; // Assuming db.json is in the root and contains initial structures

// In-memory store
let playersStore: Player[] = [];
let itemsStore: any[] = []; // Define more specific type if needed
let droppedItemsStore: any[] = []; // Define more specific type if needed
let dailyTeamCodesStore: Record<string, string> = {};

export interface Player {
  id: string; // Pi Network unique ID
  spyName: string | null;
  faction: Faction;
  stats: PlayerStats;
  inventory: PlayerInventory; // Record<itemId, PlayerInventoryItem>
  vault: VaultSlot[];
}


const DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER: PlayerStats = {
  xp: 0, level: 0,
  elintReserves: 0, 
  elintTransferred: 0,
  successfulVaultInfiltrations: 0,
  successfulLockInfiltrations: 0,
  elintObtainedTotal: 0,
  elintObtainedCycle: 0,
  elintLostTotal: 0,
  elintLostCycle: 0,
  elintGeneratedTotal: 0,
  elintGeneratedCycle: 0,
  elintTransferredToHQCyle: 0,
  successfulInterferences: 0,
  elintSpentSpyShop: 0,
  hasPlacedFirstLock: false,
};

export function initializePlayerData(): void {
  const dbTyped = initialDb as any;
  
  let validDbData = dbTyped;
  if (Array.isArray(dbTyped) && dbTyped.length > 0 && typeof dbTyped[0] !== 'object') {
    console.warn("db.json appears to be malformed (concatenated JSON strings). Attempting to parse the last valid part.");
    const jsonObjects = (initialDb as unknown as string).split('}{').map((s, i, arr) => {
      if (i === 0 && arr.length > 1) return s + '}';
      if (i === arr.length - 1 && arr.length > 1) return '{' + s;
      if (arr.length > 1) return '{' + s + '}';
      return s;
    });
    try {
      validDbData = JSON.parse(jsonObjects[jsonObjects.length - 1]);
    } catch (e) {
      console.error("Failed to parse even the last part of db.json. Using empty defaults.", e);
      validDbData = { players: [], items: [], droppedItems: [], dailyTeamCodes: {} };
    }
  } else if (typeof initialDb !== 'object' || initialDb === null) {
     console.error("db.json is not a valid object. Using empty defaults.");
     validDbData = { players: [], items: [], droppedItems: [], dailyTeamCodes: {} };
  }


  playersStore = validDbData.players || [];
  itemsStore = validDbData.items || [];
  droppedItemsStore = validDbData.droppedItems || [];
  dailyTeamCodesStore = validDbData.dailyTeamCodes || {};
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const player = playersStore.find(p => p.id === playerId);
  return player ? { ...player } : null;
}

export async function createPlayer(
  playerId: string,
  faction: Faction,
  initialStats?: PlayerStats,
  initialSpyName: string | null = null
): Promise<Player> {
  await new Promise(resolve => setTimeout(resolve, 50));
  if (await getPlayer(playerId)) {
    throw new Error(`Player with ID ${playerId} already exists.`);
  }
  const newPlayer: Player = {
    id: playerId,
    spyName: initialSpyName,
    faction: faction,
    stats: initialStats || { ...DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER },
    inventory: {
      'cypher_lock_l1': { id: 'cypher_lock_l1', quantity: 4},
      'reinforced_deadbolt_l1': { id: 'reinforced_deadbolt_l1', quantity: 1 }
    },
    vault: Array(8).fill(null).map((_, i) => ({
      id: i < 4 ? `lock_slot_${i}` : `upgrade_slot_${i - 4}`,
      type: i < 4 ? 'lock' : 'upgrade',
      item: null,
      fortifier: null,
    })),
  };
  playersStore.push(newPlayer);
  return { ...newPlayer };
}

export async function updatePlayer(updatedPlayer: Player): Promise<Player | null> {
  await new Promise(resolve => setTimeout(resolve, 50));
  const playerIndex = playersStore.findIndex(p => p.id === updatedPlayer.id);
  if (playerIndex !== -1) {
    playersStore[playerIndex] = { ...updatedPlayer };
    return { ...playersStore[playerIndex] };
  }
  return null;
}

export async function getAllGameItems(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...itemsStore];
}

export async function getDroppedItems(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...droppedItemsStore];
}

export async function addDroppedItem(item: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    droppedItemsStore.push(item);
}

if (typeof window !== 'undefined') {
}
