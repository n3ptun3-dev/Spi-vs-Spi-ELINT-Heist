// src/contexts/AppContext.tsx
// MODIFIED BY GEMINI (v8): Consolidated and clarified type imports from game-items.ts.
//                           Removed conflicting 'export type { ... } from' statements
//                           to resolve "Cannot find name" errors and improve type resolution.

"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Theme } from './ThemeContext';
import { useTheme } from './ThemeContext';
import {
  initializePlayerData,
  getPlayer,
  createPlayer,
  updatePlayer,
  type Player,
} from '@/lib/player-data';
// Directly import all necessary types from game-items.ts for internal use in AppContext.tsx
import { getItemById, type VaultSlot, type HardwareItem, type InfiltrationGearItem, type ItemCategory, type GameItemBase, type ItemLevel, type PlayerInventoryItem, type LockFortifierItem } from '@/lib/game-items';

import { CodenameInput } from '@/components/game/onboarding/CodenameInput';
// Import the new master minigame mechanics
import { getMinigameForLock, type MinigameArguments, MinigameType } from '@/lib/master-minigame-mechanics';
// Import minigame components directly for rendering
import QuantumCircuitWeaver from '@/components/game/minigames/QuantumCircuitWeaver'; 
import KeyCracker from '@/components/game/minigames/KeyCracker';
import { HolographicPanel, HolographicButton } from '@/components/game/shared/HolographicPanel';

// Now, if other components (like EquipmentLockerSection or CardTextureRenderer) need these types,
// they should import them directly from here (AppContext.tsx) or game-items.ts if they're not part of the context.
// For now, they can continue importing from AppContext, and AppContext will properly resolve them.
export type { ItemCategory, GameItemBase, ItemLevel, PlayerInventoryItem, LockFortifierItem };


export type Faction = 'Cyphers' | 'Shadows' | 'Observer';
export type OnboardingStep = 'welcome' | 'factionChoice' | 'authPrompt' | 'codenameInput' | 'fingerprint' | 'tod';

export interface PlayerStats {
  xp: number;
  level: ItemLevel;
  elintReserves: number;
  elintTransferred: number;
  successfulVaultInfiltrations: number;
  successfulLockInfiltrations: number;
  elintObtainedTotal: number;
  elintObtainedCycle: number;
  elintLostTotal: number;
  elintLostCycle: number;
  elintGeneratedTotal: number;
  elintGeneratedCycle: number;
  elintTransferredToHQCyle: number;
  successfulInterferences: number;
  elintSpentSpyShop: number;
  hasPlacedFirstLock: boolean;
}

export interface TODWindowOptions {
  showCloseButton?: boolean;
  explicitTheme?: Theme;
  themeVersion?: number;
}

export type PlayerInventory = Record<string, PlayerInventoryItem>;

export interface GameMessage {
  id: string;
  text: string;
  type: 'system' | 'hq' | 'notification' | 'error' | 'lore' | 'alert';
  timestamp: Date;
  isPinned?: boolean;
  sender?: string;
}

const DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER: PlayerStats = {
  xp: 0, level: 1 as ItemLevel, elintReserves: 0, elintTransferred: 0,
  successfulVaultInfiltrations: 0, successfulLockInfiltrations: 0,
  elintObtainedTotal: 0, elintObtainedCycle: 0, elintLostTotal: 0, elintLostCycle: 0,
  elintGeneratedTotal: 0, elintGeneratedCycle: 0, elintTransferredToHQCyle: 0,
  successfulInterferences: 0, elintSpentSpyShop: 0,
  hasPlacedFirstLock: false,
};

const FIXED_DEV_PI_ID = "mock_pi_id_12345";

interface AppContextType {
  currentPlayer: Player | null;
  isLoading: boolean;
  isPiBrowser: boolean;
  onboardingStep: OnboardingStep;
  messages: GameMessage[];
  dailyTeamCode: Record<Faction | 'Observer', string>;
  faction: Faction;
  isAuthenticated: boolean;
  playerSpyName: string | null;
  playerPiName: string | null;
  playerStats: PlayerStats;
  playerInventory: PlayerInventory;
  playerVault: VaultSlot[];
  pendingPiId: string | null;
  setFaction: (faction: Faction) => Promise<void>;
  setPlayerSpyName: (name: string) => Promise<void>;
  setOnboardingStep: (step: OnboardingStep) => void;
  setIsLoading: (loading: boolean) => void;
  addMessage: (message: Omit<GameMessage, 'id' | 'timestamp'>) => void;
  updatePlayerStats: (newStats: Partial<PlayerStats>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  handleAuthentication: (piId: string, chosenFaction: Faction) => Promise<void>;
  attemptLoginWithPiId: (piId: string) => Promise<void>;
  logout: () => void;
  isTODWindowOpen: boolean;
  todWindowTitle: string;
  todWindowContent: ReactNode | null;
  todWindowOptions: TODWindowOptions;
  openTODWindow: (title: string, content: ReactNode, options?: TODWindowOptions) => void;
  closeTODWindow: () => void;
  updatePlayerInventoryItemStrength: (itemId: string, newStrength: number) => Promise<void>;
  spendElint: (amount: number) => Promise<boolean>;
  purchaseItem: (itemId: string) => Promise<boolean>;
  addItemToInventory: (itemId: string, quantity?: number, itemDetails?: Partial<Omit<PlayerInventoryItem, 'id' | 'quantity'>>) => Promise<void>;
  removeItemFromInventory: (itemId: string, quantity?: number) => Promise<void>;
  deployItemToVault: (slotId: string, itemId: string | null) => Promise<void>;
  isSpyShopActive: boolean; // This state is not directly controlled by openSpyShop/closeSpyShop but can be managed if needed
  setIsSpyShopActive: (isActive: boolean) => void; // Keeping for flexibility, though not directly used for shop open/close now
  isSpyShopOpen: boolean; // The primary state for shop visibility
  openSpyShop: () => void;
  closeSpyShop: () => void;
  shopSearchTerm: string;
  setShopSearchTerm: (term: string) => void;
  isShopAuthenticated: boolean;
  setIsShopAuthenticated: (isAuthenticated: boolean) => void;
  todInventoryContext: {
    category: ItemCategory;
    title: string;
    purpose?: 'equip_lock' | 'equip_nexus' | 'infiltrate_lock';
    onItemSelect?: (item: GameItemBase) => void;
  } | null;
  openInventoryTOD: (context: AppContextType['todInventoryContext']) => void;
  closeInventoryTOD: () => void;
  playerInfo: Player | null;
  isScrollLockActive: boolean;
  setIsScrollLockActive: (locked: boolean) => void;
  getItemById: (id: string) => GameItemBase | undefined;

  activeMinigame: MinigameArguments | null;
  openMinigame: (lock: HardwareItem, attackingTool: InfiltrationGearItem, fortifiers?: LockFortifierItem[]) => void;
  closeMinigame: (success: boolean, strengthReduced: number, toolDamageAmount?: number) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

function generateFactionTeamCode(seedDate: Date, faction: Faction | 'Observer'): string {
  const start = new Date(seedDate.getFullYear(), 0, 0);
  const diff = seedDate.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  let factionSeedOffset = 3000;
  if (faction === 'Cyphers') factionSeedOffset = 1000;
  else if (faction === 'Shadows') factionSeedOffset = 2000;
  const NATO_ALPHABET = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliett", "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", "Uniform", "Victor", "Whiskey", "X-ray", "Yankee", "Zulu"];
  const getRandomWord = (baseSeed: number, index: number) => {
    const combinedSeed = baseSeed + index * 100 + factionSeedOffset;
    const positiveIndex = (combinedSeed % NATO_ALPHABET.length + NATO_ALPHABET.length) % NATO_ALPHABET.length;
    return NATO_ALPHABET[positiveIndex];
  };
  return `${getRandomWord(dayOfYear, 1)}-${getRandomWord(dayOfYear, 2)}-${getRandomWord(dayOfYear, 3)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [_currentPlayer, _setCurrentPlayer] = useState<Player | null>(null);
  const [_isLoading, _setIsLoading] = useState(true);
  const [_isPiBrowser, _setIsPiBrowser] = useState(false);
  const [_onboardingStep, _setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [_messages, _setMessages] = useState<GameMessage[]>([]);
  const [_dailyTeamCode, _setDailyTeamCode] = useState<Record<Faction | 'Observer', string>>({ Cyphers: '', Shadows: '', Observer: '' });
  const [_isTODWindowOpen, _setIsTODWindowOpen] = useState(false);
  const [_todWindowTitle, _setTODWindowTitle] = useState('');
  const [_todWindowContent, _setTODWindowContent] = useState<ReactNode | null>(null);
  const [_todWindowOptions, _setTODWindowOptions] = useState<TODWindowOptions>({ showCloseButton: true });
  const [_isSpyShopActive, _setIsSpyShopActive] = useState(false); // Keeping this but it's not the primary visibility toggle
  const [_isSpyShopOpen, _setIsSpyShopOpen] = useState(false); // This is the primary visibility toggle for the shop
  const [_shopSearchTerm, _setShopSearchTerm] = useState('');
  const [_isShopAuthenticated, _setIsShopAuthenticated] = useState(false);
  const [_todInventoryContext, _setTodInventoryContext] = useState<AppContextType['todInventoryContext']>(null);
  const [_pendingPiId, _setPendingPiId] = useState<string | null>(null);
  const [_isScrollLockActive, _setIsScrollLockActive] = useState(false);

  const [_activeMinigame, _setActiveMinigame] = useState<MinigameArguments | null>(null);

  const { theme: currentGlobalTheme, themeVersion } = useTheme();

  const addMessage = useCallback((message: Omit<GameMessage, 'id' | 'timestamp'>) => {
    _setMessages(prev => {
      const newMessage: GameMessage = {
        ...message,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: new Date(),
      };
      const newMessagesList = [newMessage, ...prev.filter(m => !m.isPinned)];
      const pinnedMessages = prev.filter(m => m.isPinned);
      const combinedMessages = [...pinnedMessages, ...newMessagesList];
      return combinedMessages.slice(0, 50);
    });
  }, []);

  const closeTODWindow = useCallback(() => {
    _setIsTODWindowOpen(false);
    _setTODWindowContent(null);
  }, []);

  const openTODWindow = useCallback((title: string, content: ReactNode, options: TODWindowOptions = {}) => {
    _setTODWindowTitle(title);
    _setTODWindowContent(content);
    // CRITICAL FIX: Ensure todInventoryContext is null when opening a general TOD window
    _setTodInventoryContext(null); 
    const defaultShowCloseButton = options.showCloseButton === undefined ? true : options.showCloseButton;
    const themeToUseForWindow = options.explicitTheme || currentGlobalTheme || 'terminal-green';
    const versionToUseForWindow = options.explicitTheme ? (options.themeVersion === undefined ? themeVersion : options.themeVersion) : themeVersion;
    _setTODWindowOptions({
        showCloseButton: defaultShowCloseButton,
        explicitTheme: themeToUseForWindow,
        themeVersion: versionToUseForWindow
    });
    _setIsTODWindowOpen(true);
  }, [currentGlobalTheme, themeVersion, _setTodInventoryContext]); // Added _setTodInventoryContext to dependencies

  const attemptLoginWithPiId = useCallback(async (piId: string) => {
    _setIsLoading(true);
    const player = await getPlayer(piId);
    if (player) {
      _setCurrentPlayer(player);
      if (typeof window !== "undefined") localStorage.setItem('lastPlayerId', piId);
      if (player.faction === 'Observer') {
        _setOnboardingStep('tod');
      } else if (player.spyName) {
        _setOnboardingStep('fingerprint');
      } else {
        _setOnboardingStep('codenameInput');
        const factionThemeForCodename = player.faction === 'Cyphers' ? 'cyphers' : player.faction === 'Shadows' ? 'shadows' : currentGlobalTheme;
        openTODWindow(
          "Agent Codename",
          <CodenameInput explicitTheme={factionThemeForCodename} />,
          { showCloseButton: false, explicitTheme: factionThemeForCodename, themeVersion }
        );
      }
      addMessage({type: 'system', text: `Welcome back, Agent ${player.spyName || piId.substring(0,8)}.`});
    } else {
      _setPendingPiId(piId);
      _setOnboardingStep('factionChoice');
      addMessage({type: 'system', text: 'New operative detected. Proceed to faction alignment.'});
    }
    _setIsLoading(false);
  }, [openTODWindow, addMessage, currentGlobalTheme, themeVersion]);

  const handleAuthentication = useCallback(async (piIdToAuth: string, chosenFaction: Faction) => {
    _setIsLoading(true);
    if (typeof window !== "undefined") localStorage.setItem('lastPlayerId', piIdToAuth);
    let player = await getPlayer(piIdToAuth);
    let nextOnboardingStep: OnboardingStep = 'welcome';
    if (player) {
      if (player.faction !== chosenFaction && chosenFaction !== 'Observer') {
        player = { ...player, faction: chosenFaction };
        await updatePlayer(player);
      }
       _setCurrentPlayer(player);
       nextOnboardingStep = player.spyName ? 'fingerprint' : 'codenameInput';
       if (chosenFaction === 'Observer') nextOnboardingStep = 'tod';
    } else {
      player = await createPlayer(piIdToAuth, chosenFaction, { ...DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER }, null);
      _setCurrentPlayer(player);
      nextOnboardingStep = chosenFaction === 'Observer' ? 'tod' : 'codenameInput';
    }
    _setPendingPiId(null);
    if (nextOnboardingStep === 'codenameInput' && player && player.faction !== 'Observer') {
      const factionThemeForCodename = player.faction === 'Cyphers' ? 'cyphers' : player.faction === 'Shadows' ? 'shadows' : currentGlobalTheme;
      openTODWindow(
        "Agent Codename",
        <CodenameInput explicitTheme={factionThemeForCodename} />,
        { showCloseButton: false, explicitTheme: factionThemeForCodename, themeVersion: themeVersion }
      );
    }
     _setOnboardingStep(nextOnboardingStep);
    _setIsLoading(false);
  }, [openTODWindow, currentGlobalTheme, themeVersion]);
  
  useEffect(() => {
    initializePlayerData();
    const inPiBrowser = typeof window !== "undefined" && navigator.userAgent.includes("PiBrowser");
    _setIsPiBrowser(inPiBrowser);
    const today = new Date();
    _setDailyTeamCode({
      Cyphers: generateFactionTeamCode(today, 'Cyphers'),
      Shadows: generateFactionTeamCode(today, 'Shadows'),
      Observer: generateFactionTeamCode(today, 'Observer'),
    });

    const loadLastPlayer = async () => {
      _setIsLoading(true);
      const lastPlayerId = typeof window !== "undefined" ? localStorage.getItem('lastPlayerId') : null;
      if (lastPlayerId) {
        const player = await getPlayer(lastPlayerId);
        if (player) {
          _setCurrentPlayer(player);
          if (player.faction === 'Observer') {
            _setOnboardingStep('tod');
          } else { // Removed player.spyName check here
             _setOnboardingStep('fingerprint'); // Assuming all non-observers go to fingerprint or codename
             if (!player.spyName) { // If no spyName, go to codename input
                 const factionThemeForCodename = player.faction === 'Cyphers' ? 'cyphers' : player.faction === 'Shadows' ? 'shadows' : currentGlobalTheme;
                 openTODWindow(
                  "Agent Codename",
                  <CodenameInput explicitTheme={factionThemeForCodename} />,
                  { showCloseButton: false, explicitTheme: factionThemeForCodename, themeVersion }
                );
             }
          }
        } else {
          if (typeof window !== "undefined") localStorage.removeItem('lastPlayerId');
          _setOnboardingStep('welcome');
        }
      } else {
        _setOnboardingStep('welcome');
      }
      _setIsLoading(false);
    };
    loadLastPlayer();
  }, [openTODWindow, currentGlobalTheme, themeVersion]);


  const setFactionAppContext = useCallback(async (newFaction: Faction) => {
    if (_currentPlayer) {
      const updatedPlayer = { ..._currentPlayer, faction: newFaction };
      const result = await updatePlayer(updatedPlayer);
      if (result) _setCurrentPlayer(result);
    }
  }, [_currentPlayer]);

  const setPlayerSpyNameAppContext = useCallback(async (name: string) => {
    if (_currentPlayer) {
      const updatedPlayer = { ..._currentPlayer, spyName: name };
      const result = await updatePlayer(updatedPlayer);
       if (result) _setCurrentPlayer(result);
    }
  }, [_currentPlayer]);

  const updatePlayerStatsAppContext = useCallback(async (newStats: Partial<PlayerStats>) => {
    if (_currentPlayer) {
      const updatedPlayer = {
        ..._currentPlayer,
        stats: { ..._currentPlayer.stats, ...newStats },
      };
      const result = await updatePlayer(updatedPlayer);
      if (result) _setCurrentPlayer(result);
    }
  }, [_currentPlayer]);

  const logout = useCallback(() => {
    _setCurrentPlayer(null);
    if (typeof window !== "undefined") localStorage.removeItem('lastPlayerId');
    _setOnboardingStep('welcome');
    _setIsLoading(false);
  }, []);

  const updatePlayerInventoryItemStrength = useCallback(async (itemId: string, newStrength: number) => {
    if (_currentPlayer) {
      const newInventory = { ..._currentPlayer.inventory };
      if (newInventory[itemId]) {
        newInventory[itemId] = { ...newInventory[itemId], currentStrength: newStrength };
        const updatedPlayer = { ..._currentPlayer, inventory: newInventory };
        const result = await updatePlayer(updatedPlayer);
        if (result) _setCurrentPlayer(result);
      }
    }
  }, [_currentPlayer]);

  const spendElint = useCallback(async (amount: number): Promise<boolean> => {
    if (_currentPlayer && _currentPlayer.stats.elintReserves >= amount) {
      await updatePlayerStatsAppContext({
        elintReserves: _currentPlayer.stats.elintReserves - amount,
        elintSpentSpyShop: (_currentPlayer.stats.elintSpentSpyShop || 0) + amount,
      });
      return true;
    }
    return false;
  }, [_currentPlayer, updatePlayerStatsAppContext]);

  const addItemToInventory = useCallback(async (
    itemId: string,
    quantity: number = 1,
    itemDetails?: Partial<Omit<PlayerInventoryItem, 'id' | 'quantity'>>
  ) => {
    if (_currentPlayer) {
      const newInventory = { ..._currentPlayer.inventory };
      // Get base item to infer max values for new items, if not provided in itemDetails
      const baseItem = getItemById(itemId);
      const initialStrength = itemDetails?.currentStrength ?? baseItem?.strength?.max;
      const initialUses = itemDetails?.currentUses ?? baseItem?.maxUses;
      const initialAlerts = itemDetails?.currentAlerts ?? baseItem?.maxAlerts;
      const initialCharges = itemDetails?.currentCharges ?? baseItem?.maxCharges;
      
      if (newInventory[itemId]) {
        newInventory[itemId].quantity += quantity;
        // Only update current properties if they are undefined (i.e., not explicitly set)
        if (initialStrength !== undefined && newInventory[itemId].currentStrength === undefined) {
          newInventory[itemId].currentStrength = initialStrength;
        }
        if (initialUses !== undefined && newInventory[itemId].currentUses === undefined) {
          newInventory[itemId].currentUses = initialUses;
        }
        if (initialAlerts !== undefined && newInventory[itemId].currentAlerts === undefined) {
          newInventory[itemId].currentAlerts = initialAlerts;
        }
        if (initialCharges !== undefined && newInventory[itemId].currentCharges === undefined) {
          newInventory[itemId].currentCharges = initialCharges;
        }
      } else {
        newInventory[itemId] = { 
          id: itemId, 
          quantity, 
          currentStrength: initialStrength,
          currentUses: initialUses,
          currentAlerts: initialAlerts,
          currentCharges: initialCharges,
          ...itemDetails 
        };
      }
      const updatedPlayer = { ..._currentPlayer, inventory: newInventory };
      const result = await updatePlayer(updatedPlayer);
      if (result) _setCurrentPlayer(result);
    }
  }, [_currentPlayer]);

  const removeItemFromInventory = useCallback(async (itemId: string, quantity: number = 1) => {
    if (_currentPlayer) {
      const newInventory = { ..._currentPlayer.inventory };
      if (newInventory[itemId]) {
        newInventory[itemId].quantity -= quantity;
        if (newInventory[itemId].quantity <= 0) {
          delete newInventory[itemId];
        }
        const updatedPlayer = { ..._currentPlayer, inventory: newInventory };
        const result = await updatePlayer(updatedPlayer);
        if (result) _setCurrentPlayer(result);
      }
    }
  }, [_currentPlayer]);
  
  const purchaseItem = useCallback(async (itemId: string): Promise<boolean> => {
    const itemData = getItemById(itemId);
    if (!itemData || !_currentPlayer) {
      addMessage({ text: `Error: Item ${itemId} not found or player data missing.`, type: 'error' });
      return false;
    }
    if (await spendElint(itemData.cost)) { 
      // When purchasing, set initial current strength/uses/alerts/charges based on the item's max
      const initialItemDetails: Partial<Omit<PlayerInventoryItem, 'id' | 'quantity'>> = {};
      if (itemData.strength?.max !== undefined) initialItemDetails.currentStrength = itemData.strength.max;
      if (itemData.maxUses !== undefined) initialItemDetails.currentUses = itemData.maxUses;
      if (itemData.maxAlerts !== undefined) initialItemDetails.currentAlerts = itemData.maxAlerts;
      if (itemData.maxCharges !== undefined) initialItemDetails.currentCharges = itemData.maxCharges;

      await addItemToInventory(itemId, 1, initialItemDetails);
      addMessage({ text: `Purchased ${itemData.name} L${itemData.level}`, type: 'notification' });
      return true;
    }
    addMessage({ text: `Insufficient ELINT to purchase ${itemData.name} L${itemData.level}.`, type: 'error' });
    return false;
  }, [_currentPlayer, spendElint, addItemToInventory, addMessage]);

  const deployItemToVault = useCallback(async (slotId: string, itemIdToDeploy: string | null) => {
    if (!_currentPlayer) return;
    let itemBeingDeployed: GameItemBase | undefined = undefined;
    let itemBeingRemovedFromSlot: PlayerInventoryItem | null = null;
    // Deep clone to ensure immutability before modification
    const newInventory = JSON.parse(JSON.stringify(_currentPlayer.inventory));
    const newVault = JSON.parse(JSON.stringify(_currentPlayer.vault));
    const slotIndex = newVault.findIndex((slot: VaultSlot) => slot.id === slotId);

    if (slotIndex === -1) {
      addMessage({ text: `Vault slot ${slotId} not found.`, type: 'error' }); return;
    }
    
    itemBeingRemovedFromSlot = newVault[slotIndex].item; // Get item currently in the slot

    if (itemIdToDeploy) {
      itemBeingDeployed = getItemById(itemIdToDeploy);
      if (!itemBeingDeployed) { addMessage({ text: `Item ${itemIdToDeploy} not found.`, type: 'error' }); return; }
      if (!newInventory[itemIdToDeploy] || newInventory[itemIdToDeploy].quantity <= 0) {
        addMessage({ text: `Cannot deploy ${itemBeingDeployed.name}: Not in inventory.`, type: 'error' }); return;
      }
      
      // When deploying, the item comes with its current instance-specific stats from inventory
      const deployedItemInstance: PlayerInventoryItem = {
        id: itemBeingDeployed.id,
        quantity: 1, // Always deploy 1 unit
        currentStrength: newInventory[itemIdToDeploy].currentStrength, 
        currentUses: newInventory[itemIdToDeploy].currentUses,
        currentAlerts: newInventory[itemIdToDeploy].currentAlerts,
        currentCharges: newInventory[itemIdToDeploy].currentCharges,
        // Max values from base item definition (these are usually static)
        maxUses: itemBeingDeployed.maxUses, 
        maxAlerts: itemBeingDeployed.maxAlerts,
        maxCharges: itemBeingDeployed.maxCharges,
      };
      
      newVault[slotIndex].item = deployedItemInstance;
      newInventory[itemIdToDeploy].quantity -= 1;
      if (newInventory[itemIdToDeploy].quantity <= 0) delete newInventory[itemIdToDeploy];
    } else {
      // If itemIdToDeploy is null, it means we are clearing the slot
      newVault[slotIndex].item = null;
    }

    // Return the item that was in the slot back to inventory
    if (itemBeingRemovedFromSlot) {
      if (newInventory[itemBeingRemovedFromSlot.id]) {
        // If item already exists in inventory, just increase quantity
        newInventory[itemBeingRemovedFromSlot.id].quantity += itemBeingRemovedFromSlot.quantity;
      } else {
        // If not, add the item back with its full instance properties (e.g., current strength)
        newInventory[itemBeingRemovedFromSlot.id] = { 
            ...itemBeingRemovedFromSlot,
            quantity: itemBeingRemovedFromSlot.quantity,
        };
      }
    }

    let newStats = { ..._currentPlayer.stats };
    if (itemBeingDeployed && itemBeingDeployed.category === 'Hardware' && !newStats.hasPlacedFirstLock) {
      newStats = { ...newStats, elintReserves: newStats.elintReserves + 10000, hasPlacedFirstLock: true };
      addMessage({ type: 'notification', text: 'First lock deployed! ELINT Reserves boosted by 10,000!' });
    }
    const updatedPlayer: Player = { ..._currentPlayer, stats: newStats, inventory: newInventory, vault: newVault };
    const result = await updatePlayer(updatedPlayer);
    if (result) {
      _setCurrentPlayer(result);
      addMessage({ text: itemIdToDeploy && itemBeingDeployed ? `Deployed ${itemBeingDeployed.name} L${itemBeingDeployed.level} to vault.` : `Cleared vault slot.`, type: 'system' });
    }
  }, [_currentPlayer, addMessage]);

  const addXp = useCallback(async (amount: number) => {
    if (_currentPlayer) {
      await updatePlayerStatsAppContext({ xp: _currentPlayer.stats.xp + amount });
      addMessage({ text: `+${amount} XP`, type: 'notification' });
    }
  }, [_currentPlayer, updatePlayerStatsAppContext, addMessage]);

  const openInventoryTOD = useCallback((context: AppContextType['todInventoryContext']) => {
    _setTodInventoryContext(context);
    const playerForTheme = _currentPlayer;
    const resolvedTheme = playerForTheme?.faction === 'Cyphers' ? 'cyphers'
                        : playerForTheme?.faction === 'Shadows' ? 'shadows'
                        : currentGlobalTheme || 'terminal-green';
    openTODWindow(
      context?.title || "Inventory",
      <div>Inventory Browser for {context?.category} - {context?.title}</div>, // Placeholder, will be replaced by InventoryBrowserInTOD
      { explicitTheme: resolvedTheme, themeVersion: themeVersion, showCloseButton: true }
    );
  }, [_currentPlayer, currentGlobalTheme, themeVersion, openTODWindow]);

  const closeInventoryTOD = useCallback(() => {
    _setTodInventoryContext(null);
    closeTODWindow();
  }, [closeTODWindow]);

  const playerInfoForShop = useMemo(() => {
    if (!_currentPlayer) return null;
    return {
      id: _currentPlayer.id,
      spyName: _currentPlayer.spyName,
      faction: _currentPlayer.faction,
      stats: { level: _currentPlayer.stats.level, elintReserves: _currentPlayer.stats.elintReserves },
    } as Player; // Cast needed if Player type expects more stats for shop specifically
  }, [_currentPlayer]);

  // --- Minigame Logic ---
  const openMinigame = useCallback((lock: HardwareItem, attackingTool: InfiltrationGearItem, fortifiers: LockFortifierItem[] = []) => {
    // Determine which minigame to load based on the lock type
    const minigameArgs = getMinigameForLock(lock, attackingTool, fortifiers); // Pass attackingTool and fortifiers
    _setActiveMinigame(minigameArgs);
  }, []);

  const closeMinigame = useCallback(async (success: boolean, strengthReduced: number, toolDamageAmount: number = 0) => {
    if (_activeMinigame && _currentPlayer) {
      let updatedPlayer = { ..._currentPlayer };

      // 1. Update Lock Strength in Vault
      const newVault = updatedPlayer.vault.map(slot => {
        if (slot.item?.id === _activeMinigame.lockData.id && slot.item.currentStrength !== undefined) {
          const updatedStrength = Math.max(0, slot.item.currentStrength - strengthReduced);
          return { ...slot, item: { ...slot.item, currentStrength: updatedStrength } };
        }
        return slot;
      });
      updatedPlayer = { ...updatedPlayer, vault: newVault };

      // 2. Apply Tool Damage (if any)
      if (toolDamageAmount > 0 && _activeMinigame.props && 'attackingTool' in _activeMinigame.props && _activeMinigame.props.attackingTool) {
        const toolInPlay = _activeMinigame.props.attackingTool as InfiltrationGearItem;
        const newInventory = { ...updatedPlayer.inventory };
        const toolInstance = newInventory[toolInPlay.id];

        if (toolInstance && toolInstance.currentUses !== undefined) {
          toolInstance.currentUses = Math.max(0, toolInstance.currentUses - toolDamageAmount);
          addMessage({ text: `${toolInPlay.name} durability reduced by ${toolDamageAmount}. Remaining uses: ${toolInstance.currentUses}.`, type: 'alert' });

          // If tool runs out of uses, remove it
          if (toolInstance.currentUses <= 0) {
            delete newInventory[toolInPlay.id];
            addMessage({ text: `${toolInPlay.name} is depleted and removed from inventory.`, type: 'error' });
          }
        }
        updatedPlayer = { ...updatedPlayer, inventory: newInventory };
      }


      const result = await updatePlayer(updatedPlayer);

      if (result) {
        _setCurrentPlayer(result);
        if (success) {
          addMessage({ text: `Successfully bypassed ${_activeMinigame.lockData.name}! Strength reduced by ${strengthReduced}.`, type: 'notification' });
          await updatePlayerStatsAppContext({
            successfulLockInfiltrations: (_currentPlayer.stats.successfulLockInfiltrations || 0) + 1
          });
        } else {
          addMessage({ text: `Failed to bypass ${_activeMinigame.lockData.name}. Infiltration aborted.`, type: 'error' });
          // TODO: Implement other failure penalties, e.g., ELINT loss, cooldowns
        }
      } else {
        // Handle case where player update failed
        addMessage({ text: `Error updating player data after minigame.`, type: 'error' });
      }
    }
    _setActiveMinigame(null); // Close the minigame
  }, [_activeMinigame, _currentPlayer, addMessage, updatePlayerStatsAppContext]);


  const contextValue = useMemo(() => ({
    currentPlayer: _currentPlayer,
    isLoading: _isLoading,
    isPiBrowser: _isPiBrowser,
    onboardingStep: _onboardingStep,
    messages: _messages,
    dailyTeamCode: _dailyTeamCode,
    faction: _currentPlayer?.faction || 'Observer',
    isAuthenticated: !!_currentPlayer,
    playerSpyName: _currentPlayer?.spyName || null,
    playerPiName: _currentPlayer?.id || null,
    playerStats: _currentPlayer?.stats || DEFAULT_PLAYER_STATS_FOR_NEW_PLAYER,
    playerInventory: _currentPlayer?.inventory || {},
    playerVault: _currentPlayer?.vault || [],
    pendingPiId: _pendingPiId,
    setFaction: setFactionAppContext,
    setPlayerSpyName: setPlayerSpyNameAppContext,
    setOnboardingStep: _setOnboardingStep,
    setIsLoading: _setIsLoading,
    addMessage,
    updatePlayerStats: updatePlayerStatsAppContext,
    addXp,
    handleAuthentication,
    attemptLoginWithPiId,
    logout,
    isTODWindowOpen: _isTODWindowOpen,
    todWindowTitle: _todWindowTitle,
    todWindowContent: _todWindowContent,
    todWindowOptions: _todWindowOptions,
    openTODWindow,
    closeTODWindow,
    updatePlayerInventoryItemStrength,
    spendElint,
    purchaseItem,
    addItemToInventory,
    removeItemFromInventory,
    deployItemToVault,
    isSpyShopActive: _isSpyShopActive, // Keeping for other potential uses
    setIsSpyShopActive: (isActive: boolean) => {
        // console.log(`AppContext: setIsSpyShopActive called with ${isActive}`);
        _setIsSpyShopActive(isActive);
    },
    isSpyShopOpen: _isSpyShopOpen, // Primary state for shop visibility
    openSpyShop: () => {
        // console.log("AppContext: openSpyShop called. Setting isSpyShopOpen to TRUE.");
        _setIsSpyShopOpen(true);
    },
    closeSpyShop: () => {
        // console.log("AppContext: closeSpyShop called. Setting isSpyShopOpen to FALSE.");
        _setIsSpyShopOpen(false);
    },
    shopSearchTerm: _shopSearchTerm,
    setShopSearchTerm: (term: string) => {
        _setShopSearchTerm(term);
    },
    isShopAuthenticated: _isShopAuthenticated,
    setIsShopAuthenticated: (isAuthenticated: boolean) => _setIsShopAuthenticated(isAuthenticated),
    todInventoryContext: _todInventoryContext,
    openInventoryTOD,
    closeInventoryTOD,
    playerInfo: playerInfoForShop,
    isScrollLockActive: _isScrollLockActive,
    setIsScrollLockActive: _setIsScrollLockActive,
    getItemById: getItemById,

    // Minigame context values
    activeMinigame: _activeMinigame,
    openMinigame,
    closeMinigame,
  }), [
    _currentPlayer, _isLoading, _isPiBrowser, _onboardingStep, _messages, _dailyTeamCode, _pendingPiId,
    _isTODWindowOpen, _todWindowTitle, _todWindowContent, _todWindowOptions,
    playerInfoForShop, addMessage, openTODWindow, closeTODWindow, attemptLoginWithPiId, handleAuthentication,
    setFactionAppContext, setPlayerSpyNameAppContext, updatePlayerStatsAppContext, addXp, logout,
    updatePlayerInventoryItemStrength, spendElint, purchaseItem, addItemToInventory, removeItemFromInventory,
    deployItemToVault, openInventoryTOD, closeInventoryTOD, _setOnboardingStep, _setIsLoading,
    _isSpyShopActive, _isSpyShopOpen, _shopSearchTerm, _setShopSearchTerm, _isShopAuthenticated, _setIsShopAuthenticated,
    _isScrollLockActive, _setIsScrollLockActive,
    _activeMinigame, openMinigame, closeMinigame
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
      {/* Conditionally render the full-screen minigame */}
      {_activeMinigame && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <MinigameRenderer activeMinigame={_activeMinigame} onMinigameComplete={closeMinigame} />
        </div>
      )}
    </AppContext.Provider>
  );
}

// Helper component to render the appropriate minigame
interface MinigameRendererProps {
  activeMinigame: MinigameArguments;
  onMinigameComplete: (success: boolean, strengthReduced: number, toolDamageAmount?: number) => void;
}

const MinigameRenderer: React.FC<MinigameRendererProps> = ({ activeMinigame, onMinigameComplete }) => {
  const { theme: currentGlobalTheme } = useTheme();

  switch (activeMinigame.type) {
    case 'QuantumCircuitWeaver':
      const qcProps = activeMinigame.props as { lockLevel: ItemLevel };
      return (
        <QuantumCircuitWeaver
          lockLevel={qcProps.lockLevel}
          onGameComplete={(success, strengthReduced) => onMinigameComplete(success, strengthReduced)}
        />
      );
    case 'KeyCracker':
      const kcProps = activeMinigame.props as {
        lock: HardwareItem;
        attackingTool: InfiltrationGearItem;
        fortifiers: LockFortifierItem[];
        attackerLevel: ItemLevel;
        defenderLevel?: ItemLevel;
      };
      return (
        <KeyCracker
          lockData={kcProps.lock}
          attackingTool={kcProps.attackingTool}
          fortifiers={kcProps.fortifiers}
          attackerLevel={kcProps.attackerLevel}
          defenderLevel={kcProps.defenderLevel}
          onGameComplete={onMinigameComplete}
        />
      );
    case 'NotImplemented':
      const messageProps = activeMinigame.props as { message: string };
      return (
        <HolographicPanel title="Minigame Not Implemented" explicitTheme={currentGlobalTheme} className="w-full h-full max-w-2xl">
          <p className="text-xl text-red-400 animate-pulse">{messageProps.message}</p>
          <p className="text-sm text-muted-foreground mt-2">Lock: {activeMinigame.lockData.name} L{activeMinigame.lockData.level}</p>
          <HolographicButton onClick={() => onMinigameComplete(false, 0)} className="mt-4">
            Return to Vault
          </HolographicButton>
        </HolographicPanel>
      );
    default:
      return (
        <HolographicPanel title="Unknown Minigame" explicitTheme={currentGlobalTheme} className="w-full h-full max-w-2xl">
          <p className="text-xl text-red-400">An unknown minigame type was requested.</p>
          <HolographicButton onClick={() => onMinigameComplete(false, 0)} className="mt-4">
            Return to Vault
          </HolographicButton>
        </HolographicPanel>
      );
  }
};


export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return {
    ...context,
    getItemById: getItemById,
  };
}

export { FIXED_DEV_PI_ID };
