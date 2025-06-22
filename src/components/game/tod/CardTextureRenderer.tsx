// Jules Version: 2024-03-15_Debug_OnRendered_1
// src/components/game/tod/CardTextureRenderer.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext'; 
import { cn } from '@/lib/utils';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

// --- Begin: Definitions copied from EquipmentLockerSection.tsx for standalone use ---

const LEVEL_TO_BG_CLASS: Record<ItemLevel, string> = {
  1: 'bg-level-1/30', 2: 'bg-level-2/30', 3: 'bg-level-3/30', 4: 'bg-level-4/30',
  5: 'bg-level-5/30', 6: 'bg-level-6/30', 7: 'bg-level-7/30', 8: 'bg-level-8/30',
};

export interface DisplayItem {
  id: string; baseItem: GameItemBase | null; title: string; quantityInStack: number; imageSrc: string;
  colorVar: string; levelForVisuals: ItemLevel; instanceCurrentStrength?: number; instanceMaxStrength?: number;
  instanceCurrentCharges?: number; instanceMaxCharges?: number; instanceCurrentUses?: number; instanceMaxUses?: number;
  instanceCurrentAlerts?: number; instanceMaxAlerts?: number; aggregateCurrentStrength?: number; aggregateMaxStrength?: number;
  aggregateCurrentCharges?: number; aggregateMaxCharges?: number; stackType: 'category' | 'itemType' | 'itemLevel' | 'individual';
  itemCategory?: ItemCategory; itemBaseName?: string; itemLevel?: ItemLevel; originalPlayerInventoryItemId?: string;
  dataAiHint?: string; path: string[];
}

const CardProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = React.memo(({ label, current, max, colorVar }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (
    <div className="w-full text-xs mt-auto px-1">
      <div className="flex justify-between items-center text-[9px] opacity-80 mb-px">
        {label && <span className="text-left font-semibold">{label}</span>}
        <span className="text-right">{current}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden w-full" style={{ backgroundColor: `hsla(var(--muted-hsl), 0.3)` }}>
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colorVar }} />
      </div>
    </div>
  );
});
CardProgressBar.displayName = 'CardProgressBar';

// --- End: Copied Definitions ---

interface CardVisualsProps {
  displayItem: DisplayItem; outputWidth: number; outputHeight: number;
}

const CardVisuals: React.FC<CardVisualsProps> = ({ displayItem, outputWidth, outputHeight }) => {
  const { baseItem, quantityInStack, title, imageSrc, colorVar: itemColorCssVar, levelForVisuals } = displayItem;
  const fallbackImageSrc = '/Spi vs Spi icon.png';
  const actualImageSrc = imageSrc || fallbackImageSrc;
  const cardBgClass = LEVEL_TO_BG_CLASS[levelForVisuals] || 'bg-muted/30';
  let detailContent = null; let currentVal = 0; let maxVal = 0; let progressBarLabel: string | undefined = undefined;
  if (displayItem.stackType === 'individual') {
    currentVal = displayItem.instanceCurrentStrength ?? displayItem.instanceCurrentCharges ?? displayItem.instanceCurrentUses ?? displayItem.instanceCurrentAlerts ?? 0;
    maxVal = displayItem.instanceMaxStrength ?? displayItem.instanceMaxCharges ?? displayItem.instanceMaxUses ?? displayItem.instanceMaxAlerts ?? 100;
    if (displayItem.instanceCurrentStrength !== undefined) progressBarLabel = "Strength";
    else if (displayItem.instanceCurrentCharges !== undefined) progressBarLabel = "Charges";
    else if (displayItem.instanceCurrentUses !== undefined) progressBarLabel = "Uses";
    else if (displayItem.instanceCurrentAlerts !== undefined) progressBarLabel = "Alerts";
  } else if (displayItem.stackType === 'itemLevel') {
    currentVal = displayItem.aggregateCurrentStrength ?? displayItem.aggregateCurrentCharges ?? 0;
    maxVal = displayItem.aggregateMaxStrength ?? displayItem.aggregateMaxCharges ?? (quantityInStack > 0 ? quantityInStack * 100 : 100);
    if (displayItem.aggregateCurrentStrength !== undefined) progressBarLabel = "Total Strength";
    else if (displayItem.aggregateCurrentCharges !== undefined) progressBarLabel = "Total Charges";
  } else if (displayItem.stackType === 'category' || displayItem.stackType === 'itemType') {
    currentVal = displayItem.aggregateCurrentStrength ?? displayItem.aggregateCurrentCharges ?? 0;
    maxVal = displayItem.aggregateMaxStrength ?? displayItem.aggregateMaxCharges ?? (quantityInStack > 0 ? quantityInStack * 100 : 100);
    progressBarLabel = displayItem.aggregateCurrentStrength !== undefined ? "Avg. Integrity" : "Avg. Charge";
  }
  const isSingleUseType = baseItem?.type === 'One-Time Use' || baseItem?.type === 'Consumable';
  const isPermanentType = baseItem?.type === 'Permanent';
  if (displayItem.stackType === 'individual') {
    if (isSingleUseType) {
      detailContent = <p className="text-[9px] text-center font-semibold p-0.5 rounded bg-black/30 mt-auto mx-1" style={{ color: itemColorCssVar }}>Single Use</p>;
    } else if (isPermanentType) {
      detailContent = <p className="text-[9px] text-center font-semibold p-0.5 rounded bg-black/30 mt-auto mx-1" style={{ color: itemColorCssVar }}>Permanent</p>;
    } else if (progressBarLabel && maxVal > 0) {
      detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
    }
  } else if ((displayItem.stackType === 'category' || displayItem.stackType === 'itemType' || displayItem.stackType === 'itemLevel') && progressBarLabel && maxVal > 0) {
    detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
  }
  return (
    <div
      className={cn("w-full h-full rounded-md border flex flex-col items-center justify-start overflow-hidden relative", cardBgClass)}
      style={{
        width: `${outputWidth}px`, height: `${outputHeight}px`, borderColor: itemColorCssVar,
        fontFamily: 'var(--font-rajdhani)', color: `hsl(var(--foreground-hsl))`,
        boxShadow: `0 0 5px ${itemColorCssVar}`, boxSizing: 'border-box',
      }}>
      {quantityInStack > 1 && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full z-10 shadow-md"
             style={{ borderColor: itemColorCssVar, borderWidth: '1px' }}>{quantityInStack}</div>
      )}
      <div className="w-full h-3/5 relative flex-shrink-0">
        <img src={actualImageSrc} alt={title} className="w-full h-full object-fill"
             data-ai-hint={displayItem.dataAiHint || "item icon"} crossOrigin="anonymous"
             onError={(e) => {
               const target = e.currentTarget as HTMLImageElement;
               if (target.src !== fallbackImageSrc) { target.src = fallbackImageSrc; target.onerror = null; }
             }}/>
      </div>
      <div className="w-full px-1 py-0.5 flex flex-col justify-between flex-grow min-h-0">
        <p className="text-[10px] font-semibold text-center leading-tight mb-0.5" style={{ color: itemColorCssVar }}>{title}</p>
        <div className="w-full text-xs space-y-0.5 overflow-y-auto scrollbar-hide flex-grow mt-auto">{detailContent}</div>
      </div>
    </div>
  );
};

interface CardTextureRendererProps {
  displayItem: DisplayItem; onRendered: (canvas: HTMLCanvasElement) => void;
  outputWidth: number; outputHeight: number;
}

const CardTextureRenderer: React.FC<CardTextureRendererProps> = ({ displayItem, onRendered, outputWidth, outputHeight }) => {
  useEffect(() => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute'; tempDiv.style.left = '-99999px'; tempDiv.style.top = '-99999px';
    tempDiv.style.width = `${outputWidth}px`; tempDiv.style.height = `${outputHeight}px`; tempDiv.style.zIndex = '-1';
    document.body.appendChild(tempDiv);
    const reactRoot = ReactDOM.createRoot(tempDiv);
    reactRoot.render(<React.StrictMode><CardVisuals displayItem={displayItem} outputWidth={outputWidth} outputHeight={outputHeight} /></React.StrictMode>);
    const timeoutId = setTimeout(() => {
      html2canvas(tempDiv, {
        width: outputWidth, height: outputHeight, backgroundColor: '#FFFF00',
        useCORS: true, scale: 1, logging: true 
      }).then(canvas => {
        console.log(`CardTextureRenderer (${displayItem.title}): html2canvas successful. Canvas dimensions: ${canvas.width}x${canvas.height}.`);
        console.log(`CardTextureRenderer (${displayItem.title}): Type of onRendered is: ${typeof onRendered}`);
        if (typeof onRendered === 'function') {
          console.log(`CardTextureRenderer (${displayItem.title}): Attempting to call onRendered...`);
          onRendered(canvas);
          console.log(`CardTextureRenderer (${displayItem.title}): onRendered call completed.`);
        } else {
          console.error(`CardTextureRenderer (${displayItem.title}): onRendered is NOT a function!`);
        }
      }).catch(error => {
        console.error(`CardTextureRenderer (${displayItem.title}): Error in html2canvas promise chain:`, error);
      }).finally(() => {
        reactRoot.unmount();
        if (tempDiv.parentNode === document.body) { document.body.removeChild(tempDiv); }
      });
    }, 1000);
    return () => {
      clearTimeout(timeoutId);
      try { reactRoot.unmount(); } catch (e) { /* ignore */ }
      if (tempDiv.parentNode === document.body) { document.body.removeChild(tempDiv); }
    };
  }, [displayItem, outputWidth, outputHeight, onRendered]);
  return null;
};
export default CardTextureRenderer;