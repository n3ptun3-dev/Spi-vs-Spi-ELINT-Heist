
// src/components/game/tod/CardTextureRenderer.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext'; 
import { cn } from '@/lib/utils';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

// --- Begin: Definitions copied from EquipmentLockerSection.tsx for standalone use ---
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
      <div className="flex justify-between items-center text-[10px] opacity-80 mb-px">
        {label && <span className="text-left font-semibold">{label}</span>}
        <span className="text-right">{current}/{max}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden w-full" style={{ backgroundColor: `hsla(var(--muted-hsl), 0.3)` }}>
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colorVar }} />
      </div>
    </div>
  );
});
CardProgressBar.displayName = 'CardProgressBar';
// --- End: Copied Definitions ---

// This will now contain the user's requested visual changes.
const CardVisuals: React.FC<{ displayItem: DisplayItem; outputWidth: number; outputHeight: number; }> = ({ displayItem, outputWidth, outputHeight }) => {
  const { baseItem, quantityInStack, title, imageSrc, colorVar: itemColorCssVar, levelForVisuals } = displayItem;
  const fallbackImageSrc = '/Spi vs Spi icon.png';
  let detailContent = null;

  if (displayItem.stackType === 'individual') {
      const currentVal = displayItem.instanceCurrentStrength ?? displayItem.instanceCurrentCharges ?? displayItem.instanceCurrentUses ?? displayItem.instanceCurrentAlerts ?? 0;
      const maxVal = displayItem.instanceMaxStrength ?? displayItem.instanceMaxCharges ?? displayItem.instanceMaxUses ?? displayItem.instanceMaxAlerts ?? 100;
      let progressBarLabel: string | undefined;
      if (displayItem.instanceCurrentStrength !== undefined) progressBarLabel = "Strength";
      else if (displayItem.instanceCurrentCharges !== undefined) progressBarLabel = "Charges";
      else if (displayItem.instanceCurrentUses !== undefined) progressBarLabel = "Uses";
      else if (displayItem.instanceCurrentAlerts !== undefined) progressBarLabel = "Alerts";
      if (progressBarLabel && maxVal > 0) {
          detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
      }
  } else { // For stacks
      const currentVal = displayItem.aggregateCurrentStrength ?? displayItem.aggregateCurrentCharges ?? 0;
      const maxVal = displayItem.aggregateMaxStrength ?? displayItem.aggregateMaxCharges ?? 0;
      let progressBarLabel: string | undefined;
      if (displayItem.aggregateCurrentStrength !== undefined && maxVal > 0) progressBarLabel = "Avg. Integrity";
      else if (displayItem.aggregateCurrentCharges !== undefined && maxVal > 0) progressBarLabel = "Avg. Charge";
      if (progressBarLabel && maxVal > 0) {
          detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
      }
  }

  return (
    <div
      className={cn("w-full h-full rounded-xl border flex flex-col items-center justify-start overflow-hidden relative bg-card/80")}
      style={{
        width: `${outputWidth}px`, height: `${outputHeight}px`, borderColor: itemColorCssVar,
        fontFamily: 'var(--font-rajdhani)', color: `hsl(var(--foreground-hsl))`,
        boxShadow: `0 0 8px ${itemColorCssVar}, inset 0 0 10px hsla(var(--card-hsl), 0.8)`,
        backdropFilter: 'blur(4px)', boxSizing: 'border-box',
      }}>
      {quantityInStack > 1 && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full z-10 shadow-lg"
             style={{ borderColor: itemColorCssVar, borderWidth: '1.5px', filter: `drop-shadow(0 0 3px ${itemColorCssVar})` }}>
            {quantityInStack}
        </div>
      )}
      <div className="w-full h-3/5 relative flex-shrink-0">
        <img src={imageSrc || fallbackImageSrc} alt={title} className="w-full h-full object-fill"
             data-ai-hint={displayItem.dataAiHint || "item icon"} crossOrigin="anonymous"
             onError={(e) => {
               const target = e.currentTarget as HTMLImageElement;
               if (target.src !== fallbackImageSrc) {
                 target.src = fallbackImageSrc;
                 target.onerror = null;
               }
             }}/>
         <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-50" />
      </div>
      <div className="w-full px-1 py-0.5 flex flex-col justify-between flex-grow min-h-0">
        <p className="text-sm font-semibold text-center leading-tight mb-0.5 truncate" style={{ color: itemColorCssVar }}>{title}</p>
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
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = `${outputWidth}px`;
    tempDiv.style.height = `${outputHeight}px`;
    tempDiv.style.zIndex = '-1';
    document.body.appendChild(tempDiv);
    
    const reactRoot = ReactDOM.createRoot(tempDiv);
    
    reactRoot.render(
        <React.StrictMode>
            <CardVisuals displayItem={displayItem} outputWidth={outputWidth} outputHeight={outputHeight} />
        </React.StrictMode>
    );

    // Give a short timeout for images/styles to load before capturing
    const timeoutId = setTimeout(() => {
      html2canvas(tempDiv, {
        width: outputWidth,
        height: outputHeight,
        backgroundColor: null, // Transparent background
        useCORS: true,
        scale: 1,
      }).then(canvas => {
        onRendered(canvas);
      }).catch(error => {
        console.error(`CardTextureRenderer (${displayItem.title}): Error in html2canvas promise chain:`, error);
      }).finally(() => {
        reactRoot.unmount();
        if (tempDiv.parentNode === document.body) {
          document.body.removeChild(tempDiv);
        }
      });
    }, 500); // 500ms delay to allow images/fonts to load

    return () => {
      clearTimeout(timeoutId);
      try {
        reactRoot.unmount();
      } catch (e) {
        // Ignore errors on unmount, div might already be gone
      }
      if (tempDiv.parentNode === document.body) {
        document.body.removeChild(tempDiv);
      }
    };
  }, [displayItem, outputWidth, outputHeight, onRendered]);

  return null; // This component does not render anything directly
};

export default CardTextureRenderer;
