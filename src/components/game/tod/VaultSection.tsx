// src/components/game/tod/VaultSection.tsx

"use client";
import { useState, useCallback, useMemo } from 'react';
import { useAppContext, type VaultSlot, type DisplayItem, type ItemCategory, type GameItemBase, type PlayerInventoryItem } from '@/contexts/AppContext';
import { HolographicPanel, HolographicButton, HolographicInput } from '@/components/game/shared/HolographicPanel';
import { ShieldCheck, ShieldOff, ShieldAlert, Edit3, Lock, Unlock, Sigma, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getItemById as getBaseItemByIdFromGameItems } from '@/lib/game-items';
import { ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL } from '@/lib/constants';
import { FALLBACK_IMAGE_SRC } from './CardTextureRenderer';


interface SectionProps {
  parallaxOffset: number;
}

const MAX_LOCK_SLOTS = 4;
const MAX_UPGRADE_SLOTS = 4;

export function VaultSection({ parallaxOffset }: SectionProps) {
  const {
    faction,
    playerSpyName,
    playerVault,
    playerStats,
    openItemSlider,
    openTODWindow,
    closeTODWindow,
    showConfirmation,
    hideConfirmation,
    playerInventory,
    rechargeItem,
    fortifyLockSlot,
    removeFortifierFromSlot,
    upgradeLock,
  } = useAppContext();
  const { theme: currentGlobalTheme, themeVersion } = useTheme();

  const [vaultTitle, setVaultTitle] = useState(playerSpyName ? `${playerSpyName}'s Vault` : "[UNCLASSIFIED]");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(vaultTitle);

  const lockSlots = playerVault.filter(slot => slot.type === 'lock').slice(0, MAX_LOCK_SLOTS);
  const upgradeSlots = playerVault.filter(slot => slot.type === 'upgrade').slice(0, MAX_UPGRADE_SLOTS);

  const displayLockSlots: VaultSlot[] = Array(MAX_LOCK_SLOTS).fill(null).map((_, i) => {
    return lockSlots[i] || { id: `lock_slot_${i}`, type: 'lock', item: null };
  });
  const displayUpgradeSlots: VaultSlot[] = Array(MAX_UPGRADE_SLOTS).fill(null).map((_, i) => {
    return upgradeSlots[i] || { id: `upgrade_slot_${i}`, type: 'upgrade', item: null };
  });

  const isSecure = displayLockSlots.some(slot => slot.item !== null);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempTitle(e.target.value);
  };

  const saveVaultTitle = () => {
    setVaultTitle(tempTitle);
    setIsEditingTitle(false);
  };

  const createDisplayItem = useCallback((invItem: PlayerInventoryItem, baseItem: GameItemBase): DisplayItem => {
    return {
      id: invItem.id,
      baseItem: baseItem,
      title: baseItem.title || baseItem.name,
      quantityInStack: invItem.quantity,
      imageSrc: baseItem.tileImageSrc || baseItem.imageSrc || FALLBACK_IMAGE_SRC,
      colorVar: ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[baseItem.level] || ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[1],
      levelForVisuals: baseItem.level,
      stackType: 'individual',
      path: [],
      dataAiHint: baseItem.dataAiHint,
      instanceCurrentStrength: invItem.currentStrength,
      instanceMaxStrength: baseItem.strength?.max,
      instanceCurrentCharges: invItem.currentCharges,
      instanceMaxCharges: baseItem.maxCharges,
      instanceCurrentAlerts: invItem.currentAlerts,
      instanceMaxAlerts: baseItem.maxAlerts,
      instanceCurrentUses: invItem.currentUses,
      instanceMaxUses: baseItem.maxUses,
    };
  }, []);

  const handleEmptySlotClick = useCallback((e: React.MouseEvent, slot: VaultSlot) => {
    e.stopPropagation();
    let categoryToOpen: ItemCategory | undefined;
    let contextType: 'deploy_lock' | 'deploy_nexus' | undefined;
    let windowTitle: string = "Select Item";

    if (slot.type === 'lock') {
      categoryToOpen = 'Hardware';
      contextType = 'deploy_lock';
      windowTitle = "Select a Lock";
    } else if (slot.type === 'upgrade') {
      categoryToOpen = 'Nexus Upgrades';
      contextType = 'deploy_nexus';
      windowTitle = "Select Nexus Item";
    }

    if (categoryToOpen && contextType) {
        const itemsForSlider: DisplayItem[] = Object.values(playerInventory)
            .filter(invItem => getBaseItemByIdFromGameItems(invItem.id)?.category === categoryToOpen)
            .flatMap(invItem => {
                const baseItem = getBaseItemByIdFromGameItems(invItem.id);
                if (!baseItem) return [];
                return Array.from({ length: invItem.quantity }, (_, i) => ({
                    ...createDisplayItem(invItem, baseItem),
                    id: `${invItem.id}_instance_${i}`,
                    instanceIndex: i,
                }));
            });
        openItemSlider(windowTitle, itemsForSlider, { type: contextType, vaultSlotId: slot.id });
    }
  }, [playerInventory, openItemSlider, createDisplayItem]);

  const handleRechargeClick = useCallback(async (slot: VaultSlot) => {
      if (!slot.item) return;
      const itemDetails = getBaseItemByIdFromGameItems(slot.item.id);
      if (!itemDetails) return;

      const onConfirmRecharge = async () => {
          await rechargeItem(slot.item!.id, slot.id);
          closeTODWindow();
      };

      openTODWindow(
          `Recharge ${itemDetails.name}?`,
          <div className="p-2 text-center font-rajdhani space-y-4">
              <p>Restore this item to full strength/charges for <span className="text-yellow-400 font-bold">{itemDetails.rechargeCost || 50} ELINT</span>?</p>
              {itemDetails.strength && slot.item.currentStrength !== undefined &&
                  <div className="w-full h-5 rounded-full bg-black/50 overflow-hidden relative flex items-center justify-center border border-black/20 my-1 backdrop-blur-sm">
                      <div className="absolute left-0 top-0 h-full bg-green-500" style={{ width: `${(slot.item.currentStrength / itemDetails.strength.max) * 100}%` }} />
                      <div className="relative z-10 text-xs font-bold text-white mix-blend-overlay">
                          Strength {slot.item.currentStrength}/{itemDetails.strength.max}
                      </div>
                  </div>
              }
              <div className="flex justify-center gap-4">
                  <HolographicButton onClick={closeTODWindow} className="flex-1">Cancel</HolographicButton>
                  <HolographicButton onClick={onConfirmRecharge} className="flex-1">Confirm</HolographicButton>
              </div>
          </div>,
          { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
      );
  }, [rechargeItem, closeTODWindow, openTODWindow, currentGlobalTheme, themeVersion]);
  
    const handleUpgradeClick = useCallback((slot: VaultSlot) => {
    if (!slot.item) return;
    const currentLockDetails = getBaseItemByIdFromGameItems(slot.item.id);
    if (!currentLockDetails || currentLockDetails.category !== 'Hardware') return;

    const upgradeCandidates: DisplayItem[] = Object.values(playerInventory)
        .filter(invItem => {
            const baseItem = getBaseItemByIdFromGameItems(invItem.id);
            return (
                baseItem &&
                baseItem.category === 'Hardware' &&
                baseItem.level >= currentLockDetails.level &&
                baseItem.level <= playerStats.level
            );
        })
        .flatMap(invItem => {
            const baseItem = getBaseItemByIdFromGameItems(invItem.id);
            if (!baseItem) return [];
            return Array.from({ length: invItem.quantity }, (_, i) => ({
                ...createDisplayItem(invItem, baseItem),
                id: `${invItem.id}_instance_${i}`,
                instanceIndex: i,
            }));
        });
    const currentLockAsDisplayItem = createDisplayItem(slot.item, currentLockDetails);
    closeTODWindow();
    openItemSlider("Select Upgrade", upgradeCandidates, {
        type: 'upgrade_lock',
        vaultSlotId: slot.id,
        currentLock: currentLockAsDisplayItem,
    });
  }, [playerInventory, playerStats.level, openItemSlider, closeTODWindow, createDisplayItem]);

  const handleFortifyClick = useCallback((slot: VaultSlot) => {
        if (!slot.item || slot.fortifier) return;
        const fortifierCandidates: DisplayItem[] = Object.values(playerInventory)
            .filter(invItem => {
                const baseItem = getBaseItemByIdFromGameItems(invItem.id);
                return baseItem && baseItem.category === 'Lock Fortifiers';
            })
            .flatMap(invItem => {
                const baseItem = getBaseItemByIdFromGameItems(invItem.id);
                if (!baseItem) return [];
                 return Array.from({ length: invItem.quantity }, (_, i) => ({
                    ...createDisplayItem(invItem, baseItem),
                    id: `${invItem.id}_instance_${i}`,
                }));
            });
        closeTODWindow();
        openItemSlider('Select Fortifier', fortifierCandidates, { type: 'fortify_lock', vaultSlotId: slot.id });
    }, [playerInventory, openItemSlider, closeTODWindow, createDisplayItem]);

  const handleFilledSlotClick = useCallback((e: React.MouseEvent, slot: VaultSlot) => {
      e.stopPropagation();
      if (!slot.item) return;
      const itemDetails = getBaseItemByIdFromGameItems(slot.item.id);
      if (!itemDetails) return;
      const isHardware = itemDetails.category === 'Hardware';

      openTODWindow(
          `${itemDetails.name} L${itemDetails.level}`,
          <div className="flex flex-col gap-3 p-2 font-rajdhani">
              <HolographicButton
                  onClick={() => handleRechargeClick(slot)}
                  disabled={slot.item.currentStrength === itemDetails.strength?.max}
                  explicitTheme={currentGlobalTheme}>
                  {slot.item.currentStrength === itemDetails.strength?.max ? 'Fully Charged' : 'Recharge'}
              </HolographicButton>
              {isHardware && (
                  <HolographicButton onClick={() => handleFortifyClick(slot)} disabled={!!slot.fortifier} explicitTheme={currentGlobalTheme}>
                      {slot.fortifier ? 'Fortified' : 'Fortify'}
                  </HolographicButton>
              )}
              {isHardware && (
                  <HolographicButton onClick={() => handleUpgradeClick(slot)} explicitTheme={currentGlobalTheme}>
                      Upgrade
                  </HolographicButton>
              )}
          </div>,
          { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
      );
  }, [openTODWindow, handleRechargeClick, handleUpgradeClick, handleFortifyClick, currentGlobalTheme, themeVersion]);
  
  const handleRemoveFortifier = useCallback(async (slotId: string) => {
    closeTODWindow(); 
    showConfirmation({
        title: "Confirm Removal",
        content: "Return this fortifier to your equipment locker?",
        onConfirm: async () => {
            await removeFortifierFromSlot(slotId);
            hideConfirmation(); 
        },
        cancelText: "Cancel",
        confirmText: "Confirm",
    });
}, [removeFortifierFromSlot, showConfirmation, closeTODWindow, hideConfirmation]);

const handleFortifierClick = useCallback((e: React.MouseEvent, slot: VaultSlot) => {
    e.stopPropagation();
    if (!slot.fortifier) return;
    const fortifierDetails = getBaseItemByIdFromGameItems(slot.fortifier.id);
    if (!fortifierDetails) return;
    openTODWindow(
        `${fortifierDetails.name} L${fortifierDetails.level}`,
        <div className="flex flex-col gap-3 p-2 font-rajdhani">
            <HolographicButton onClick={() => { /* Recharge logic for fortifier */ }}>Recharge Fortifier</HolographicButton>
            <HolographicButton onClick={() => handleRemoveFortifier(slot.id)} className="!border-red-500 !text-red-500">Return to Inventory</HolographicButton>
        </div>,
        { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
    );
}, [openTODWindow, handleRemoveFortifier, currentGlobalTheme, themeVersion]);

  const centralHexagonColor = faction === 'Cyphers' || faction === 'Shadows' ? 'hsl(var(--primary-hsl))' : 'hsl(var(--primary-hsl))';

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 h-full">
      <HolographicPanel
        className="w-full h-full max-w-4xl flex flex-col items-center relative"
        explicitTheme={currentGlobalTheme}
      >
        <div className="text-center mb-2 mt-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <HolographicInput
                type="text"
                value={tempTitle}
                onChange={handleTitleChange}
                maxLength={30}
                className="text-lg"
                explicitTheme={currentGlobalTheme}
              />
              <HolographicButton onClick={saveVaultTitle} className="p-2" explicitTheme={currentGlobalTheme}>Save</HolographicButton>
            </div>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setTempTitle(vaultTitle); setIsEditingTitle(true); }}>
              <h2 className="text-2xl font-orbitron holographic-text group-hover:text-accent transition-colors">{vaultTitle}</h2>
              <Edit3 className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors icon-glow" />
            </div>
          )}
           <p className="text-xs text-muted-foreground">Owner: {playerSpyName || "Current User"}</p>
        </div>
        <div className={cn("flex items-center gap-2 my-1 p-1 px-2 rounded-md text-sm font-semibold", isSecure ? "bg-green-500/20 text-green-300 border border-green-500" : "bg-red-500/20 text-red-300 border border-red-500")}>
            {isSecure ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            STATUS: {isSecure ? "SECURE" : "NOT SECURED"}
        </div>
        <div className="relative flex-grow w-full flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-full h-full max-h-[70vh] max-w-[70vh] aspect-square relative">
                    <svg viewBox="0 0 100 100" className="absolute w-1/2 h-1/2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-70" style={{ animationDuration: '20s'}}>
                        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" stroke={centralHexagonColor} strokeWidth="2" fill="hsla(var(--background-hsl), 0.3)" className="icon-glow" style={{ filter: `drop-shadow(0 0 5px ${centralHexagonColor})`}} />
                    </svg>
                    <svg viewBox="0 0 100 100" className="absolute w-1/2 h-1/2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-70" style={{ animationDuration: '20s', animationDirection: 'reverse'}}>
                        <polygon points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" stroke={centralHexagonColor} strokeWidth="2" fill="transparent" className="icon-glow" style={{ filter: `drop-shadow(0 0 5px ${centralHexagonColor})`}} />
                    </svg>
                    <svg viewBox="0 0 200 200" className="absolute w-full h-full opacity-50 z-[-1]">
                        <circle cx="100" cy="100" r="76" fill="none" stroke={centralHexagonColor} strokeWidth="0.5" className="icon-glow" />
                    </svg>

                    {[...displayLockSlots, ...displayUpgradeSlots].map((slot, index) => {
                        const totalSlots = MAX_LOCK_SLOTS + MAX_UPGRADE_SLOTS;
                        const angle = (index / totalSlots) * 360 - 90;
                        const isUpgradeSlot = slot.type === 'upgrade';
                        const radius = isUpgradeSlot ? '38%' : '38%';
                        const x = `calc(50% + ${radius} * ${Math.cos(angle * Math.PI / 180)})`;
                        const y = `calc(50% + ${radius} * ${Math.sin(angle * Math.PI / 180)})`;
                        const itemDetails = slot.item ? getBaseItemByIdFromGameItems(slot.item.id) : null;
                        const itemColor = itemDetails ? `hsl(${ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[itemDetails.level]})` : `hsl(var(--primary-hsl))`;
                        return (
                          <div key={slot.id} className={cn( "absolute w-16 h-16 md:w-20 md:h-20 rounded-md border-2 cursor-pointer transition-all hover:scale-110 hover:shadow-lg", "flex flex-col items-center justify-center text-center overflow-hidden", isUpgradeSlot && "border-4" )} style={{ left: x, top: y, transform: 'translate(-50%, -50%)', borderColor: itemColor, boxShadow: slot.item ? `0 0 10px ${itemColor}, inset 0 0 5px ${itemColor}` : `0 0 5px ${itemColor}`, backgroundColor: `hsla(0, 0%, 0%, 0.5)`}} onClick={(e) => slot.item ? handleFilledSlotClick(e, slot) : handleEmptySlotClick(e, slot)} >
                              {slot.item && itemDetails ? (
                                <>
                                  <img src={itemDetails.imageSrc || '/placeholder-icon.png'} alt={itemDetails.name} className="absolute inset-0 w-full h-full object-cover" />
                                  {itemDetails.strength && (<div className="absolute bottom-1 left-1 right-1 h-2 bg-black/50 rounded-full overflow-hidden"> <div className="h-full bg-green-500" style={{ width: `${(slot.item.currentStrength || 0) / itemDetails.strength.max * 100}%`}}></div> </div>)}
                                </>
                              ) : slot.type === 'lock' ? (
                                <Unlock className="w-6 h-6 md:w-8 md:h-8 icon-glow" style={{color: itemColor}}/>
                              ) : (
                                <ShieldOff className="w-6 h-6 md:w-8 md:h-8 icon-glow" style={{color: itemColor}}/>
                              )}
                          </div>
                        );
                    })}
                    {displayLockSlots.map((slot, index) => {
                        if (!slot.fortifier) return null;
                        const totalSlots = MAX_LOCK_SLOTS;
                        const angle = (index / totalSlots) * 360 + 45; // Offset to sit between lock slots
                        const radius = '48%';
                        const x = `calc(50% + ${radius} * ${Math.cos(angle * Math.PI / 180)})`;
                        const y = `calc(50% + ${radius} * ${Math.sin(angle * Math.PI / 180)})`;
                        const fortifierDetails = getBaseItemByIdFromGameItems(slot.fortifier.id);
                        if (!fortifierDetails) return null;
                        const fortifierColor = `hsl(${ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[fortifierDetails.level]})`;
                        return (
                            <div key={`${slot.id}-fortifier`} className="absolute w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-125 z-20" style={{ left: x, top: y, transform: 'translate(-50%, -50%)', borderColor: fortifierColor, boxShadow: `0 0 8px ${fortifierColor}` }} onClick={(e) => handleFortifierClick(e, slot)}>
                                <img src={fortifierDetails.imageSrc} alt={fortifierDetails.name} className="w-full h-full object-cover rounded-full" />
                            </div>
                        );
                    })}

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                        <Sigma className="w-8 h-8 md:w-10 md:h-10 text-primary icon-glow opacity-60 mb-1" />
                        <p className="text-3xl md:text-4xl font-digital7 font-bold holographic-text text-primary leading-none">
                        {(playerStats.elintReserves ?? 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground font-rajdhani uppercase tracking-wider">ELINT</p>
                    </div>
                </div>
            </div>
        </div>
      </HolographicPanel>
    </div>
  );
}
