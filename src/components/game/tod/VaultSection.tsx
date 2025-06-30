// src/components/game/tod/VaultSection.tsx

"use client";
import { useState, useCallback, useMemo } from 'react';
import { useAppContext, type VaultSlot, type DisplayItem, type ItemCategory, type GameItemBase, type PlayerInventoryItem } from '@/contexts/AppContext'; // Update import: Added type PlayerInventoryItem
import { HolographicPanel, HolographicButton, HolographicInput } from '@/components/game/shared/HolographicPanel';
import { ShieldCheck, ShieldOff, ShieldAlert, Edit3, Lock, Unlock, Sigma, MoreVertical } from 'lucide-react'; // Added Sigma and MoreVertical for ELINT
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext'; // Import useTheme
import { getItemById as getBaseItemByIdFromGameItems } from '@/lib/game-items'; // Ensure getItemById is imported
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants'; // Import for DisplayItem creation
import { FALLBACK_IMAGE_SRC } from './CardTextureRenderer'; // Import for DisplayItem creation


interface SectionProps {
  parallaxOffset: number;
}

const MAX_LOCK_SLOTS = 4;
const MAX_UPGRADE_SLOTS = 4;

export function VaultSection({ parallaxOffset }: SectionProps) {
  const {
    faction,
    playerSpyName,
    openInventoryTOD, // Keeping for now if other things still use it, but will deprecate for item slider
    closeInventoryTOD,
    playerVault, // Get playerVault from context
    deployItemToVault, // Get deployItemToVault from context
    playerStats,
    openItemSlider, // NEW: For opening item slider
    openTODWindow, // For temporary options modal
    closeTODWindow, // For temporary options modal
    showConfirmation, // NEW: For confirmation popups
    playerInventory, // Needed to filter items for slider
    rechargeItem, // NEW: Recharge item action
    offloadItem, // NEW: Offload item action
    upgradeLock, // NEW: Upgrade lock action
  } = useAppContext();
  const { theme: currentGlobalTheme, themeVersion } = useTheme(); // Get current theme

  const [vaultTitle, setVaultTitle] = useState(playerSpyName ? `${playerSpyName}'s Vault` : "[UNCLASSIFIED]");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(vaultTitle);

  // Vault slots are now derived from AppContext.playerVault
  const lockSlots = playerVault.filter(slot => slot.type === 'lock').slice(0, MAX_LOCK_SLOTS);
  const upgradeSlots = playerVault.filter(slot => slot.type === 'upgrade').slice(0, MAX_UPGRADE_SLOTS);

  // Ensure we always have the correct number of visual slots, even if playerVault has fewer
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
    // TODO: Persist vaultTitle with player data if this feature is desired long-term
  };

  // Helper to create a DisplayItem from a PlayerInventoryItem and its GameItemBase
  const createDisplayItem = useCallback((invItem: PlayerInventoryItem, baseItem: GameItemBase): DisplayItem => {
    return {
      id: invItem.id, // Or a more unique instance ID if needed later
      baseItem: baseItem,
      title: baseItem.title || baseItem.name,
      quantityInStack: invItem.quantity,
      imageSrc: baseItem.tileImageSrc || baseItem.imageSrc || FALLBACK_IMAGE_SRC,
      colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseItem.level] || 'var(--level-1-color)',
      levelForVisuals: baseItem.level,
      stackType: 'individual', // Assuming these are individual items for display
      path: [], // Path might not be relevant for simple inventory display
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


  const handleEmptySlotClick = useCallback((slot: VaultSlot) => {
    let categoryToOpen: ItemCategory | undefined;
    let contextType: 'deploy_lock' | 'deploy_nexus' | undefined;

    if (slot.type === 'lock') {
      categoryToOpen = 'Hardware';
      contextType = 'deploy_lock';
    } else if (slot.type === 'upgrade') {
      categoryToOpen = 'Nexus Upgrades';
      contextType = 'deploy_nexus';
    }

    if (categoryToOpen && contextType) {
        // Get all items from that category in player's inventory
        const itemsForSlider: DisplayItem[] = Object.values(playerInventory)
            .filter(invItem => getBaseItemByIdFromGameItems(invItem.id)?.category === categoryToOpen)
            .flatMap(invItem => {
                const baseItem = getBaseItemByIdFromGameItems(invItem.id);
                if (!baseItem) return [];
                // Create a DisplayItem for each *quantity* of the item in inventory
                return Array.from({ length: invItem.quantity }, (_, i) => ({
                    ...createDisplayItem(invItem, baseItem),
                    id: `${invItem.id}_instance_${i}`, // Ensure unique ID for each instance in slider
                    instanceIndex: i, // Add an instance index for tracking if needed
                }));
            });

        openItemSlider(itemsForSlider, { type: contextType, vaultSlotId: slot.id });
        closeTODWindow(); // Close any open TOD window before opening slider
    } else {
      console.warn(`No inventory category defined for slot type: ${slot.type}`);
    }
  }, [playerInventory, openItemSlider, closeTODWindow, createDisplayItem]);

  const handleClearSlot = useCallback(async (slotId: string) => {
    showConfirmation({
        title: "Confirm Removal",
        content: "Are you sure you want to remove this item from the vault and return it to your locker?",
        confirmText: "Remove",
        cancelText: "Cancel",
        onConfirm: async () => {
            await deployItemToVault(slotId, null); // Pass null to clear the item
            closeTODWindow(); // Close options modal if open
        },
        // Removed onCancel as ConfirmationPopup's onClose handles it.
    });
  }, [deployItemToVault, showConfirmation, closeTODWindow]);

  const handleRechargeClick = useCallback(async (slot: VaultSlot) => {
      if (!slot.item) return;
      const itemDetails = getBaseItemByIdFromGameItems(slot.item.id);
      if (!itemDetails) return;

      closeTODWindow(); // Close the options modal first

      showConfirmation({
          title: `Recharge ${itemDetails.name}?`,
          content: `Recharge will restore this item to full strength/charges. Cost: ${itemDetails.rechargeCost || 50} ELINT. Confirm?`,
          confirmText: "Recharge",
          cancelText: "Cancel",
          onConfirm: async () => {
              const success = await rechargeItem(slot.item!.id, slot.id);
              if (success) {
                  // Message handled by AppContext
              } else {
                  // Message handled by AppContext
              }
          },
          // Removed onCancel as ConfirmationPopup's onClose handles it.
      });
  }, [rechargeItem, showConfirmation, closeTODWindow]);


  const handleOffloadClick = useCallback(async (slot: VaultSlot) => {
      if (!slot.item) return;
      const itemDetails = getBaseItemByIdFromGameItems(slot.item.id);
      if (!itemDetails) return;

      closeTODWindow(); // Close the options modal first

      showConfirmation({
          title: `Offload ${itemDetails.name}?`,
          content: `Offloading this item will permanently remove it from your inventory and vault. This cannot be undone. Confirm?`,
          confirmText: "Offload",
          cancelText: "Cancel",
          onConfirm: async () => {
              const success = await offloadItem(slot.item!.id);
              if (success) {
                  await deployItemToVault(slot.id, null); // Ensure slot is cleared after offload
                  // Message handled by AppContext
              } else {
                  // Message handled by AppContext
              }
          },
          // Removed onCancel as ConfirmationPopup's onClose handles it.
      });
  }, [offloadItem, showConfirmation, closeTODWindow, deployItemToVault]);


  const handleUpgradeClick = useCallback((slot: VaultSlot) => {
    if (!slot.item) return;
    const currentLockDetails = getBaseItemByIdFromGameItems(slot.item.id);
    if (!currentLockDetails || currentLockDetails.category !== 'Hardware') return;

    // Find suitable upgrade locks in inventory
    const upgradeCandidates: DisplayItem[] = Object.values(playerInventory)
        .filter(invItem => {
            const baseItem = getBaseItemByIdFromGameItems(invItem.id);
            return (
                baseItem &&
                baseItem.category === 'Hardware' &&
                baseItem.level >= currentLockDetails.level && // Can upgrade to same level or higher
                baseItem.level <= playerStats.level // Can't upgrade beyond player's current max item level
            );
        })
        .flatMap(invItem => {
            const baseItem = getBaseItemByIdFromGameItems(invItem.id);
            if (!baseItem) return [];
            return Array.from({ length: invItem.quantity }, (_, i) => ({
                ...createDisplayItem(invItem, baseItem),
                id: `${invItem.id}_instance_${i}`, // Ensure unique ID for each instance in slider
                instanceIndex: i,
            }));
        });

    const currentLockAsDisplayItem = createDisplayItem(slot.item, currentLockDetails);

    closeTODWindow(); // Close the options modal
    openItemSlider(upgradeCandidates, {
        type: 'upgrade_lock',
        vaultSlotId: slot.id,
        currentLock: currentLockAsDisplayItem,
    });
  }, [playerInventory, playerStats.level, openItemSlider, closeTODWindow, createDisplayItem]);

  const handleFilledSlotClick = useCallback((slot: VaultSlot) => {
      if (!slot.item) return;
      const itemDetails = getBaseItemByIdFromGameItems(slot.item.id);
      if (!itemDetails) return;

      openTODWindow(
          itemDetails.name,
          <div className="flex flex-col gap-3 p-2 font-rajdhani">
              <HolographicButton onClick={() => handleRechargeClick(slot)} explicitTheme={currentGlobalTheme}>Recharge</HolographicButton>
              {itemDetails.category === 'Hardware' && ( // Only show upgrade for locks
                  <HolographicButton onClick={() => handleUpgradeClick(slot)} explicitTheme={currentGlobalTheme}>Upgrade</HolographicButton>
              )}
              {/* <HolographicButton onClick={() => { /* Call fortify logic * / }}>Fortify</HolographicButton> */} {/* Fortify logic not yet implemented */}
              <HolographicButton onClick={() => handleOffloadClick(slot)} className="!border-amber-500 !text-amber-500" explicitTheme={currentGlobalTheme}>Offload</HolographicButton>
              <HolographicButton onClick={() => handleClearSlot(slot.id)} className="!border-red-500 !text-red-500" explicitTheme={currentGlobalTheme}>Return to Locker</HolographicButton>
          </div>,
          { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
      );
  }, [openTODWindow, handleRechargeClick, handleUpgradeClick, handleOffloadClick, handleClearSlot, currentGlobalTheme, themeVersion]);


  // Update: Central Hexagon color now uses primary-hsl for Observer as well
  const centralHexagonColor = faction === 'Cyphers' || faction === 'Shadows' ?
    'hsl(var(--primary-hsl))' : 'hsl(var(--primary-hsl))'; // Now always primary color

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-6 h-full">
      <HolographicPanel
        className="w-full h-full max-w-4xl flex flex-col items-center relative"
        explicitTheme={currentGlobalTheme} // Ensure panel is themed
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

        <div className={cn(
            "flex items-center gap-2 my-1 p-1 px-2 rounded-md text-sm font-semibold",
            isSecure ? "bg-green-500/20 text-green-300 border border-green-500" : "bg-red-500/20 text-red-300 border border-red-500"
          )}>
            {isSecure ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            STATUS: {isSecure ? "SECURE" : "NOT SECURED"}
        </div>

        {/* Central Hexagon Core & Slots & ELINT Display */}
        <div className="relative flex-grow w-full flex items-center justify-center aspect-square max-h-[70vh] max-w-[70vh]">
          {/* Central Hexagon - Primary Rotation */}
          <svg viewBox="0 0 100 100" className="absolute w-1/2 h-1/2 animate-spin-slow opacity-70" style={{ animationDuration: '20s'}}>
            <polygon
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
              stroke={centralHexagonColor}
              strokeWidth="2"
              fill="hsla(var(--background-hsl), 0.3)" // Use theme background with opacity
              className="icon-glow" // Assuming icon-glow uses current color for drop shadow
              style={{ filter: `drop-shadow(0 0 5px ${centralHexagonColor})`}}
            />
          </svg>

          {/* Central Hexagon - Reverse Rotation Duplicate Border */}
          <svg viewBox="0 0 100 100" className="absolute w-1/2 h-1/2 animate-spin-slow opacity-70" style={{ animationDuration: '20s', animationDirection: 'reverse'}}>
            <polygon
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
              stroke={centralHexagonColor}
              strokeWidth="2"
              fill="transparent" // Transparent background
              className="icon-glow" // Assuming icon-glow uses current color for drop shadow
              style={{ filter: `drop-shadow(0 0 5px ${centralHexagonColor})`}}
            />
          </svg>

          {/* ELINT Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <Sigma className="w-8 h-8 md:w-10 md:h-10 text-primary icon-glow opacity-60 mb-1" />
            <p className="text-3xl md:text-4xl font-digital7 font-bold holographic-text text-primary leading-none">
              {(playerStats.elintReserves ?? 0).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground font-rajdhani uppercase tracking-wider">ELINT</p>
          </div>


          {/* Combined Slots Logic */}
          {[...displayLockSlots, ...displayUpgradeSlots].map((slot, index) => {
            const totalSlots = MAX_LOCK_SLOTS + MAX_UPGRADE_SLOTS;
            const angle = (index / totalSlots) * 360 - 90; // -90 to start at top
            const radius = '38%';
            const x = `calc(50% + ${radius} * ${Math.cos(angle * Math.PI / 180)})`;
            const y = `calc(50% + ${radius} * ${Math.sin(angle * Math.PI / 180)})`;

            const itemDetails = slot.item ? getBaseItemByIdFromGameItems(slot.item.id) : null;
            const itemColor = itemDetails && itemDetails.colorVar ? `hsl(var(${itemDetails.colorVar}))` : 'hsl(var(--muted-hsl))';
            const canClear = slot.item !== null;

            return (
              <div
                key={slot.id}
                className={cn(
                  "absolute w-16 h-16 md:w-20 md:h-20 rounded-md border-2 cursor-pointer transition-all hover:scale-110 hover:shadow-lg",
                  "flex flex-col items-center justify-center text-center"
                )}
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  borderColor: itemColor,
                  boxShadow: slot.item ? `0 0 10px ${itemColor}, inset 0 0 5px ${itemColor}` : `0 0 5px ${itemColor}`,
                  backgroundColor: `hsla(0, 0%, 0%, 0.3)`, // 30% transparent black
                }}
                onClick={() => slot.item ? handleFilledSlotClick(slot) : handleEmptySlotClick(slot)}
              >
                {slot.item && itemDetails ? (
                  <>
                    <img src={itemDetails.imageSrc || '/placeholder-icon.png'} alt={itemDetails.name} className="w-8 h-8 md:w-10 md:h-10 object-contain mb-0.5" />
                    <p className="text-[10px] leading-tight font-semibold" style={{ color: itemColor }}>
                      {itemDetails.name.substring(0,10)}{itemDetails.name.length > 10 ? '...' : ''} L{itemDetails.level}
                    </p>
                    <HolographicButton
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent slot click from firing
                            handleFilledSlotClick(slot);
                        }}
                        className="!p-0.5 !text-[8px] !h-auto !absolute -top-1 -right-1 !bg-muted/70 hover:!bg-muted !border-muted"
                        explicitTheme={currentGlobalTheme}
                        title={`Options for ${itemDetails.name}`}
                    >
                        <MoreVertical className="w-4 h-4" />
                    </HolographicButton>
                  </>
                ) : slot.type === 'lock' ? (
                  <Unlock className="w-6 h-6 md:w-8 md:h-8 icon-glow" style={{color: itemColor}}/>
                ) : (
                  <ShieldOff className="w-6 h-6 md:w-8 md:h-8 icon-glow" style={{color: itemColor}}/>
                )}
              </div>
            );
          })}
        </div>
        {/* Removed the "Vault Level: X" text from here */}
      </HolographicPanel>
    </div>
  );
}
