// src/components/game/item-browser/ItemCard.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import type { DisplayItem } from '@/components/game/tod/CardTextureRenderer';
import { HolographicButton, HolographicPanel } from '../shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import type { ItemWindowContext } from './ItemSliderWindow';
import { Recycle } from 'lucide-react';

// Using the progress bar from CardTextureRenderer as a reference
const ItemProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = ({ label, current, max, colorVar }) => {
    const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
    return (
        <div className="w-full h-6 rounded-full bg-muted/30 overflow-hidden relative flex items-center justify-center">
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colorVar }} />
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
    const { showConfirmation, hideConfirmation, rechargeItem, offloadItem, deployItemToVault, upgradeLock, spendElint } = useAppContext();
    const [isSticky, setIsSticky] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLDivElement>(null);

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
    } = displayItem;
    
    // Check for scroll to make title sticky
    useEffect(() => {
        const container = scrollContainerRef.current;
        const titleEl = titleRef.current;
        if (!container || !titleEl) return;

        const handleScroll = () => {
            const titleRect = titleEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            // Sticky when the top of the title element hits the top of the container
            setIsSticky(titleRect.top <= containerRect.top);
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, []);


    const handleRecharge = () => {
        const rechargeCost = baseItem?.rechargeCost ?? 50; // Placeholder
        showConfirmation({
            title: `Recharge ${title}?`,
            content: (
                <div className="flex flex-col items-center gap-4">
                    <p>Cost: {rechargeCost} ELINT</p>
                    {instanceMaxStrength && <ItemProgressBar label="Strength" current={instanceCurrentStrength || 0} max={instanceMaxStrength} colorVar={colorVar} />}
                    {instanceMaxCharges && <ItemProgressBar label="Charges" current={instanceCurrentCharges || 0} max={instanceMaxCharges} colorVar={colorVar} />}
                     {instanceMaxAlerts && <ItemProgressBar label="Alerts" current={instanceCurrentAlerts || 0} max={instanceMaxAlerts} colorVar={colorVar} />}
                </div>
            ),
            confirmText: "Recharge",
            onConfirm: () => {
                // Call recharge logic from context
                console.log(`Recharging ${displayItem.id}`);
                // In a real scenario, this would loop or the popup would stay open
                rechargeItem(displayItem.id, context.type === 'deploy_lock' || context.type === 'deploy_nexus' ? context.vaultSlotId : undefined);
                hideConfirmation(); // For now, just close it
            }
        });
    };

    const handleOffload = () => {
        showConfirmation({
            title: `Offload ${title}?`,
            content: <p>This item will be removed from your inventory and may be discoverable by other agents. This action cannot be undone.</p>,
            confirmText: "Confirm Offload",
            onConfirm: () => {
                offloadItem(displayItem.id);
                hideConfirmation();
                onClose(); // Close the slider window after offloading
            }
        });
    };
    
    const handleDeploy = () => {
        if(context.type === 'deploy_lock' || context.type === 'deploy_nexus') {
            deployItemToVault(context.vaultSlotId, displayItem.id);
            onClose();
        }
    };
    
    const handleUpgrade = () => {
        if(context.type === 'upgrade_lock') {
            showConfirmation({
                title: 'Confirm Upgrade',
                content: <p>Your currently installed <span style={{color: context.currentLock.colorVar}}>{context.currentLock.title}</span> will be destroyed and replaced with <span style={{color: displayItem.colorVar}}>{displayItem.title}</span>. Are you sure?</p>,
                confirmText: "Replace",
                onConfirm: () => {
                    upgradeLock(context.vaultSlotId, displayItem.id);
                    hideConfirmation();
                    onClose();
                }
            });
        }
    }

    const renderButtons = () => {
        switch (context.type) {
            case 'locker':
                const isRechargeable = baseItem?.durability === 'Rechargeable' || baseItem?.type === 'Rechargeable';
                const isFull = instanceCurrentStrength === instanceMaxStrength;
                return (
                    <div className="flex items-center gap-2">
                        <HolographicButton onClick={handleOffload} className="!p-2">
                            <Recycle className="w-5 h-5" />
                        </HolographicButton>
                        {isRechargeable && (
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
            default:
                return null;
        }
    };

    return (
        <HolographicPanel className="w-[90vw] max-w-[400px] h-[85vh] max-h-[700px] p-0 flex flex-col overflow-hidden">
            {/* Scrollable Container */}
            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto relative scrollbar-hide">
                {/* Sticky Header Container */}
                 <div className={cn("sticky top-0 z-10 transition-all", isSticky && "bg-black/80 backdrop-blur-sm py-2")}>
                    <div ref={titleRef} className={cn("p-4 transition-all", isSticky ? "text-center" : "text-left")}>
                         <h2 className="text-2xl font-orbitron holographic-text" style={{ color: colorVar }}>
                            {title}
                        </h2>
                    </div>
                 </div>

                {/* Initial View Content (Image, Bars, Buttons) */}
                <div className="p-4 pt-0">
                    <div className="w-full aspect-[9/13] max-h-[350px] mx-auto mb-4">
                        <img src={imageSrc} alt={title} className="w-full h-full object-contain" />
                    </div>

                    <div className="mb-4 px-2 space-y-2">
                        {displayTextLabel ? (
                             <p className="text-center font-semibold text-muted-foreground">{displayTextLabel}</p>
                        ) : (
                            <>
                                {instanceMaxStrength && <ItemProgressBar label="Strength" current={instanceCurrentStrength || 0} max={instanceMaxStrength} colorVar={colorVar} />}
                                {instanceMaxCharges && <ItemProgressBar label="Charges" current={instanceCurrentCharges || 0} max={instanceMaxCharges} colorVar={colorVar} />}
                                {instanceMaxUses && <ItemProgressBar label="Uses" current={instanceCurrentUses || 0} max={instanceMaxUses} colorVar={colorVar} />}
                                {instanceMaxAlerts && <ItemProgressBar label="Alerts" current={instanceCurrentAlerts || 0} max={instanceMaxAlerts} colorVar={colorVar} />}
                            </>
                        )}
                    </div>

                    <div className="mb-6">
                        {renderButtons()}
                    </div>
                    
                    {/* Detailed Info */}
                    <div className="space-y-3 text-sm font-rajdhani">
                        <p>{baseItem?.description}</p>
                        {baseItem?.strength && <p><span className="font-semibold">Strength:</span> {baseItem.strength.max}</p>}
                        {baseItem?.resistance && <p><span className="font-semibold">Resistance:</span> {baseItem.resistance.max}</p>}
                        {baseItem?.type && <p><span className="font-semibold">Type:</span> {baseItem.type}</p>}
                        {baseItem?.scarcity && <p><span className="font-semibold">Scarcity:</span> {baseItem.scarcity}</p>}
                        {baseItem?.lockTypeEffectiveness?.idealCounterAgainst && <p className="mt-2 p-2 border border-green-500/50 rounded-md bg-green-500/10"><span className="font-semibold text-green-300">Effective Against:</span> {baseItem.lockTypeEffectiveness.idealCounterAgainst.join(', ')}</p>}
                    </div>
                </div>
            </div>
        </HolographicPanel>
    );
};