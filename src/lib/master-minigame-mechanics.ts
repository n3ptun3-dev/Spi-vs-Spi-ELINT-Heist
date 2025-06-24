// src/lib/master-minigame-mechanics.ts
// This file acts as the central router for selecting and preparing minigames
// based on the type of lock being attacked.

import { HardwareItem, InfiltrationGearItem, ItemLevel, LockFortifierItem } from './game-items';
// Importing specific minigame mechanics for type safety and data preparation
// As you create more minigames, you'll import their specific logic here.
import { type KeyCrackerState } from './minigames/key-cracker/logic'; // Future Key Cracker logic
import { type QuantumCircuitWeaverProps } from '@/components/game/minigames/QuantumCircuitWeaver'; // Get props interface for QC Weaver

// Define a type that encompasses all possible minigame contexts/props
export type MinigameType = 'QuantumCircuitWeaver' | 'KeyCracker' | 'NotImplemented';

// Generic interface for minigame arguments, allowing for type-specific props
export interface MinigameArguments {
  type: MinigameType;
  props: QuantumCircuitWeaverProps | KeyCrackerState | {}; // Use a union of all minigame prop types
  lockData: HardwareItem; // Always include the lock data for context
}

/**
 * Determines which minigame to initiate based on the lock type and prepares its initial state/props.
 * @param lock The HardwareItem representing the lock being attacked.
 * @param attackingTool The InfiltrationGearItem being used. (Future: will be used to pass to minigame logic)
 * @param fortifiers Any LockFortifierItems deployed on the lock. (Future: will be used to pass to minigame logic)
 * @returns A MinigameArguments object containing the type of minigame and its initial props.
 */
export function getMinigameForLock(
lock: HardwareItem, attackingTool: InfiltrationGearItem, fortifiers: LockFortifierItem[],
  // Future parameters to pass to minigame logic:
  // attackingTool: InfiltrationGearItem,
  // fortifiers: LockFortifierItem[],
  // playerLevel: ItemLevel,
): MinigameArguments {
  switch (lock.name) {
    case 'Quantum Entanglement Lock':
      // Prepare specific props for the Quantum Circuit Weaver
      const quantumWeaverProps: QuantumCircuitWeaverProps = {
        lockLevel: lock.level,
        onGameComplete: (success, strengthReduced) => { /* this will be handled by AppContext */ },
        // initialBoard: ..., // If we want to save/resume game state
        // initialFragments: ...,
      };
      return {
        type: 'QuantumCircuitWeaver',
        props: quantumWeaverProps,
        lockData: lock,
      };

    case 'Cypher Lock':
      // Prepare specific props for the basic Key Cracker game (future implementation)
      const keyCrackerProps: KeyCrackerState = {
        lock: lock,
        fortifiers: [], // Assuming no fortifiers for now, or pass actual ones
        attackingTool: {} as any, // Placeholder for future tool
        successfulEntriesCount: 0,
        failedEntriesCount: 0,
        timeElapsedInRound: 0,
        currentRound: 0,
        attackerLevel: 1, // Placeholder
      };
      return {
        type: 'KeyCracker',
        props: keyCrackerProps,
        lockData: lock,
      };

    // Add more cases for other lock types as you build their minigames
    // case 'Sonic Pulse Lock':
    //   return { type: 'SonicRhythmGame', props: { lockLevel: lock.level }, lockData: lock };

    default:
      // Fallback for locks that don't have a specific minigame yet
      return {
        type: 'NotImplemented',
        props: { message: `Minigame for ${lock.name} is not yet implemented, Agent.` },
        lockData: lock,
      };
  }
}
