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
  vault: VaultSlot[]; // Array of VaultSlot
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
  // Type assertion for initialDb if its structure is known and complex
  const dbTyped = initialDb as any; // Use 'any' or a more specific type for db.json content
  
  // Check if db.json has multiple entries due to concatenation and take the last valid one
  let validDbData = dbTyped;
  if (Array.isArray(dbTyped) && dbTyped.length > 0 && typeof dbTyped[0] !== 'object') {
    // This handles the case where db.json might be a string of concatenated JSON objects
    // A more robust solution would be to ensure db.json is always a single valid JSON object
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
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
  const player = playersStore.find(p => p.id === playerId);
  return player ? { ...player } : null; // Return a copy
}

export async function createPlayer(
  playerId: string,
  faction: Faction,
  initialStats?: PlayerStats, // Make initialStats optional, use default if not provided
  initialSpyName: string | null = null
): Promise<Player> {
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
  if (await getPlayer(playerId)) {
    throw new Error(`Player with ID ${playerId} already exists.`);
  }
  const newPlayer: Player = {
    id: playerId,
    spyName: initialSpyName,
    faction: faction,
    stats: initialStats || { ...DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER }, // Use default if not provided
    inventory: {
      'cypher_lock_l1': { id: 'cypher_lock_l1', quantity: 4},
      'reinforced_deadbolt_l1': { id: 'reinforced_deadbolt_l1', quantity: 1 }
    },
    vault: Array(8).fill(null).map((_, i) => ({ // Initialize with 8 empty slots (4 lock, 4 upgrade)
      id: i < 4 ? `lock_slot_${i}` : `upgrade_slot_${i - 4}`,
      type: i < 4 ? 'lock' : 'upgrade',
      item: null,
    })),
  };
  playersStore.push(newPlayer);
  // Here you would typically also save to your db.json or actual backend
  return { ...newPlayer }; // Return a copy
}

export async function updatePlayer(updatedPlayer: Player): Promise<Player | null> {
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate async
  const playerIndex = playersStore.findIndex(p => p.id === updatedPlayer.id);
  if (playerIndex !== -1) {
    playersStore[playerIndex] = { ...updatedPlayer }; // Store a copy
    // Here you would typically also save to your db.json or actual backend
    return { ...playersStore[playerIndex] }; // Return a copy
  }
  return null;
}

// Example: Simulate getting all game items (replace with actual item fetching if needed)
export async function getAllGameItems(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...itemsStore];
}

// Simulate getting dropped items
export async function getDroppedItems(): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...droppedItemsStore];
}

export async function addDroppedItem(item: any): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    droppedItemsStore.push(item);
    // Save to db.json or backend
}

// Initialize on load (though AppContext also calls this)
if (typeof window !== 'undefined') { // Ensure this only runs client-side if it manipulates client stores directly
    // initializePlayerData(); 
    // Deferring initialization to AppContext to ensure it's ready when context is first used.
}
