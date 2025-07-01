// src/components/game/item-browser/ItemCard.tsx
"use client";

import React from 'react';
import { HolographicButton } from '../shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useAppContext, type DisplayItem, type ItemWindowContext } from '@/contexts/AppContext';
import { Recycle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL } from '@/lib/constants'; // Using new constant

const ItemProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = ({ label, current, max, colorVar }) => {
    const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    // Check if the color var matches level 3 raw HSL
    const isLevel3 = colorVar === ITEM_LEVEL_COLORS_CSS_VARS_RAW_HSL[3];
    const textColor = isLevel3 ? 'text-black' : 'text-white';

    return (
        <div className="w-full h-5 rounded-full bg-muted/30 overflow-hidden relative flex items-center justify-center border border-black/20 my-1">
            <div className="absolute left-0 top-0 h-full" style={{ backgroundColor: `hsl(${colorVar})` }} />
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
        colorVar, // This is now a raw HSL string: "H S% L%"
        displayTextLabel,
        instanceCurrentStrength, instanceMaxStrength,
        instanceCurrentCharges, instanceMaxCharges,
        instanceCurrentUses, instanceMaxUses,
        instanceCurrentAlerts, instanceMaxAlerts,
        levelForVisuals,
    } = displayItem;

    // --- TROUBLESHOOTING LOG ---
    React.useEffect(() => {
        console.log(`[ItemCard Render]: title='${displayItem.title}', level=${levelForVisuals}, colorVar='${colorVar}'`);
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
        let isFull = false;

        if (baseItem) {
            isRechargeable = baseItem.type === 'Rechargeable' || (baseItem.category === 'Hardware' && baseItem.maxRechargeInitiations && baseItem.maxRechargeInitiations > 0) || (baseItem.category === 'Nexus Upgrades' && baseItem.durability === 'Rechargeable');
            
            const current = instanceCurrentStrength ?? instanceCurrentCharges ?? instanceCurrentUses ?? instanceCurrentAlerts;
            const max = instanceMaxStrength ?? instanceMaxCharges ?? instanceMaxUses ?? instanceMaxAlerts;
            isFull = current !== undefined && max !== undefined && current >= max;
        }

        switch (context.type) {
            case 'locker':
                return (
                    <div className="flex items-center gap-2 p-2">
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
                 return <div className="p-2"><HolographicButton onClick={handleDeploy} className="w-full">Deploy</HolographicButton></div>;
            case 'upgrade_lock':
                return <div className="p-2"><HolographicButton onClick={handleUpgrade} className="w-full">Select for Upgrade</HolographicButton></div>;
            case 'infiltrate':
                return <div className="p-2"><HolographicButton onClick={() => { /* Infiltrate logic */ onClose(); }} className="w-full">Use for Infiltration</HolographicButton></div>;
            case 'fortify_lock':
                 return <div className="p-2"><HolographicButton onClick={handleFortify} className="w-full">Fortify</HolographicButton></div>;
            default:
                return null;
        }
    };

    const levelColorHsl = `hsl(${colorVar})`;
    const levelColorHsla = `hsla(${colorVar}, 0.2)`;

    return (
        <div className="w-full h-full flex items-center justify-center p-0">
             <div 
                className="w-full h-full flex flex-col overflow-hidden rounded-xl border-2" 
                style={{ 
                    borderColor: levelColorHsl, 
                    backgroundColor: levelColorHsla,
                }}
            >
                <ScrollArea className="flex-grow w-full h-full">
                    <div className="w-full">
                        <div className="w-full bg-black/30">
                            <img src={imageSrc} alt={title} className="w-full h-auto object-contain" />
                        </div>

                        <div className="p-3 space-y-3 font-rajdhani">
                            <h2 className="text-xl font-orbitron text-center" style={{ color: levelColorHsl, wordWrap: 'break-word' }}>
                                {title}
                            </h2>

                            <div className="min-h-[4rem] flex flex-col justify-center items-center space-y-1 p-1">
                                {displayTextLabel ? (
                                     <p className="text-center font-semibold text-muted-foreground">{displayTextLabel}</p>
                                ) : (
                                    <>
                                        {instanceMaxStrength !== undefined && <ItemProgressBar label="Strength" current={instanceCurrentStrength || 0} max={instanceMaxStrength} colorVar={colorVar} />}
                                        {instanceMaxCharges !== undefined && <ItemProgressBar label="Charges" current={instanceCurrentCharges || 0} max={instanceMaxCharges} colorVar={colorVar} />}
                                        {instanceMaxUses !== undefined && <ItemProgressBar label="Uses" current={instanceCurrentUses || 0} max={instanceMaxUses} colorVar={colorVar} />}
                                        {instanceMaxAlerts !== undefined && <ItemProgressBar label="Alerts" current={instanceCurrentAlerts || 0} max={instanceMaxAlerts} colorVar={colorVar} />}
                                    </>
                                )}
                            </div>

                            <div className="py-2">
                              {renderButtons()}
                            </div>
                            
                            <div className="space-y-2 text-sm text-muted-foreground border-t border-border/50 pt-3">
                                <p>{baseItem?.description}</p>
                                {baseItem?.strength && <p><span className="font-semibold text-foreground">Strength:</span> {baseItem.strength.max}</p>}
                                {baseItem?.resistance && <p><span className="font-semibold text-foreground">Resistance:</span> {baseItem.resistance.max}</p>}
                                {baseItem?.type && <p><span className="font-semibold text-foreground">Type:</span> {baseItem.type}</p>}
                                {baseItem?.scarcity && <p><span className="font-semibold text-foreground">Scarcity:</span> {baseItem.scarcity}</p>}
                                {baseItem?.lockTypeEffectiveness?.idealCounterAgainst && <p className="mt-2 p-2 border border-green-500/50 rounded-md bg-green-500/10"><span className="font-semibold text-green-300">Effective Against:</span> {baseItem.lockTypeEffectiveness.idealCounterAgainst.join(', ')}</p>}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
