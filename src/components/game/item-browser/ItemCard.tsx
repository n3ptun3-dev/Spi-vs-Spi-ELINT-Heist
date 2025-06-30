// src/components/game/item-browser/ItemCard.tsx
"use client";

import React from 'react';
import { HolographicButton, HolographicPanel } from '../shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useAppContext, type DisplayItem, type ItemWindowContext } from '@/contexts/AppContext';
import { Recycle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

const ItemProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = ({ label, current, max, colorVar }) => {
    const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    return (
        <div className="w-full h-5 rounded-full bg-muted/30 overflow-hidden relative flex items-center justify-center border border-black/20">
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: `hsl(${colorVar})` }} />
            <div className="relative z-10 text-xs font-bold text-white mix-blend-overlay">
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
    const { showConfirmation, hideConfirmation, rechargeItem, offloadItem, deployItemToVault, upgradeLock } = useAppContext();

    const {
        baseItem,
        title,
        imageSrc,
        colorVar,
        displayTextLabel,
        instanceCurrentStrength, instanceMaxStrength,
        instanceCurrentCharges, instanceMaxCharges,
        instanceCurrentUses, instanceMaxUses,
        instanceCurrentAlerts, instanceMaxAlerts,
        levelForVisuals,
    } = displayItem;

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
    
    const handleDeploy = () => {
        if((context.type === 'deploy_lock' || context.type === 'deploy_nexus') && displayItem.baseItem) {
            deployItemToVault(context.vaultSlotId, displayItem.baseItem.id);
            onClose();
        }
    };
    
    const handleUpgrade = () => {
        if(context.type === 'upgrade_lock' && displayItem.baseItem) {
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

    const renderButtons = () => {
        switch (context.type) {
            case 'locker':
                const isRechargeable = baseItem?.durability === 'Rechargeable' || baseItem?.type === 'Rechargeable' || baseItem?.category === 'Hardware';
                const isFull = instanceCurrentStrength === instanceMaxStrength || instanceCurrentCharges === instanceMaxCharges || instanceCurrentAlerts === instanceMaxAlerts || instanceCurrentUses === instanceMaxUses;

                return (
                    <div className="flex items-center gap-2 p-2">
                        <HolographicButton onClick={handleOffload} className="!p-2">
                            <Recycle className="w-5 h-5" />
                        </HolographicButton>
                        {isRechargeable && baseItem.type !== 'One-Time Use' && (
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
            default:
                return null;
        }
    };
    
    const themeColor = `hsl(${colorVar})`;
    const levelColorVar = ITEM_LEVEL_COLORS_CSS_VARS[levelForVisuals] || ITEM_LEVEL_COLORS_CSS_VARS[1];

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full h-full rounded-xl flex flex-col overflow-hidden bg-black/50 border-2" style={{ borderColor: `hsl(${levelColorVar})`, aspectRatio: '4 / 6' }}>
                <ScrollArea className="flex-grow w-full h-full">
                    {/* Image */}
                    <div className="w-full aspect-[4/3] bg-black/30">
                        <img src={imageSrc} alt={title} className="w-full h-full object-contain" />
                    </div>

                    <div className="p-3 space-y-3 font-rajdhani">
                        {/* Title */}
                        <h2 className="text-2xl font-orbitron text-center truncate" style={{ color: themeColor }}>
                            {title}
                        </h2>

                        {/* Progress/Text Area */}
                        <div className="min-h-[4rem] flex flex-col justify-center items-center space-y-1">
                            {displayTextLabel ? (
                                 <p className="text-center font-semibold text-muted-foreground">{displayTextLabel}</p>
                            ) : (
                                <>
                                    {instanceMaxStrength && <ItemProgressBar label="Strength" current={instanceCurrentStrength || 0} max={instanceMaxStrength} colorVar={levelColorVar} />}
                                    {instanceMaxCharges && <ItemProgressBar label="Charges" current={instanceCurrentCharges || 0} max={instanceMaxCharges} colorVar={levelColorVar} />}
                                    {instanceMaxUses && <ItemProgressBar label="Uses" current={instanceCurrentUses || 0} max={instanceMaxUses} colorVar={levelColorVar} />}
                                    {instanceMaxAlerts && <ItemProgressBar label="Alerts" current={instanceCurrentAlerts || 0} max={instanceMaxAlerts} colorVar={levelColorVar} />}
                                </>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="py-2">
                          {renderButtons()}
                        </div>
                        
                        {/* Detailed Info */}
                        <div className="space-y-2 text-sm text-muted-foreground border-t border-border/50 pt-3">
                            <p>{baseItem?.description}</p>
                            {baseItem?.strength && <p><span className="font-semibold text-foreground">Strength:</span> {baseItem.strength.max}</p>}
                            {baseItem?.resistance && <p><span className="font-semibold text-foreground">Resistance:</span> {baseItem.resistance.max}</p>}
                            {baseItem?.type && <p><span className="font-semibold text-foreground">Type:</span> {baseItem.type}</p>}
                            {baseItem?.scarcity && <p><span className="font-semibold text-foreground">Scarcity:</span> {baseItem.scarcity}</p>}
                            {baseItem?.lockTypeEffectiveness?.idealCounterAgainst && <p className="mt-2 p-2 border border-green-500/50 rounded-md bg-green-500/10"><span className="font-semibold text-green-300">Effective Against:</span> {baseItem.lockTypeEffectiveness.idealCounterAgainst.join(', ')}</p>}
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
