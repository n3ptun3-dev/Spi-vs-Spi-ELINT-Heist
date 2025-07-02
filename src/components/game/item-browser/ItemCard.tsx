// src/components/game/item-browser/ItemCard.tsx
"use client";

import React from 'react';
import { HolographicButton } from '../shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useAppContext, type DisplayItem, type ItemWindowContext } from '@/contexts/AppContext';
import { Recycle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL } from '@/lib/constants';

const ItemProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = ({ label, current, max, colorVar }) => {
    const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    const isLevel3 = colorVar === ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[3];
    const textColor = isLevel3 ? 'text-black' : 'text-white';

    return (
        <div className="w-full h-5 rounded-full bg-black/50 overflow-hidden relative flex items-center justify-center border border-black/20 my-1 backdrop-blur-sm">
            <div
                className="absolute left-0 top-0 h-full"
                style={{ backgroundColor: `hsl(${colorVar})`, width: `${percentage}%` }}
            />
            <div className={cn("relative z-10 text-xs font-bold mix-blend-overlay", textColor)}>
                {label} {current}/{max}
            </div>
        </div>
    );
};


interface ItemCardProps {
    displayItem: DisplayItem;
    context: ItemWindowContext;
    onClose: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ displayItem, context, onClose }) => {
    const { showConfirmation, hideConfirmation, rechargeItem, offloadItem, deployItemToVault, upgradeLock, fortifyLockSlot } = useAppContext();

    const {
        baseItem,
        title,
        imageSrc,
        colorVar,
        displayTextLabel,
        instanceCurrentStrength, instanceMaxStrength,
        instanceCurrentCharges, instanceMaxCharges,
        instanceCurrentUses, instanceMaxUses,
        levelForVisuals,
    } = displayItem;

    React.useEffect(() => {
        console.log(`[ItemCard] Rendering: '${displayItem.title}', Level: ${levelForVisuals}, ColorVar: '${colorVar}'`);
    }, [displayItem.title, levelForVisuals, colorVar]);

    const handleDeploy = () => {
        if((context.type === 'deploy_lock' || context.type === 'deploy_nexus') && displayItem.baseItem) {
            deployItemToVault(context.vaultSlotId, displayItem.baseItem.id);
            onClose();
        }
    };

    const handleUpgrade = () => {
        if(context.type === 'upgrade_lock' && displayItem.baseItem && context.currentLock) {
            showConfirmation({
                title: 'Confirm Upgrade',
                content: <p>Your currently installed <span style={{color: `hsl(${context.currentLock.colorVar})`}}>{context.currentLock.title}</span> will be destroyed and replaced with <span style={{color: `hsl(${displayItem.colorVar})`}}>{displayItem.title}</span>. Are you sure?</p>,
                confirmText: "Replace",
                onConfirm: () => {
                    if (displayItem.baseItem) {
                      upgradeLock(context.vaultSlotId, displayItem.baseItem.id);
                    }
                    hideConfirmation();
                    onClose();
                }
            });
        }
    }

    const handleFortify = () => {
        if (context.type === 'fortify_lock' && displayItem.baseItem) {
             fortifyLockSlot(context.vaultSlotId, displayItem.baseItem.id);
             onClose();
        }
    }

    const handleRecharge = () => {
        const rechargeCost = baseItem?.rechargeCost ?? 50;
        showConfirmation({
            title: `Recharge ${title}?`,
            content: (
                <div className="flex flex-col items-center gap-4">
                    <p>This action will restore the item to full capacity.</p>
                    <p>Cost: <span className="font-bold text-amber-400">{rechargeCost} ELINT</span></p>
                </div>
            ),
            confirmText: "Recharge",
            onConfirm: () => {
                rechargeItem(displayItem.baseItem!.id, context.type === 'deploy_lock' || context.type === 'deploy_nexus' ? context.vaultSlotId : undefined);
                hideConfirmation();
            }
        });
    };

    const handleOffload = () => {
        showConfirmation({
            title: `Offload ${title}?`,
            content: <p>This item will be removed from your inventory and may be discoverable by other agents. This action cannot be undone.</p>,
            confirmText: "Confirm Offload",
            onConfirm: () => {
                offloadItem(displayItem.baseItem!.id);
                hideConfirmation();
                onClose();
            }
        });
    };

    const renderButtons = () => {
        let isRechargeable = false;
        let isFull = true;

        if (baseItem) {
            isRechargeable = (baseItem.type === 'Rechargeable') ||
                             (baseItem.category === 'Hardware' && (baseItem.maxRechargeInitiations || 0) > 0) ||
                             (baseItem.category === 'Nexus Upgrades' && baseItem.durability === 'Rechargeable');

            if (isRechargeable) {
                const current = instanceCurrentStrength ?? instanceCurrentCharges ?? instanceCurrentUses;
                const max = instanceMaxStrength ?? instanceMaxCharges ?? instanceMaxUses;
                if(current !== undefined && max !== undefined) {
                    isFull = current >= max;
                }
            }
        }

        switch (context.type) {
            case 'locker':
                return (
                    <div className="flex items-center gap-2">
                        <HolographicButton onClick={handleOffload} className="!p-2">
                            <Recycle className="w-5 h-5" />
                        </HolographicButton>
                        {isRechargeable && baseItem && !displayTextLabel?.toLowerCase().includes('activation cost') && (
                            <HolographicButton onClick={handleRecharge} disabled={isFull} className="flex-grow">
                                {isFull ? 'Fully Charged' : 'Recharge'}
                            </HolographicButton>
                        )}
                    </div>
                );
            case 'deploy_lock':
            case 'deploy_nexus':
                 return <HolographicButton onClick={handleDeploy} className="w-full">Deploy</HolographicButton>;
            case 'upgrade_lock':
                return <HolographicButton onClick={handleUpgrade} className="w-full">Select for Upgrade</HolographicButton>;
            case 'infiltrate':
                return <HolographicButton onClick={() => { /* Infiltrate logic */ onClose(); }} className="w-full">Use for Infiltration</HolographicButton>;
            case 'fortify_lock':
                 return <HolographicButton onClick={handleFortify} className="w-full">Fortify</HolographicButton>;
            default:
                return null;
        }
    };

    const levelColorHsl = `hsl(${colorVar})`;
    const levelColorHsla = `hsla(${colorVar}, 0.3)`;

    return (
        <div
            className="w-full h-full flex flex-col overflow-hidden rounded-xl border-2 whitespace-normal"
            style={{ borderColor: levelColorHsl }}
        >
            <ScrollArea className="w-full h-full">
                <div className="w-[215px]" style={{ backgroundColor: levelColorHsla }}>
                    <div className="relative w-full aspect-square flex-shrink-0">
                        <img
                            src={imageSrc}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                        <div className="absolute bottom-1 left-1 right-1 px-1">
                            {displayTextLabel ? (
                                <p className="text-center font-semibold text-white/80 bg-black/30 rounded p-1 text-xs backdrop-blur-sm">{displayTextLabel}</p>
                            ) : (
                                <>
                                    {instanceMaxStrength !== undefined && <ItemProgressBar label="Strength" current={instanceCurrentStrength || 0} max={instanceMaxStrength} colorVar={colorVar} />}
                                    {instanceMaxCharges !== undefined && <ItemProgressBar label="Charges" current={instanceCurrentCharges || 0} max={instanceMaxCharges} colorVar={colorVar} />}
                                    {instanceMaxUses !== undefined && <ItemProgressBar label="Uses" current={instanceCurrentUses || 0} max={instanceMaxUses} colorVar={colorVar} />}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="w-full px-3 pb-3 space-y-3">
                        <h2 className="text-lg font-orbitron text-center mt-2 w-full break-words" style={{ color: levelColorHsl }}>
                            {title}
                        </h2>

                        <div className="flex-shrink-0">
                          {renderButtons()}
                        </div>

                        <div className="space-y-2 text-sm text-muted-foreground border-t border-border/50 pt-3">
                            <p className="w-full break-words">{baseItem?.description}</p>
                            {baseItem?.strength && <p><span className="font-semibold text-foreground">Strength:</span> {baseItem.strength.max}</p>}
                            {baseItem?.resistance && <p><span className="font-semibold text-foreground">Resistance:</span> {baseItem.resistance.max}</p>}
                            {baseItem?.type && <p><span className="font-semibold text-foreground">Type:</span> {baseItem.type}</p>}
                            {baseItem?.scarcity && <p><span className="font-semibold text-foreground">Scarcity:</span> {baseItem.scarcity}</p>}
                            {baseItem?.lockTypeEffectiveness?.idealCounterAgainst && <p className="mt-2 p-2 border border-green-500/50 rounded-md bg-green-500/10 w-full break-words"><span className="font-semibold text-green-300">Effective Against:</span> {baseItem.lockTypeEffectiveness.idealCounterAgainst.join(', ')}</p>}
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
