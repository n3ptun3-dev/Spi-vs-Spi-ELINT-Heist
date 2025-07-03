// src/lib/game-items.ts
// MODIFIED BY LEXI (v14): Resolved "ReferenceError: level is not defined" for EPC's
// levelCapacity by moving its assignment into the generateItemLevels function's
// conditional logic for NexusUpgrades, ensuring 'level' is in scope.

// This file defines the data structures and item lists for the Spi vs Spi game.
// It includes interfaces for various item categories and populated arrays of example items.

// Import ITEM_LEVEL_COLORS_CSS_VARS from the constants file for consistency
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

// ItemLevel now includes 0
export type ItemLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// Define and export ITEM_LEVELS array for easier iteration and use in other components
export const ITEM_LEVELS: ItemLevel[] = [1, 2, 3, 4, 5, 6, 7, 8]; // This array still represents valid *item* levels

export interface GameItemBase {
  id: string; // Unique per level, e.g. "cypher_lock_l1"
  name: string; // Base name, e.g., "Cypher Lock" - level will be appended in display
  title?: string; // Fully formatted title for display, e.g., "Cypher Lock L1"
  description: string;
  level: ItemLevel;
  cost: number; // ELINT cost
  scarcity: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Super Rare' | 'Scarce';
  category: ItemCategory;
  imageSrc?: string; // Relative path or URL for item image (for detail view) - now defaults to .jpg
  tileImageSrc?: string; // Relative path or URL for item tile in grid view (can be same as imageSrc or different) - now defaults to .jpg
  dataAiHint?: string; // Corrected to camelCase as per standard practice for property names
  colorVar: keyof typeof ITEM_LEVEL_COLORS_CSS_VARS;
  
  // Detailed properties - some are optional and category-specific
  strength?: { current: number, max: number }; // For Hardware, Lock Fortifiers
  resistance?: { current: number, max: number }; // For Hardware, Lock Fortifiers
  minigameEffect?: string; // For Hardware, Lock Fortifiers, Infiltration Gear, Nexus Upgrades, Assault Tech
  attackFactor?: number; // For Infiltration Gear
  type?: 'One-Time Use' | 'Rechargeable' | 'Consumable' | 'Not Applicable' | 'Permanent'; // Added 'Permanent'
  perUseCost?: number; // For rechargeable items
  functionDescription?: string; // For Lock Fortifiers, Nexus Upgrades, Assault Tech
  levelScalingNote?: string; // For Infiltration Gear
  lockTypeEffectiveness?: { // For Infiltration Gear
    idealCounterAgainst: string[];
    poorMatchPenaltyAgainst?: string[];
    idealMatchBonus?: string;
  };
  strengthPerEntryClarification?: string; // For Infiltration Gear
  lockFortifierEffectsDefinition?: string; // For Infiltration Gear
  specialEffectsDefinition?: string; // For Infiltration Gear
  rechargeCost?: number; // For Nexus Upgrades (per full recharge)
  rechargeCapacity?: string; // For Nexus Upgrades (e.g., "10 alerts", "100 strength points")
  destructionDescription?: string; // For Nexus Upgrades
  cooldown?: string; // For Nexus Upgrades
  placement?: string; // For Nexus Upgrades, Assault Tech
  durability?: string; // For Nexus Upgrades, Assault Tech
  repurchaseCost?: number; // For Assault Tech, some Nexus Upgrades (Made optional here)
  idealMatch?: string; // For Assault Tech
  poorMatch?: string;
  themeKey?: string; // For Aesthetic Schemes
  itemTypeDetail?: string; // General type detail if not covered by category
  functionText?: string; // Alternative to functionDescription
  keyCrackerInfluence?: string; // Alternative to minigameEffect
  maxStrength?: number; // Used in AppContext for PlayerInventoryItem
  
  // New fields for managing charges/uses/alerts for progress bars
  currentUses?: number; // Current uses/charges/alerts left for an instance of the item (for infiltration gear/assault tech)
  maxUses?: number; // Maximum uses/charges/alerts for an instance of the item (for infiltration gear/assault tech)
  
  // Specific fields for clarity, though currentUses/maxUses can be generic
  currentAlerts?: number; // For Security Camera
  maxAlerts?: number; // For Security Camera
  currentCharges?: number; // For rechargeable fortifiers
  maxCharges?: number; // For rechargeable fortifiers
  // New fields for Hardware (Locks) recharge
  maxRechargeInitiations?: number; // Total number of times a lock can be recharged over its lifetime
  perInitiationRechargeCost?: number; // Cost to initiate one 20% refill
}

// --- Specific Item Type Interfaces (Extending GameItemBase) ---
export interface HardwareItem extends GameItemBase {
  category: 'Hardware';
  strength: { current: number, max: number };
  resistance: { current: number, max: number };
  maxRechargeInitiations: number;
  perInitiationRechargeCost: number;
}

export interface LockFortifierItem extends GameItemBase {
  category: 'Lock Fortifiers';
  strength: { current: number, max: number };
  resistance: { current: number, max: number };
  type: 'One-Time Use' | 'Rechargeable';
  functionDescription: string;
  currentCharges?: number; // Specific for fortifiers
  maxCharges?: number; // Specific for fortifiers
  perUseCost?: number; // Only for rechargeable
}

export interface InfiltrationGearItem extends GameItemBase {
  category: 'Infiltration Gear';
  attackFactor: number;
  type: 'One-Time Use' | 'Rechargeable' | 'Consumable' | 'Not Applicable';
  levelScalingNote: string;
  lockTypeEffectiveness: {
    idealCounterAgainst: string[];
    poorMatchPenaltyAgainst?: string[];
    idealMatchBonus?: string;
  };
  strengthPerEntryClarification: string;
  lockFortifierEffectsDefinition: string;
  specialEffectsDefinition?: string; // Optional, only for some
  perUseCost?: number; // Only for rechargeable
  currentUses?: number; // For all infiltration gear that has uses (rechargeable/consumable)
  maxUses?: number; // For all infiltration gear that has uses (rechargeable/consumable)
}

export interface NexusUpgradeItem extends GameItemBase {
  category: 'Nexus Upgrades';
  functionDescription: string;
  placement: string;
  durability: 'Rechargeable' | 'Permanent' | 'One-Time Use'; // More specific
  rechargeCost?: number; // Only for rechargeable (cost for full recharge)
  rechargeCapacity?: string; // Only for rechargeable (e.g., "10 alerts", "100 strength points")
  destructionDescription?: string;
  cooldown?: string;
  repurchaseCost?: number; // Only for one-time use
  processingPowerBoost?: number; // Example for specific upgrades
  
  // Specific fields for Nexus Upgrades (e.g., ERS strength)
  itemTypeDetail: 'Security Camera' | 'Reinforced Foundation' | 'Emergency Repair System' | 'Emergency Power Cell';
  
  // For Security Camera
  currentAlerts?: number;
  maxAlerts?: number;

  // For ERS specifically:
  currentCharge?: number; // The current amount of strength in the ERS (starts full at levelCapacity)
  levelCapacity?: number; // The max strength for THIS ERS's level (e.g., 100 for L1, 800 for L8)
  globalMaxCapacity?: number; // The absolute max strength any ERS can reach (always 800)
}

export interface AssaultTechItem extends GameItemBase {
  category: 'Assault Tech';
  functionDescription: string;
  placement: string;
  // Simplified durability to string for flexibility with descriptive text
  durability: string; 
  repurchaseCost?: number; // Made optional here to align with how it's provided in generateItemLevels
  idealMatch?: string;
  poorMatch?: string;
  currentUses?: number; // For tracking single-use consumables if needed for UI (e.g. quantity left in stack)
  maxUses?: number; // For tracking single-use consumables if needed for UI
}

export interface AestheticSchemeItem extends GameItemBase {
  category: 'Aesthetic Schemes';
  themeKey: string;
}

// Categories
export type ItemCategory =
  | 'Hardware'
  | 'Lock Fortifiers'
  | 'Nexus Upgrades'
  | 'Infiltration Gear'
  | 'Assault Tech'
  | 'Aesthetic Schemes';

// Helper function to calculate scaled values based on level
function calculateScaledValue(
  level: ItemLevel,
  baseValue: number,
  maxValue: number,
  minLevel: ItemLevel = 1,
  maxLevel: ItemLevel = 8
): number {
  if (level < minLevel || level > maxLevel) {
    return Math.round(baseValue);
  }
  if (minLevel === maxLevel) return Math.round(baseValue);
  
  const increment = (maxValue - baseValue) / (maxLevel - minLevel);
  return Math.round(baseValue + (level - minLevel) * increment);
}

// Define common properties that are generated by the function and should be omitted from commonProps
type GeneratedProps =
  | 'id'
  | 'name'
  | 'level'
  | 'title'
  | 'colorVar'; // Removed imageSrc, tileImageSrc, dataAiHint from here

// --- NEW: generateItemLevels helper function ---
function generateItemLevels<K extends GameItemBase>( // K is the specific item type (e.g., HardwareItem)
  baseId: string,
  baseName: string,
  commonProps: Partial<K>,
  levelConfigs: Array<Partial<K> & { cost: number; scarcity: GameItemBase['scarcity']; }>
): K[] {
  return ITEM_LEVELS.map(level => { // Renamed 'l' to 'level' for clarity in this specific map
    const effectiveLevel = level === 0 ? 1 : level;
    const levelConfig = levelConfigs[effectiveLevel - 1];
    
    const cost = levelConfig?.cost ?? 0;
    const scarcity = levelConfig?.scarcity ?? 'Common';
    
    let fileExtension: 'jpg' | 'png' = 'png';
    const jpgPriorityHardwareItems = [
      'cypher_lock', 'quantum_entanglement_lock', 'reinforced_deadbolt', 'sonic_pulse_lock', 'dummy_node', 'feedback_loop', 'sonic_dampener', 
    ];

    if (commonProps.category === 'Hardware' && jpgPriorityHardwareItems.includes(baseId)) {
      fileExtension = 'jpg';
    }

    let itemImageSrc: string;
    let itemTileImageSrc: string;
    let itemDataAiHint = commonProps.dataAiHint;
    const defaultImage = '/Spi vs Spi icon.png';
    const defaultAiHint = baseName.toLowerCase().split(' ').slice(0, 2).join(' ') || "item icon";
    
    let currentUses: number | undefined = undefined;
    let maxUses: number | undefined = undefined;
    let currentAlerts: number | undefined = undefined;
    let maxAlerts: number | undefined = undefined;
    let currentCharges: number | undefined = undefined;
    let maxCharges: number | undefined = undefined;
    let perUseCost: number | undefined = undefined; 
    let itemStrength: { current: number; max: number } | undefined = undefined;
    let maxRechargeInitiations: number | undefined = undefined;
    let perInitiationRechargeCost: number | undefined = undefined;

    // New properties for Nexus Upgrades
    let currentCharge: number | undefined = undefined;
    let levelCapacity: number | undefined = undefined;
    let globalMaxCapacity: number | undefined = undefined;
    let specificItemTypeDetail: NexusUpgradeItem['itemTypeDetail'] | undefined = undefined;

    if (commonProps.category === 'Hardware') {
      itemImageSrc = `/spyshop/items/hardware/${baseId}_l${effectiveLevel}.${fileExtension}`;
      itemTileImageSrc = itemImageSrc;
      itemDataAiHint = itemDataAiHint || `${baseName.toLowerCase().split(' ')[0]} lock`;
      
      const hardwareProps = commonProps as Partial<HardwareItem>;
      const hardwareMaxStr = levelConfig.strength?.max ?? hardwareProps.strength?.max ?? 0;
      const hardwareCurrentStr = levelConfig.strength?.current ?? hardwareProps.strength?.current ?? hardwareMaxStr;
      
      itemStrength = { current: hardwareCurrentStr, max: hardwareMaxStr };
      maxRechargeInitiations = effectiveLevel;
      perInitiationRechargeCost = Math.round((hardwareMaxStr / 5) * 0.2);
    } else if (commonProps.category === 'Infiltration Gear') {
      itemImageSrc = `/spyshop/items/infiltration_gear/${baseId}_l${effectiveLevel}.${fileExtension}`;
      itemTileImageSrc = itemImageSrc;
      itemDataAiHint = itemDataAiHint || `${baseName.toLowerCase().split(' ')[0]} tool`;
      
      if (commonProps.type === 'Rechargeable') {
        maxUses = 100;
        currentUses = maxUses;
        perUseCost = Math.round((cost * 0.01) + (5 * effectiveLevel));
      } else if (commonProps.type === 'Consumable' || commonProps.type === 'One-Time Use') {
        maxUses = 1;
        currentUses = 1;
      }
    } else if (commonProps.category === 'Lock Fortifiers') {
        itemImageSrc = `/spyshop/items/lock_fortifiers/${baseId}_l${effectiveLevel}.${fileExtension}`;
        itemTileImageSrc = itemImageSrc;
        itemDataAiHint = itemDataAiHint || `${baseName.toLowerCase().split(' ')[0]} fortifier`;
        
        const fortifierProps = commonProps as Partial<LockFortifierItem>;
        const fortifierMaxStr = levelConfig.strength?.max ?? fortifierProps.strength?.max ?? 0;
        const fortifierCurrentStr = levelConfig.strength?.current ?? fortifierProps.strength?.current ?? fortifierMaxStr;
        
        itemStrength = { current: fortifierCurrentStr, max: fortifierMaxStr };
        if (commonProps.type === 'Rechargeable') {
          maxCharges = 100;
          currentCharges = maxCharges;
          perUseCost = Math.round((cost * 0.01) + (5 * effectiveLevel));
        } else if (commonProps.type === 'One-Time Use') {
          maxCharges = 1;
          currentCharges = 1;
        }
    } else if (commonProps.category === 'Nexus Upgrades') {
        itemImageSrc = `/spyshop/items/nexus_upgrades/${baseId}_l${effectiveLevel}.${fileExtension}`;
        itemTileImageSrc = itemImageSrc;
        itemDataAiHint = itemDataAiHint || `${baseName.toLowerCase().split(' ')[0]} upgrade`;
        
        // Determine itemTypeDetail based on baseName
        if (baseName === 'Security Camera') {
            specificItemTypeDetail = 'Security Camera';
            maxAlerts = effectiveLevel * 10;
            currentAlerts = maxAlerts;
        } else if (baseName === 'Reinforced Foundation') {
            specificItemTypeDetail = 'Reinforced Foundation';
        } else if (baseName === 'Emergency Repair System (ERS)') {
            specificItemTypeDetail = 'Emergency Repair System';
            currentCharge = calculateScaledValue(effectiveLevel, 100, 800); // Current charge based on level
            levelCapacity = calculateScaledValue(effectiveLevel, 100, 800); // Capacity at this level
            globalMaxCapacity = 800; // Fixed absolute max capacity for ERS
        } else if (baseName === 'Emergency Power Cell (EPC)') {
            specificItemTypeDetail = 'Emergency Power Cell';
            currentCharge = 1; // EPC starts at 1 charge
            levelCapacity = level; // EPC max capacity is its level
            globalMaxCapacity = 8; // Max level is 8 for EPC
        } else {
            specificItemTypeDetail = 'Reinforced Foundation';
        }
    } else if (commonProps.category === 'Assault Tech') {
        itemImageSrc = `/spyshop/items/assault_tech/${baseId}_l${effectiveLevel}.${fileExtension}`;
        itemTileImageSrc = itemImageSrc;
        itemDataAiHint = itemDataAiHint || `${baseName.toLowerCase().split(' ')[0]} tech`;
        maxUses = 1;
        currentUses = 1;
    } else if (commonProps.category === 'Aesthetic Schemes') {
        itemImageSrc = commonProps.imageSrc || defaultImage;
        itemTileImageSrc = commonProps.tileImageSrc || itemImageSrc;
    } else {
        itemImageSrc = commonProps.imageSrc || defaultImage;
        itemTileImageSrc = itemImageSrc;
    }
      
    return {
      id: `${baseId}_l${level}`,
      name: baseName,
      title: `${baseName} L${level}`,
      level: level,
      colorVar: (effectiveLevel % 8) + 1 as keyof typeof ITEM_LEVEL_COLORS_CSS_VARS,
      
      ...commonProps,
      ...levelConfig,

      imageSrc: itemImageSrc,
      tileImageSrc: itemTileImageSrc,
      dataAiHint: itemDataAiHint || defaultAiHint, // Ensure this is camelCase
      
      ...(currentUses !== undefined && { currentUses }),
      ...(maxUses !== undefined && { maxUses }),
      ...(currentAlerts !== undefined && { currentAlerts }),
      ...(maxAlerts !== undefined && { maxAlerts }),
      ...(currentCharges !== undefined && { currentCharges }),
      ...(maxCharges !== undefined && { maxCharges }),
      ...(perUseCost !== undefined && { perUseCost }),
      ...(itemStrength !== undefined && { strength: itemStrength }),
      ...(maxRechargeInitiations !== undefined && { maxRechargeInitiations }),
      ...(perInitiationRechargeCost !== undefined && { perInitiationRechargeCost }),
      
      ...(specificItemTypeDetail !== undefined && { itemTypeDetail: specificItemTypeDetail }),
      // New properties for Nexus Upgrades (ERS and EPC)
      ...(currentCharge !== undefined && { currentCharge }),
      ...(levelCapacity !== undefined && { levelCapacity }),
      ...(globalMaxCapacity !== undefined && { globalMaxCapacity }),
    } as K;
  });
}

// Item data definitions
export const HARDWARE_ITEMS: HardwareItem[] = [
  ...generateItemLevels<HardwareItem>(
    'cypher_lock', 'Cypher Lock',
    { category: 'Hardware', description: 'Basic digital barrier.', strength: { current: 100, max: 100 }, resistance: { current: 10, max: 10 }, minigameEffect: "Requires successful code entries equal to its remaining strength divided by the attacker's tool's strength per entry." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 100, 800), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Common' }))
  ),
  ...generateItemLevels<HardwareItem>(
    'reinforced_deadbolt', 'Reinforced Deadbolt',
    { category: 'Hardware', description: 'A physical barrier with added resilience.', strength: { current: 100, max: 100 }, resistance: { current: 20, max: 20 }, minigameEffect: "Higher strength. Drills remove fewer strength points per use compared to picks of the same level. Picks remove 50% less strength per use against Reinforced Deadbolts. Drills remove 75% less strength points per use compared to picks of the same level. Drills and Picks have different Strength per entry values against this lock, affecting how much each correct entry reduces the lock's strength and progresses the attacker towards bypassing the lock." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 200, 1600), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Common' }))
  ),
    ...generateItemLevels<HardwareItem>(
    'quantum_entanglement_lock', 'Quantum Entanglement Lock',
    { category: 'Hardware', description: 'Non-physical tricky tech that shrugs off some standard hits.', strength: {current: 100, max:100}, resistance: {current: 30, max:30}, minigameEffect: "Adds an extra symbol to the displayed sequence. An L8 lock injects this extra symbol every 3rd round, L7 every 4th round, L6 every 5th round, L5 every 6th round, L4 every 7th round, L3 every 8th round, L2 every 9th round, and L1 every 10th round. Code Injectors have reduced effectiveness. Sonic Pulsers have reduced effectiveness (Time Allowed Per Sequence increased by 25% less)."},
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 300, 2400), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: l < 6 ? 'Common' : 'Scarce' }))
  ),
    ...generateItemLevels<HardwareItem>(
    'sonic_pulse_lock', 'Sonic Pulse Lock',
    { category: 'Hardware', description: 'Needs specific frequencies, standard hits less effective.', strength: {current: 100, max:100}, resistance: {current: 40, max:40}, minigameEffect: "The time allowed for each entry is significantly reduced, scaling with the lock's level. The base time allowed per sequence is 20 seconds minus the lock level (e.g., L1 equals 19 seconds, L8 equals 12 seconds)."},
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 3200), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Uncommon' }))
  ),
  ...generateItemLevels<HardwareItem>(
    'plasma_conduit_lock', 'Plasma Conduit Lock',
    { category: 'Hardware', description: 'Energy flow defense, cuts standard damage in half.', strength: {current: 100, max:100}, resistance: {current: 50, max:50}, minigameEffect: "Successful entries slightly decrease the time allowed for subsequent entries. The time reduction for subsequent entries is equal to the lock's level in seconds (L1: 1s, L2: 2s, ..., L8: 8s). Code Injectors have reduced effectiveness against this lock, and the tool's Strength per entry is halved." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 100, 800), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Uncommon' }))
  ),
  ...generateItemLevels<HardwareItem>(
    'biometric_seal', 'Biometric Seal',
    { category: 'Hardware', description: 'Biological key required, very resistant to non-specific attacks.', strength: {current: 100, max:100}, resistance: {current: 60, max:60}, minigameEffect: "Very high strength. Introduces occasional micro-stutters or pauses in the symbol display. The symbols flash and hide while being displayed. The frequency at which the symbols disappear increases with the lock's level: L1 and L2 every 4s, L3 and L4 every 3s, L5 and L6 every 2s, and L7 and L8 every 1s. The duration for which the symbols disappear also increases with the lock's level: L1 for 0.1s, up to L8 for 0.8s. Picks are less effective; they remove half the normal strength per use. Code Injectors have reduced effectiveness (50% less reduction of 'Symbols Displayed')." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 4800), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Rare' }))
  ),
  ...generateItemLevels<HardwareItem>(
    'neural_network_lock', 'Neural Network Lock',
    { category: 'Hardware', description: 'Non-physical lock that adapts and evolves, learning to resist intrusions.', strength: {current: 100, max:100}, resistance: {current: 70, max:70}, minigameEffect: "Very high strength. The number of symbols displayed in each sequence gradually increases. The base number of symbols increases with the lock's level (L1 starts with 6, L2 with 7, up to L8 starting with 13). For every two successful entries, the number of displayed symbols increases by one. Drills are ineffective; they do not reduce the lock's strength." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 700, 5600), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Rare' }))
  ),
  ...generateItemLevels<HardwareItem>(
    'temporal_flux_lock', 'Temporal Flux Lock',
    { category: 'Hardware', description: 'Non-physical lock that warps time around the secured data.', strength: {current: 100, max:100}, resistance: {current: 80, max:80}, minigameEffect: "Its strength, and therefore the number of 'Required Successful Entries', increases over time, scaling with its level (e.g., L1 increases by 5 strength per second, up to L8 increasing by 40 strength per second). Code Injectors are ineffective against this lock. Sonic Pulsers have reduced effectiveness (Time Allowed Per Sequence increased by 25% less)."},
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 6400), strength: {current: calculateScaledValue(l, 100, 800), max: calculateScaledValue(l, 100, 800)}, scarcity: 'Very Rare' }))
  ),
];

export const LOCK_FORTIFIER_ITEMS: LockFortifierItem[] = [
  ...generateItemLevels<LockFortifierItem>(
    'dummy_node', 'Dummy Node',
    { category: 'Lock Fortifiers', description: 'Negates successful entries.', strength: {current: 100, max:100}, resistance: {current:10, max:10}, type: 'One-Time Use', functionDescription: 'Increases the number of "Correct Entries Required" by an amount equal to the Dummy Node\\\'s level. This is an additive increase, separate from the lock\\\'s strength. For example, an L3 Dummy Node increases the required entries by 3.', minigameEffect: 'Increases the number of "Correct Entries Required" by an amount equal to the Dummy Node\\\'s level. This is an additive increase, separate from the lock\\\'s strength. For example, an L3 Dummy Node increases the required entries by 3.' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), scarcity: 'Scarce' }))
  ),
  ...generateItemLevels<LockFortifierItem>(
    'neural_feedback_spore', 'Neural Feedback Spore',
    { category: 'Lock Fortifiers', description: 'Sends a disruptive neural burst back through an attacker\\\'s link when struck, potentially disabling their gadget briefly.', strength: {current: 100, max:100}, resistance: {current: 20, max:20}, type: 'Rechargeable', functionDescription: 'Randomizes the symbol keypad. An L8 lock randomizes the keypad every 3rd round, L7 every 4th round, L6 every 5th round, L5 every 6th round, L4 every 7th round, L3 every 8th round, L2 every 9th round, and L1 every 10th round.', minigameEffect: 'Randomizes the order of the symbols the player has to select. The randomization follows a circular shift pattern, where each symbol shifts a fixed number of positions. The shift amount changes with each randomization to create a new, unpredictable layout.' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 1500), scarcity: 'Super Rare' }))
  ),
  ...generateItemLevels<LockFortifierItem>(
    'feedback_loop', 'Feedback Loop',
    { category: 'Lock Fortifiers', description: 'Sends disruptive feedback back at attacking electronic gadgets when hit, potentially damaging or stunning them.', strength: {current: 100, max:100}, resistance: {current: 30, max:30}, type: 'Rechargeable', functionDescription: 'Damages the attacker\\\'s tool upon a failed entry. The damage dealt is equal to the level of the Feedback Loop.', minigameEffect: 'Does not directly affect the Key Cracker, but penalizes the attacker for incorrect entries. Code Injectors have reduced effectiveness (50% less reduction of \\\'Symbols Displayed\\\').' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), scarcity: 'Scarce' }))
  ),
  ...generateItemLevels<LockFortifierItem>(
    'sonic_dampener', 'Sonic Dampener',
    { category: 'Lock Fortifiers', description: 'Absorbs or shifts incoming sonic attack frequencies, making sonic-based breaches difficult. Sonic Pulser\\\'s time bonus is halved.', strength: {current: 100, max:100}, resistance: {current: 40, max:40}, type: 'Rechargeable', functionDescription: 'Makes Drills completely ineffective.', minigameEffect: 'Prevents the use of Hydraulic Drills (they do 0 damage).' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), scarcity: 'Scarce' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<LockFortifierItem>(
    'adaptive_shield', 'Adaptive Shield',
    { category: 'Lock Fortifiers', description: 'Boosts the defense of its attached lock and itself after taking damage, adapting to the incoming attack type.', strength: {current: 100, max:100}, resistance: {current: 50, max:50}, type: 'Rechargeable', functionDescription: 'Increases the lock\\\'s resistance by an amount equal to its level times 10.', minigameEffect: 'Increases the lock\\\'s resistance by an amount equal to its level times 10. This increased resistance raises the number of "Correct Entries Required" to bypass the lock, as more entries are needed to reduce the lock\\\'s strength. Formula: Required Entries = Lock Strength / (Attacker\\\'s Tool Strength / (1 + (Lock Resistance / 100))).'},
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), scarcity: 'Scarce' }))
  ),
  ...generateItemLevels<LockFortifierItem>(
    'temporal_anchor', 'Temporal Anchor',
    { category: 'Lock Fortifiers', description: 'Stabilizes the local temporal field around its lock, making attacks that manipulate time or rely on precise sequences unreliable.', strength: {current: 100, max:100}, resistance: {current: 60, max:60}, type: 'Rechargeable', functionDescription: 'Periodically reverses a portion of the correctly entered sequence. An L8 lock reverses the sequence every 3rd round, L7 every 4th round, L6 every 5th round, L5 every 6th round, L4 every 7th round, L3 every 8th round, L2 every 9th round, and L1 every 10th round. The Key Cracker display should indicate that the code should be entered in reverse order.', minigameEffect: 'Periodically reverses a portion of the currently displayed input sequence. The frequency of this reversal scales with the Temporal Anchor\\\'s level (e.g., L1 reverses every 5 seconds, up to L8 reversing every 1 second). This means that only the symbols the player is currently entering will be reversed, not the entire sequence required to unlock the lock.' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 1300), scarcity: 'Rare' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<LockFortifierItem>(
    'entanglement_field_inhibitor', 'Entanglement Field Inhibitor',
    { category: 'Lock Fortifiers', description: 'Actively disrupts quantum entanglement fields around its lock, making quantum-based attacks unstable and unreliable.', strength: {current: 100, max:100}, resistance: {current: 70, max:70}, type: 'Rechargeable', functionDescription: 'Inserts random emojis into the displayed code, with the amount equal to the inhibitor\\\'s level (L1 adds 1 emoji, L2 adds 2, etc.). Additionally, when an incorrect sequence is entered, the lock failure resets the game. The reset amount is equal to the level number (L1 resets once, L2 resets twice, etc.).', minigameEffect: 'Adds visual clutter and increases the penalty for failure. When an incorrect sequence is entered, the lock failure resets the current lock attempt. The number of retries is reduced by an amount equal to the inhibitor\\\'s level (L1 reduces by 1, L2 reduces by 2, etc.).' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 1500), scarcity: 'Super Rare' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<LockFortifierItem>(
    'reactive_armor', 'Reactive Armor',
    { category: 'Lock Fortifiers', description: 'Explodes outwards when its strength reaches zero, potentially damaging nearby attacking gadgets.', strength: {current: 100, max:100}, resistance: {current: 80, max:80}, type: 'One-Time Use', functionDescription: 'No direct effect on the Key Cracker.', minigameEffect: 'Does not directly affect the Key Cracker. Code Injectors have reduced effectiveness (50% less reduction of \\\'Symbols Displayed\\\').', },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 1300), scarcity: 'Rare' }))
  ),
];

export const INFILTRATION_GEAR_ITEMS: InfiltrationGearItem[] = [
  ...generateItemLevels<InfiltrationGearItem>(
    'pick', 'Pick',
    { category: 'Infiltration Gear', description: 'Your standard tool. Effective against basic locks, struggles against advanced defenses.', attackFactor: 12.5, type: 'Not Applicable', minigameEffect: "Reduces the 'Correct Entries Required'.", levelScalingNote: "Reduces the number of 'Correct Entries Required' by 1 per level.", lockTypeEffectiveness: { idealCounterAgainst: ["Cypher Lock"], poorMatchPenaltyAgainst: ["Reinforced Deadbolt"]}, strengthPerEntryClarification: "The Pick's Attack Factor functions as its 'strength per entry.' Each level of the pick has a corresponding Attack Factor, scaling from 12.5 at Level 1 to 100 at Level 8. This Attack Factor is used in the formula to determine how much the lock's strength is reduced per successful entry.", lockFortifierEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: l === 1 ? 0 : calculateScaledValue(l, 200, 800, 2, 8), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Common' }))
  ),
  ...generateItemLevels<InfiltrationGearItem>(
    'hydraulic_drill', 'Hydraulic Drill',
    { category: 'Infiltration Gear', description: 'A heavy-duty tool. Slow but effective against resilient barriers.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Slightly increases the 'Time Allowed Per Sequence'.", levelScalingNote: "Increases the 'Time Allowed Per Sequence' by 1 second per level of the drill.", lockTypeEffectiveness: { idealCounterAgainst: ["Reinforced Deadbolt"], poorMatchPenaltyAgainst: ["Quantum Entanglement Lock", "Neural Network Lock", "Temporal Flux Lock"]}, strengthPerEntryClarification: "The Hydraulic Drill's Attack Factor functions as its 'strength per entry.' Drills remove fewer strength points per use compared to picks of the same level.", lockFortifierEffectsDefinition: "Not applicable to this tool.",
    },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 200, 900), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Common' })) // currentUses/maxUses calculated in generateItemLevels, perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<InfiltrationGearItem>(
    'code_injector', 'Code Injector',
    { category: 'Infiltration Gear', description: 'A precision tool. Best against logic-based defenses, weak against others. Injects code to reduce symbols.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Reduces the number of 'Symbols Displayed' by 1 per level of the injector. This reduction is halved (rounded down) when used against Quantum Entanglement Locks and Plasma Conduit Locks. The tool's Strength per entry is halved against Plasma Conduit Locks.", levelScalingNote: "Reduces the number of 'Symbols Displayed' by 1 per level of the injector (halved against Quantum Entanglement Locks).", lockTypeEffectiveness: { idealCounterAgainst: ["Cypher Lock", "Neural Network Lock"], idealMatchBonus: "Damage dealt to these targets is multiplied by 1.5.", poorMatchPenaltyAgainst: ["Biometric Seal", "Reactive Armor", "Feedback Loop"]}, strengthPerEntryClarification: "The Code Injector's Attack Factor functions as its 'strength per entry.'", lockFortifierEffectsDefinition: "Not applicable to this tool.", specialEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Scarce' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<InfiltrationGearItem>(
    'sonic_pulser', 'Sonic Pulser',
    { category: 'Infiltration Gear', description: 'A frequency-based tool. Effective against sound-based defenses.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Slightly increases the 'Time Allowed Per Sequence'.", levelScalingNote: "Increases the 'Time Allowed Per Sequence' by 0.5 seconds per level of the pulser.", lockTypeEffectiveness: { idealCounterAgainst: ["Sonic Pulse Lock"], poorMatchPenaltyAgainst: ["Temporal Flux Lock", "Quantum Entanglement Lock"]}, strengthPerEntryClarification: "The Sonic Pulser's Attack Factor functions as its 'strength per entry.'", lockFortifierEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 400, 1100), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Scarce' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<InfiltrationGearItem>(
    'bio_scanner_override', 'Bio-Scanner Override',
    { category: 'Infiltration Gear', description: 'Bypasses biological security measures.', attackFactor: 12.5, type: 'Consumable', minigameEffect: "Reduces the number of 'Correct Entries Required' against Biometric Seals.", levelScalingNote: "Reduces the 'Correct Entries Required' by 2 per level of the override.", lockTypeEffectiveness: { idealCounterAgainst: ["Biometric Seal"], poorMatchPenaltyAgainst: ["Other lock types"]}, strengthPerEntryClarification: "The Bio-Scanner Override's Attack Factor functions as its 'strength per entry.'", lockFortifierEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 1300), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Rare' }))
  ),
 ...generateItemLevels<InfiltrationGearItem>(
    'temporal_dephaser', 'Temporal Dephaser',
    { category: 'Infiltration Gear', description: 'Manipulates time flow. Effective against time-based defenses.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Increases the 'Time Allowed Per Sequence' and may reverse the sequence.", levelScalingNote: "Increases the 'Time Allowed Per Sequence' by 0.75 seconds per level. The probability of reversing the sequence increases by 10% per level.", lockTypeEffectiveness: { idealCounterAgainst: ["Temporal Flux Lock", "Temporal Anchor"], poorMatchPenaltyAgainst: ["Other lock types"]}, strengthPerEntryClarification: "The Temporal Dephaser's Attack Factor functions as its 'strength per entry.'", specialEffectsDefinition: "The 'reverse the sequence' effect is a special effect that Temporal Locks have. The Temporal Dephaser is effective against this.", lockFortifierEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 1500), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Super Rare' })) // perUseCost calculated in generateItemLevels
  ),
 ...generateItemLevels<InfiltrationGearItem>(
    'quantum_dephaser', 'Quantum Dephaser',
    { category: 'Infiltration Gear', description: 'Disrupts quantum fields. Best against quantum-based defenses.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Reduces the 'Symbols Displayed' and may disable special effects.", levelScalingNote: "Reduces the 'Symbols Displayed' by 0.5 per level (round down). The probability of disabling special effects increases by 12.5% per level.", lockTypeEffectiveness: { idealCounterAgainst: ["Quantum Entanglement Lock", "Entanglement Field Inhibitor"], idealMatchBonus: "Damage dealt to these targets is multiplied by 1.5 OR may temporarily disable their special effects.", poorMatchPenaltyAgainst: ["Physical locks", "Electronic locks (non-quantum)", "Reactive Armor"]}, strengthPerEntryClarification: "The Quantum Dephaser's Attack Factor functions as its 'strength per entry.'", specialEffectsDefinition: "Special effects include the extra symbol added by the Quantum Entanglement Lock and the random emojis added by the Entanglement Field Inhibitor.", lockFortifierEffectsDefinition: "Not applicable to this tool." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 1500), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Super Rare' })) // perUseCost calculated in generateItemLevels
  ),
  ...generateItemLevels<InfiltrationGearItem>(
    'universal_key', 'Universal Key',
    { category: 'Infiltration Gear', description: 'The master bypass tool. Ignores defensive gadgets.', attackFactor: 12.5, type: 'Rechargeable', minigameEffect: "Disables fortifier effects on the target lock if the Universal Key's level is equal to or greater than the fortifier's level. If disabled, the fortifier's bonuses to the lock are ignored for the duration of the infiltration attempt.", levelScalingNote: "The level of the Universal Key determines the level of fortifier effects it can disable. A level X Universal Key can disable fortifier effects up to level X.", lockTypeEffectiveness: { idealCounterAgainst: ["Any lock with Lock Fortifiers"], poorMatchPenaltyAgainst: ["Locks without Lock Fortifiers"]}, strengthPerEntryClarification: "The Universal Key's Attack Factor functions as its 'strength per entry.'", lockFortifierEffectsDefinition: "Lock Fortifier effects are the special defensive gadgets that can be attached to locks, such as Dummy Node, Adaptive Shield, Feedback Loop, Sonic Dampener, Temporal Anchor, Reactive Armor, Neural Feedback Spore, and Entanglement Field Inhibitor. Mechanically, the 'Required Successful Entries' and other Key Cracker parameters should not be affected by the disabled fortifier." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 1500), attackFactor: calculateScaledValue(l, 12.5, 100), scarcity: 'Super Rare' })) // perUseCost calculated in generateItemLevels
  ),
];

export const NEXUS_UPGRADE_ITEMS: NexusUpgradeItem[] = [
    ...generateItemLevels<NexusUpgradeItem>(
    'security_camera', 'Security Camera',
    { category: 'Nexus Upgrades', description: 'Automatically detects an infiltration attempt on the Vault. Upon detection, it alerts with an audible sound, a notification and a Comms message, and provides you with an overview of the attacker: Agent Name, Level, and gadget used. The level of the Security Camera determines the amount of attacks that will create an alert before needing to be recharged. Example: A level 3 camera will alert you three separate infiltrations before it needs recharging.', functionDescription: "Alerts on attack, provides intel.", placement: "Vault-Wide Upgrade slot", durability: "Rechargeable", cooldown: "5 mins", destructionDescription: "Upon reaching the end of its total recharge capacity (initial + 10 recharges) and that capacity being fully depleted, the Security Camera gadget is destroyed and automatically removed from its Vault slot it occupied. Players will receive in-game notification when a Security Camera is destroyed this way.", itemTypeDetail: 'Security Camera' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 6400), rechargeCost: calculateScaledValue(l, 50, 400), rechargeCapacity: `${l*10} alerts`, scarcity: 'Scarce' })) // current/max alerts are set in generateItemLevels with specific logic
  ),
  ...generateItemLevels<NexusUpgradeItem>(
    'reinforced_foundation', 'Reinforced Foundation',
    { category: 'Nexus Upgrades', description: 'A permanent Vault upgrade that increases the inherent structural integrity and difficulty of infiltrating the Vault it is installed on. It makes the entire Vault harder to crack.', functionDescription: "Provides a passive, permanent increase to the base difficulty of infiltrating this Vault. This effect applies to all Locks installed on the Vault while the Reinforced Foundation is in place. The magnitude of the difficulty scales with the Foundation's level.", placement: "Vault-Wide Upgrade slot", durability: "Permanent", minigameEffect: 'While the Reinforced Foundation is installed, it adds a permanent penalty to the required number of successful code entries needed to bypass any Lock on this Vault. This penalty contributes to the "Vault Gadget Penalty" in the calculation for required successful attempts. The amount added scales with the Reinforced Foundation\\\'s level.', type: 'Permanent', itemTypeDetail: 'Reinforced Foundation' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 4800), scarcity: 'Common' }))
  ),
  ...generateItemLevels<NexusUpgradeItem>(
    'ers', 'Emergency Repair System (ERS)',
    { category: 'Nexus Upgrades', description: 'A crucial defensive gadget that enhances the durability of your Vault\\\'s Locks during an infiltration attempt. It acts as a reserve pool of strength that your Locks can draw upon before their own structural integrity is compromised.', functionDescription: "Provides a reserve of strength exclusively for Locks installed on the Vault. This reserve is depleted before the Lock's own strength is affected when taking damage. It takes effect automatically and immediately upon a Lock receiving damage. The ERS does not affect Lock Fortifiers or other items. An ERS’s strength is shared between the installed locks. ERS gadgets range from Level 1 (100 strength) through to Level 8 (800 strength). When an ERS is active, its effective strength is made available to the Locks on the vault. For instance, a single L1 Lock protected by an L8 ERS effectively has the strength of a L8 Lock plus its own L1 base strength, as the ERS reserve is used first.", placement: "Vault-Wide Upgrade slot", durability: "Rechargeable", cooldown: "1 hour", destructionDescription: "Upon reaching the end of its total recharge capacity (initial + 3 recharges) and that capacity being fully depleted, the Security Camera gadget is destroyed and automatically removed from its Vault slot it occupied. Players will receive in-game notification when an ERS is destroyed this way.", minigameEffect: 'Increases the target\\\'s Lock Strength by an amount equal to its level. This increases the number of \\\'Required Successful Entries\\\' needed to bypass the target.', itemTypeDetail: 'Emergency Repair System' },
    ITEM_LEVELS.map(level => ({ // Renamed 'l' to 'level' here
      cost: calculateScaledValue(level, 1000, 8000), 
      rechargeCost: calculateScaledValue(level, 75, 600), 
      rechargeCapacity: `${level*100} strength points`, 
      scarcity: 'Rare',
      currentCharge: calculateScaledValue(level, 100, 800), // Current charge based on level (starts full)
      levelCapacity: calculateScaledValue(level, 100, 800), // Max capacity for THIS ERS level
      globalMaxCapacity: 800, // Absolute max capacity for any ERS
    }))
  ),
    ...generateItemLevels<NexusUpgradeItem>(
    'epc', 'Emergency Power Cell (EPC)',
    { category: 'Nexus Upgrades', description: 'A single-use defensive gadget designed to provide an immediate boost to your Vault\\\'s defenses when under infiltration. It\\\'s a quick shot of energy to help weather an unexpected assault.', functionDescription: "The Emergency Power Cell provides a defensive effect when an attacker is engaged in an infiltration. It increases the difficulty of the lock’s Key Cracker.", placement: "Vault-Wide Upgrade slot", durability: "One-Time Use", destructionDescription: "This gadget is consumed when its strength reaches zero. The Power Cell has a 'strength' equal to its level (an L1 EPC has 1 strength, an L8 EPC has 8 strength). Once the EPC's strength is depleted to 0, the Emergency Power Cell is destroyed and automatically removed from its Vault slot. Players will receive in-game notification when an EPC is destroyed this way.", minigameEffect: 'When the EPC is active, it increases the difficulty of the Key Cracker by adding 3 extra digits to the code sequence the attacker must remember. Each time the attacker successfully enters a code sequence while the EPC is active, the EPC\\\'s strength is reduced by 1.', itemTypeDetail: 'Emergency Power Cell',
        currentCharge: 1, // EPC starts at 1 charge
        // levelCapacity: level, // This line was causing the error, commented out
        globalMaxCapacity: 8, // Max level is 8 for EPC
    },
    ITEM_LEVELS.map(level => ({ // Renamed 'l' to 'level' here
      cost: calculateScaledValue(level, 1200, 9600), 
      repurchaseCost: calculateScaledValue(level, 800, 6400), 
      scarcity: 'Super Rare',
      levelCapacity: level, // Moved levelCapacity assignment here
    }))
  ),
];

export const ASSAULT_TECH_ITEMS: AssaultTechItem[] = [
  ...generateItemLevels<AssaultTechItem>(
    'system_hack', 'System Hack',
    { category: 'Assault Tech', description: 'A single-use offensive program designed to reduce the difficulty of bypassing a target Vault\\\'s Locks during an infiltration attempt.', functionDescription: "When used against a target Lock during an infiltration, the System Hack reduces the difficulty of bypassing that specific Lock. The magnitude of the difficulty reduction scales with the System Hack's level.", placement: "Used from the player's Inventory against a selected Lock during an active infiltration attempt. It does not occupy a Vault slot.", durability: "Single-use, consumable upon activation against a Lock.", minigameEffect: 'When the System Hack is used on a target Lock, it reduces the required number of successful code entries needed to bypass that Lock. This reduction contributes to the "Attacking Gadget Multiplier" effect in the calculation for required successful attempts. The amount of reduction scales with the System Hack\\\'s level.'} ,
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 800, 6400), repurchaseCost: calculateScaledValue(l, 640, 5120), scarcity: 'Scarce' }))
  ),
    ...generateItemLevels<AssaultTechItem>(
    'stealth_program', 'Stealth Program',
    { category: 'Assault Tech', description: 'A single-use offensive program designed to help an attacker avoid detection and defensive countermeasures during an infiltration attempt.', functionDescription: "When activated during an infiltration, the Stealth Program makes the attacker harder to detect by defensive systems like Security Cameras or makes it more difficult for the defender to manually activate certain countermeasures like the Emergency Power Cell for a limited duration. The effectiveness and duration of the stealth effect scale with the Stealth Program's level.", placement: "Used from the player's Inventory during an active infiltration attempt. It does not occupy a Vault slot.", durability: "Single-use, consumable upon activation.", minigameEffect: 'While the Stealth Program is active, it reduces the number of digits in the code sequence the attacker must remember. The reduction in digits scales with the Stealth Program\\\'s level (e.g., reduces digits by Level * 1), making the code easier to memorize.', idealMatch: "Security Camera", poorMatch: "Emergency Power Cell, Reinforced Foundation (Gadgets that directly affect code difficulty or required attempts/ are not directly countered by stealth)." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 600, 4800), repurchaseCost: calculateScaledValue(l, 480, 3840), scarcity: 'Common' }))
  ),
  ...generateItemLevels<AssaultTechItem>(
    'code_scrambler', 'Code Scrambler',
    { category: 'Assault Tech', description: 'A single-use offensive program designed to disrupt the defender\\\'s ability to react effectively during an infiltration by interfering with their visual interface.', functionDescription: "When activated during an infiltration, the Code Scrambler interferes with the defender's view of the Key Cracker interface, making it harder for them to accurately perceive or input information for a limited duration. The intensity and duration of the scrambling effect scale with the Code Scrambler's level.", placement: "Used from the player's Inventory during an active infiltration attempt. It does not occupy a Vault slot.", durability: "Single-use, consumable upon activation.", minigameEffect: 'When the Code Scrambler is active, it temporarily randomizes the position of the symbol buttons on the defender\\\'s Keypad interface during the code input phase. The duration of this effect scales with the Code Scrambler\\\'s level (e.g., lasts for Level * 2 code input rounds).', idealMatch: "Security Camera (Counters defender's visual intel), Emergency Power Cell (Makes manual activation harder).", poorMatch: "Emergency Repair System, Reinforced Foundation (Doesn't affect passive defensive boosts)." },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 1000, 8000), repurchaseCost: calculateScaledValue(l, 800, 6400), scarcity: 'Rare' }))
  ),
 ...generateItemLevels<AssaultTechItem>(
    'power_spike', 'Power Spike',
    { category: 'Assault Tech', description: 'A single-use offensive program designed to temporarily disable or disrupt a specific defensive gadget installed on the target Vault.', functionDescription: 'When activated during an infiltration and targeted at a specific defensive gadget (like a Security Camera or Emergency Power Cell) installed on the Vault, the Power Spike temporarily disables that gadget\\\'s active effects for a limited duration. The duration of the disable effect scales with the Power Spike\\\'s level.', placement: 'Used from the player\\\'s Inventory against a selected defensive gadget during an active infiltration attempt. It does not occupy a Vault slot.', durability: "Single-use, consumable upon activation.", minigameEffect: 'While the Power Spike is active on a defensive gadget that influences the Key Cracker (like the Emergency Power Cell or potentially a specialized Key Cracker-specific defensive gadget), the influence of that disabled gadget on the Key Cracker is nullified for the duration of the Power Spike\\\'s effect.', idealMatch: 'Security Camera, Emergency Power Cell (Gadgets with active or triggered effects).', poorMatch: 'Reinforced Foundation, Locks themselves (Gadgets with passive or inherent effects that cannot be temporarily disabled).' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 1200, 9600), repurchaseCost: calculateScaledValue(l, 960, 7680), scarcity: 'Super Rare' }))
  ),
 ...generateItemLevels<AssaultTechItem>(
    'seismic_charge', 'Seismic Charge',
    { category: 'Assault Tech', description: 'A single-use offensive program designed to bypass a portion of a target Lock\\\'s security by simulating structural stress, effectively skipping some of the required hacking process.', functionDescription: 'When used against a target Lock during an infiltration, the Seismic Charge instantly reduces the required number of successful code entries needed to bypass that specific Lock by a fixed amount. This effectively allows the attacker to skip a portion of the Key Cracker for that lock. The amount of required entries bypassed scales with the Seismic Charge\\\'s level.', placement: 'Used from the player\\\'s Inventory against a selected Lock during an active infiltration attempt. It does not occupy a Vault slot.', durability: "Single-use, consumable upon activation.", minigameEffect: 'When the Seismic Charge is used on a target Lock, it instantly reduces the required number of successful code entries needed to bypass that Lock by an amount that scales with the Seismic Charge\\\'s level (e.g., reduces required entries by Level * 10). This directly progresses the attacker towards bypassing the lock without needing to complete those specific code sequences.', idealMatch: 'Any Lock (Especially high-level Locks, as the fixed bypass amount is more valuable against a higher total requirement).', poorMatch: 'Nexus Upgrades (Low resistance locks, Non-physical Nexus Upgrades.)' },
    ITEM_LEVELS.map(l => ({ cost: calculateScaledValue(l, 1000, 8000), repurchaseCost: calculateScaledValue(l, 800, 6400), scarcity: 'Rare', currentUses: 1, maxUses: 1 }))
  ),
];

export const AESTHETIC_SCHEME_ITEMS: AestheticSchemeItem[] = [
  { id: 'aesthetic_scheme_cyphers', name: 'Team Blue', title: 'Team Blue', description: 'Default Cyphers operative theme.', level: 1, cost: 0, scarcity: 'Common', category: 'Aesthetic Schemes', themeKey: 'cyphers', colorVar: 5, imageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_cyphers_l1.jpg`, tileImageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_cyphers_l1.jpg`, dataAiHint: "blue abstract" }, // Changed 'data-ai-hint' to 'dataAiHint'
  { id: 'aesthetic_scheme_shadows', name: 'Team Red', title: 'Team Red', description: 'Standard Shadows operative theme.', level: 1, cost: 0, scarcity: 'Common', category: 'Aesthetic Schemes', themeKey: 'shadows', colorVar: 1, imageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_shadows_l1.jpg`, tileImageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_shadows_l1.jpg`, dataAiHint: "red abstract" }, // Changed 'data-ai-hint' to 'dataAiHint'
  { id: 'aesthetic_scheme_terminal_green', name: 'Terminal Green', title: 'Terminal Green', description: 'Classic green terminal theme.', level: 1, cost: 100, scarcity: 'Common', category: 'Aesthetic Schemes', themeKey: 'terminal-green', colorVar: 4, imageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_terminal_green_l1.jpg`, tileImageSrc: `/spyshop/items/aesthetic_schemes/aesthetic_scheme_terminal_green_l1.jpg`, dataAiHint: "green abstract" }, // Changed 'data-ai-hint' to 'dataAiHint'
];

// IMPORTANT: Define ALL_ITEMS_BY_CATEGORY *before* functions/constants that use it.
export const ALL_ITEMS_BY_CATEGORY: Record<ItemCategory, GameItemBase[]> = {
  'Hardware': HARDWARE_ITEMS,
  'Lock Fortifiers': LOCK_FORTIFIER_ITEMS,
  'Infiltration Gear': INFILTRATION_GEAR_ITEMS,
  'Nexus Upgrades': NEXUS_UPGRADE_ITEMS,
  'Assault Tech': ASSAULT_TECH_ITEMS,
  'Aesthetic Schemes': AESTHETIC_SCHEME_ITEMS,
};

// --- ItemTile and ProductCategory Interfaces ---
// These interfaces define the structure for items displayed in the shop and categorized.
export interface ItemTile {
  id: string;
  name: string;
  tileImageSrc: string;
  category: ItemCategory;
  getItemLevelData: (level: ItemLevel) => SpecificItemData | undefined;
}

// SpecificItemData interface for detailed view
export interface SpecificItemData extends GameItemBase {
}

export interface ProductCategory {
  id: string;
  name: string;
  iconImageSrc: string;
  itemSubCategories: {
    name: string;
    items: ItemTile[];
  }[];
}

// Function to get item by ID
export function getItemById(id: string): GameItemBase | undefined {
  // Check main categories first
  for (const categoryKey in ALL_ITEMS_BY_CATEGORY) {
    const itemsInCategory = ALL_ITEMS_BY_CATEGORY[categoryKey as ItemCategory];
    const item = itemsInCategory.find(i => i.id === id);
    if (item) return item;
  }
  return undefined;
}

// Helper function to get the L1 version of an item by its base name and category
export function getL1ItemByBaseName(category: ItemCategory, baseName: string): GameItemBase | undefined {
  const itemsInCategory = ALL_ITEMS_BY_CATEGORY[category];
  if (!itemsInCategory) return undefined;
  return itemsInCategory.find(item => item.name === baseName && item.level === 1);
}

// Helper function to create an ItemTile
function createItemTile(
  category: ItemCategory,
  baseItemName: string,
): ItemTile | null {
  const l1Item = getL1ItemByBaseName(category, baseItemName);
  if (!l1Item) return null; // If L1 item not found, cannot create tile
  return {
    id: `${baseItemName.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')}_tile`,
    name: baseItemName,
    tileImageSrc: l1Item.tileImageSrc || l1Item.imageSrc || '/Spi vs Spi icon.png',
    category: category,
    getItemLevelData: (level: ItemLevel): SpecificItemData | undefined => {
      const itemsInThisCategory = ALL_ITEMS_BY_CATEGORY[category];
      const foundItem = itemsInThisCategory.find(item => item.name === baseItemName && item.level === level);
      return foundItem ? { ...foundItem } : undefined;
    }
  };
}

// SHOP_CATEGORIES definition using createItemTile
export const SHOP_CATEGORIES: ProductCategory[] = [
  {
    id: 'Hardware',
    name: 'Hardware',
    iconImageSrc: `/spyshop/icons/icon_hardware.png`,
    itemSubCategories: [
      {
        name: 'All Hardware',
        items: [
          'Cypher Lock', 'Reinforced Deadbolt', 'Quantum Entanglement Lock',
          'Sonic Pulse Lock', 'Plasma Conduit Lock', 'Biometric Seal',
          'Neural Network Lock', 'Temporal Flux Lock',
        ].map(baseName => createItemTile('Hardware', baseName)).filter(Boolean) as ItemTile[]
      }
    ]
  },
  {
    id: 'lockFortifiers',
    name: 'Lock Fortifiers',
    iconImageSrc: `/spyshop/icons/icon_fortifiers.png`,
    itemSubCategories: [
      {
        name: 'All Lock Fortifiers',
        items: [
          'Dummy Node', 'Adaptive Shield', 'Feedback Loop', 'Sonic Dampener',
          'Temporal Anchor', 'Reactive Armor', 'Neural Feedback Spore',
          'Entanglement Field Inhibitor',
        ].map(baseName => createItemTile('Lock Fortifiers', baseName)).filter(Boolean) as ItemTile[]
      }
    ]
  },
  {
    id: 'nexusUpgrades',
    name: 'Nexus Upgrades',
    iconImageSrc: `/spyshop/icons/icon_nexus.png`,
    itemSubCategories: [
      {
        name: 'All Nexus Upgrades',
        items: [
          'Security Camera', 'Reinforced Foundation', 'Emergency Repair System (ERS)', 'Emergency Power Cell (EPC)',
        ].map(baseName => createItemTile('Nexus Upgrades', baseName)).filter(Boolean) as ItemTile[]
      }
    ]
  },
  {
    id: 'infiltrationGear',
    name: 'Infiltration Gear',
    iconImageSrc: `/spyshop/icons/icon_infiltration.png`,
    itemSubCategories: [
      {
        name: 'All Infiltration Gear',
        items: [
          'Pick', 'Hydraulic Drill', 'Code Injector', 'Sonic Pulser',
          'Bio-Scanner Override', 'Temporal Dephaser', 'Quantum Dephaser', 'Universal Key',
        ].map(baseName => createItemTile('Infiltration Gear', baseName)).filter(Boolean) as ItemTile[]
      }
    ]
  },
  {
    id: 'assaultTech',
    name: 'Assault Tech',
    iconImageSrc: `/spyshop/icons/icon_assault.png`,
    itemSubCategories: [
      {
        name: 'All Assault Tech',
        items: [
          'System Hack', 'Stealth Program', 'Code Scrambler',
          'Power Spike', 'Seismic Charge',
        ].map(baseName => createItemTile('Assault Tech', baseName)).filter(Boolean) as ItemTile[]
      }
    ]
  },
  {
    id: 'aestheticSchemes',
    name: 'Aesthetic Schemes',
    iconImageSrc: `/spyshop/icons/icon_aesthetic.png`,
    itemSubCategories: [
      {
        name: 'All Aesthetic Schemes',
        items: AESTHETIC_SCHEME_ITEMS.map(item => ({
          id: `${item.id}_tile`,
          name: item.name,
          tileImageSrc: item.tileImageSrc || item.imageSrc || '/Spi vs Spi icon.png',
          category: 'Aesthetic Schemes',
          getItemLevelData: (level: ItemLevel): SpecificItemData | undefined => {
            const foundItem = AESTHETIC_SCHEME_ITEMS.find(i => i.name === item.name && i.level === level);
            return foundItem ? { ...foundItem } : undefined;
          }
        }))
      }
    ]
  },
];

// PlayerInventoryItem and VaultSlot interfaces (can also be in AppContext.tsx if preferred for centralization)
export interface PlayerInventoryItem {
  id: string; // Corresponds to GameItemBase id (e.g., 'pick_l1')
  quantity: number;
  currentStrength?: number; // For items like locks and ERS, EPC
  
  // Instance-specific data for charges/uses/alerts
  currentUses?: number;
  maxUses?: number;
  currentAlerts?: number;
  maxAlerts?: number;
  currentCharges?: number;
  maxCharges?: number;

  // Added for ERS in inventory
  levelCapacity?: number;
  globalMaxCapacity?: number;
}

export interface VaultSlot {
  id: string; // e.g., 'lock_slot_0', 'upgrade_slot_1'
  type: 'lock' | 'upgrade';
  item: PlayerInventoryItem | null; // The actual item instance deployed here
}
