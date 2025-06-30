// src/components/game/OpponentVaultPage.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppContext, type VaultSlot, type GameItemBase } from '@/contexts/AppContext';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { HolographicPanel, HolographicButton } from './shared/HolographicPanel';
import { ShieldCheck, ShieldAlert, Lock, Unlock, Sigma } from 'lucide-react';
import { getItemById } from '@/lib/game-items';

// Mock data for opponent - this would come from props or context
interface Opponent {
    id: string;
    spyName: string;
    faction: 'Cyphers' | 'Shadows';
    vault: VaultSlot[];
    elintReserves: number;
}

const mockOpponent: Opponent = {
    id: 'opponent_123',
    spyName: 'RivalAgent47',
    faction: 'Shadows',
    elintReserves: 125800,
    vault: [
        { id: 'lock_slot_0', type: 'lock', item: { id: 'cypher_lock_l4', quantity: 1, currentStrength: 400 } },
        { id: 'lock_slot_1', type: 'lock', item: null },
        { id: 'lock_slot_2', type: 'lock', item: { id: 'reinforced_deadbolt_l3', quantity: 1, currentStrength: 300 } },
        { id: 'lock_slot_3', type: 'lock', item: null },
        { id: 'upgrade_slot_0', type: 'upgrade', item: { id: 'security_camera_l2', quantity: 1 } },
        { id: 'upgrade_slot_1', type: 'upgrade', item: null },
        { id: 'upgrade_slot_2', type: 'upgrade', item: { id: 'ers_l5', quantity: 1, currentStrength: 500 } },
        { id: 'upgrade_slot_3', type: 'upgrade', item: null },
    ],
};

const MAX_LOCK_SLOTS = 4;
const MAX_UPGRADE_SLOTS = 4;

interface OpponentVaultPageProps {
  isOpen: boolean;
  onClose: () => void;
  opponentId: string | null;
}

export const OpponentVaultPage: React.FC<OpponentVaultPageProps> = ({ isOpen, onClose, opponentId }) => {
    // For now, we use mock data. Later, you'd fetch real opponent data using opponentId
    const opponent = mockOpponent;
    const { openTODWindow, openItemSlider } = useAppContext();
    const opponentTheme: Theme = opponent.faction === 'Cyphers' ? 'cyphers' : 'shadows';

    const lockSlots = opponent.vault.filter(slot => slot.type === 'lock').slice(0, MAX_LOCK_SLOTS);
    const upgradeSlots = opponent.vault.filter(slot => slot.type === 'upgrade').slice(0, MAX_UPGRADE_SLOTS);
    
    // Visually represent all slots
    const displayLockSlots: VaultSlot[] = Array(MAX_LOCK_SLOTS).fill(null).map((_, i) => lockSlots[i] || { id: `lock_slot_${i}`, type: 'lock', item: null });
    const displayUpgradeSlots: VaultSlot[] = Array(MAX_UPGRADE_SLOTS).fill(null).map((_, i) => upgradeSlots[i] || { id: `upgrade_slot_${i}`, type: 'upgrade', item: null });

    const isSecure = displayLockSlots.some(slot => slot.item !== null);

    const handleLockClick = (slot: VaultSlot) => {
        if (!slot.item) return; // Can't click empty slots
        
        const lockDetails = getItemById(slot.item.id) as GameItemBase | undefined;
        if (!lockDetails) return;

        openTODWindow(
            `Infiltrate: ${lockDetails.name}`,
            <div className="font-rajdhani text-left p-2 space-y-3">
                <p className="text-lg">You are attempting to bypass <span style={{color: `hsl(var(${lockDetails.colorVar}))`}}>{lockDetails.name}</span>.</p>
                <p><span className="font-semibold">Lock Type:</span> {lockDetails.name}</p>
                <p><span className="font-semibold">Associated Minigame:</span> Key Cracker</p>
                <p><span className="font-semibold">Base Strength:</span> {lockDetails.strength?.max}</p>
                <p className="text-muted-foreground text-xs italic mt-4">{lockDetails.description}</p>
                <div className="flex gap-4 pt-4">
                    <HolographicButton onClick={() => { /* Close TOD */ }} className="flex-1">Cancel</HolographicButton>
                    <HolographicButton onClick={() => handleInfiltrate(lockDetails)} className="flex-1 !border-destructive !text-destructive hover:!bg-destructive hover:!text-white">Infiltrate</HolographicButton>
                </div>
            </div>,
            { explicitTheme: opponentTheme }
        );
    };

    const handleInfiltrate = (lockToInfiltrate: GameItemBase) => {
        // Close the TOD window first if it's managed by context
        // Then open the item slider
        // This is a simplified flow
        console.log("infiltrating", lockToInfiltrate.id);
        // openItemSlider(...) would be called here with infiltration gear
    }

    const centralHexagonColor = opponentTheme === 'cyphers' ? 'hsl(var(--primary-hsl))' : opponentTheme === 'shadows' ? 'hsl(var(--primary-hsl))' : 'hsl(var(--muted-hsl))';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9990] flex items-center justify-center bg-[#1a1a1a]"
                >
                    <div className="w-full h-full p-4 md:p-6 flex items-center justify-center">
                         <HolographicPanel 
                            className="w-full h-full max-w-4xl flex flex-col items-center relative"
                            explicitTheme={opponentTheme}
                        >
                            <div className="text-center my-2">
                               <h2 className="text-2xl font-orbitron holographic-text">{opponent.spyName}'s Vault</h2>
                               <p className="text-xs" style={{color: centralHexagonColor}}>FACTION: {opponent.faction.toUpperCase()}</p>
                            </div>

                             <div className={cn(
                                "flex items-center gap-2 my-1 p-1 px-2 rounded-md text-sm font-semibold",
                                isSecure ? "bg-green-500/20 text-green-300 border border-green-500" : "bg-red-500/20 text-red-300 border border-red-500"
                            )}>
                                {isSecure ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                                STATUS: {isSecure ? "SECURE" : "VULNERABLE"}
                            </div>

                             <div className="relative flex-grow w-full flex items-center justify-center aspect-square max-h-[70vh] max-w-[70vh]">
                                {/* Central Hexagon */}
                                <svg viewBox="0 0 100 100" className="absolute w-1/2 h-1/2 animate-spin-slow opacity-70" style={{ animationDuration: '20s'}}>
                                    <polygon
                                    points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                                    stroke={centralHexagonColor}
                                    strokeWidth="2"
                                    fill="hsla(var(--background-hsl), 0.3)"
                                    style={{ filter: `drop-shadow(0 0 5px ${centralHexagonColor})`}}
                                    />
                                </svg>
                                
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                    <Sigma className="w-8 h-8 md:w-10 md:h-10 text-primary icon-glow opacity-60 mb-1" style={{color: centralHexagonColor}}/>
                                    <p className="text-3xl md:text-4xl font-digital7 font-bold holographic-text leading-none" style={{color: centralHexagonColor}}>
                                    {opponent.elintReserves.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-muted-foreground font-rajdhani uppercase tracking-wider">ELINT</p>
                                </div>


                                {/* Slots */}
                                {[...displayLockSlots, ...displayUpgradeSlots].map((slot, index) => {
                                    const totalSlots = MAX_LOCK_SLOTS + MAX_UPGRADE_SLOTS;
                                    const angle = (index / totalSlots) * 360 - 90;
                                    const radius = '38%'; 
                                    const x = `calc(50% + ${radius} * ${Math.cos(angle * Math.PI / 180)})`;
                                    const y = `calc(50% + ${radius} * ${Math.sin(angle * Math.PI / 180)})`;
                                    
                                    const itemDetails = slot.item ? getItemById(slot.item.id) : null;
                                    const itemColor = itemDetails ? `hsl(var(${itemDetails.colorVar}))` : 'hsl(var(--muted-hsl))';
                                    const isClickable = slot.type === 'lock' && slot.item !== null;

                                    return (
                                    <div
                                        key={slot.id}
                                        className={cn(
                                            "absolute w-16 h-16 md:w-20 md:h-20 rounded-md border-2 transition-all",
                                            "flex flex-col items-center justify-center text-center",
                                            isClickable && "cursor-pointer hover:scale-110 hover:shadow-lg",
                                            !isClickable && "opacity-60"
                                        )}
                                        style={{
                                            left: x,
                                            top: y,
                                            transform: 'translate(-50%, -50%)',
                                            borderColor: itemColor,
                                            boxShadow: slot.item ? `0 0 10px ${itemColor}, inset 0 0 5px ${itemColor}` : `0 0 5px ${itemColor}`,
                                            backgroundColor: `hsla(var(--card-hsl), 0.7)`, 
                                        }}
                                        onClick={() => isClickable && handleLockClick(slot)}
                                    >
                                        {slot.item && itemDetails ? (
                                        <>
                                            <img src={itemDetails.imageSrc || '/placeholder-icon.png'} alt={itemDetails.name} className="w-8 h-8 md:w-10 md:h-10 object-contain mb-0.5" />
                                            <p className="text-[10px] leading-tight font-semibold" style={{ color: itemColor }}>
                                            {itemDetails.name.substring(0,10)}{itemDetails.name.length > 10 ? '...' : ''} L{itemDetails.level}
                                            </p>
                                        </>
                                        ) : slot.type === 'lock' ? (
                                            <Unlock className="w-6 h-6 md:w-8 md:h-8" style={{color: itemColor}}/>
                                        ) : (
                                            <div className="w-6 h-6 md:w-8 md:h-8" /> // Placeholder for non-clickable upgrades
                                        )}
                                    </div>
                                    );
                                })}
                                </div>
                        </HolographicPanel>
                    </div>

                    {/* Floating Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-[9999] p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
                        aria-label="Close Opponent Vault"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

