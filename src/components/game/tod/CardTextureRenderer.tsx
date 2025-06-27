// src/components/game/tod/CardTextureRenderer.tsx
// MODIFIED BY LEXI (2025-06-27): Adjusted card layout to prevent title text from being cut off
//                                and increased title font size for better readability.

"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext'; 
import { cn } from '@/lib/utils';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

// --- Constants ---
export const FALLBACK_IMAGE_SRC = '/Spi vs Spi icon.png';

// --- Level to Background Class Mapping ---
const LEVEL_TO_BG_CLASS: Record<ItemLevel, string> = {
  1: 'bg-level-1/30', 2: 'bg-level-2/30', 3: 'bg-level-3/30', 4: 'bg-level-4/30',
  5: 'bg-level-5/30', 6: 'bg-level-6/30', 7: 'bg-level-7/30', 8: 'bg-level-8/30',
  0: ''
};

// --- DisplayItem Interface ---
export interface DisplayItem {
  id: string; 
  baseItem: GameItemBase | null; 
  title: string; 
  quantityInStack: number; 
  imageSrc: string;
  colorVar: string; 
  levelForVisuals: ItemLevel; 
  stackType: 'category' | 'itemType' | 'itemLevel' | 'individual';
  path: string[];
  dataAiHint?: string;
  displayTextLabel?: string;
  instanceCurrentStrength?: number;
  instanceMaxStrength?: number;
  instanceCurrentCharges?: number;
  instanceMaxCharges?: number;
  instanceCurrentUses?: number;
  instanceMaxUses?: number;
  instanceCurrentAlerts?: number;
  instanceMaxAlerts?: number;
  aggregateCurrentStrength?: number;
  aggregateMaxStrength?: number;
  aggregateCurrentCharges?: number;
  aggregateMaxCharges?: number;
  aggregateCurrentUses?: number; 
  aggregateMaxUses?: number; 
  aggregateCurrentAlerts?: number; 
  aggregateMaxAlerts?: number; 
}

// ============================================================================
//  Card ProgressBar Component
// ============================================================================
const CardProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = React.memo(({ label, current, max, colorVar }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (    
    <div className="w-full mt-0.1 px-0.5" style={{ height: '25px' }}>
      <div 
        className="relative rounded-full overflow-hidden w-full h-full flex items-center justify-start"
        style={{ backgroundColor: `hsla(var(--muted-hsl), 0.3)` }}
      >
        <div 
          className="absolute inset-0 rounded-full" 
          style={{ width: `${percentage}%`, backgroundColor: colorVar }} 
        />
        <div className="relative z-10 w-full text-center text-[15px] font-semibold text-black mix-blend-difference pb-4">
          {label}
        </div>
      </div>      
    </div>
  );
});
CardProgressBar.displayName = 'CardProgressBar';

// ============================================================================
//  Card Visuals Component
// ============================================================================
interface CardVisualsProps {
  displayItem: DisplayItem; 
  outputWidth: number; 
  outputHeight: number;
  preloadedImage: HTMLImageElement | null;
}

const CardVisuals: React.FC<CardVisualsProps> = ({ displayItem, outputWidth, outputHeight, preloadedImage }) => {
    const { 
        colorVar: itemColorCssVar, 
        levelForVisuals, 
        title, 
        quantityInStack,
        displayTextLabel,
        instanceCurrentStrength, instanceMaxStrength,
        instanceCurrentCharges, instanceMaxCharges,
        instanceCurrentUses, instanceMaxUses,
        instanceCurrentAlerts, instanceMaxAlerts,
        aggregateCurrentStrength, aggregateMaxStrength,
        aggregateCurrentCharges, aggregateMaxCharges,
        aggregateCurrentUses, aggregateMaxUses, 
        aggregateCurrentAlerts, aggregateMaxAlerts, 
    } = displayItem;

    const cardBgClass = LEVEL_TO_BG_CLASS[levelForVisuals] || 'bg-muted/30';
    
    const currentStrength = displayItem.stackType === 'individual' ? instanceCurrentStrength : aggregateCurrentStrength;
    const maxStrength = displayItem.stackType === 'individual' ? instanceMaxStrength : aggregateMaxStrength;
    const currentCharges = displayItem.stackType === 'individual' ? instanceCurrentCharges : aggregateCurrentCharges;
    const maxCharges = displayItem.stackType === 'individual' ? instanceMaxCharges : aggregateMaxCharges;
    const currentUses = displayItem.stackType === 'individual' ? instanceCurrentUses : aggregateCurrentUses;
    const maxUses = displayItem.stackType === 'individual' ? instanceMaxUses : aggregateMaxUses;
    const currentAlerts = displayItem.stackType === 'individual' ? instanceCurrentAlerts : aggregateCurrentAlerts;
    const maxAlerts = displayItem.stackType === 'individual' ? instanceMaxAlerts : aggregateMaxAlerts;

    // Calculate the height for the progress/text area (10% of total card height)
    const progressBarAreaHeight = outputHeight * 0.10; // 10% of the total outputHeight

    return (
        <div 
            className={cn(
                "w-full h-full flex flex-col relative overflow-hidden",
                "rounded-lg border-2", 
                cardBgClass 
            )}
            style={{ 
                width: `${outputWidth}px`, 
                height: `${outputHeight}px`,
                borderColor: itemColorCssVar 
            }}
        >
            {preloadedImage ? (
                <div className="relative w-full flex-shrink-0 flex items-center justify-center" style={{ height: `${outputHeight * 0.70}px` }}> 
                    <img 
                        src={preloadedImage.src} 
                        alt={title} 
                        className="w-full h-full object-contain" 
                    />
                </div>
            ) : (
                <div className="w-full flex-shrink-0 flex items-center justify-center pointer-events-none" style={{ height: `${outputHeight * 0.70}px` }}>
                    <p className="text-2xl font-bold opacity-50 select-none">
                        LOADING IMAGE...
                    </p>
                </div>
            )}
            
            {/* Card Title and Progress Bars/Text Area */}
            <div 
                className="w-full flex-grow flex flex-col justify-between items-center" // Use flex-grow here to take remaining space
                style={{ height: `${outputHeight * 0.30}px` }} // This div now explicitly takes the remaining 30%
            >
                {/* Title */}
                <p 
                    className="text-2xl font-bold text-center w-full px-1 pt-1 break-words overflow-hidden" // Remove truncate, add break-words and padding
                    style={{ color: itemColorCssVar, flexGrow: 1 }} // Let title grow to fill space
                >
                    {title}
                </p>
                
                {/* Content Area: Either Text Label or Progress Bars */}
                <div 
                    className="w-full flex-shrink-0 flex flex-col justify-center items-center pb-5" // Use flex-shrink-0 to fix its size
                    style={{ height: `${progressBarAreaHeight}px` }} // Fixed height for this section
                >
                    {displayTextLabel ? (
                        <p className="text-lg font-semibold text-left text-slate-300 px-2">{displayTextLabel}</p>
                    ) : (
                        <div className="w-[90%] mx-auto flex flex-col">
                            {maxStrength !== undefined && maxStrength > 0 && (
                                <CardProgressBar label="Strength" current={currentStrength || 0} max={maxStrength} colorVar={itemColorCssVar} />
                            )}
                            {maxCharges !== undefined && maxCharges > 0 && (
                                <CardProgressBar label="Charges" current={currentCharges || 0} max={maxCharges} colorVar={itemColorCssVar} />
                            )}
                            {maxUses !== undefined && maxUses > 0 && (
                                <CardProgressBar label="Uses" current={currentUses || 0} max={maxUses} colorVar={itemColorCssVar} />
                            )}
                            {maxAlerts !== undefined && maxAlerts > 0 && (
                                <CardProgressBar label="Alerts" current={currentAlerts || 0} max={maxAlerts} colorVar={itemColorCssVar} />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quantity Indicator for Stack Cards */}
            {quantityInStack > 1 && (
                <div 
                    className="absolute top-1 right-1 bg-black/70 text-white text-xl font-bold rounded-full w-[50px] h-10 flex items-center justify-center border pb-[18px]"
                    style={{ borderColor: itemColorCssVar }}
                >
                    {quantityInStack}
                </div>
            )}
        </div>
    );
};
CardVisuals.displayName = 'CardVisuals';


// ============================================================================
//  CardTextureRenderer Component (Captures CardVisuals)
// ============================================================================
interface CardTextureRendererProps {
  displayItem: DisplayItem;
  onRendered: (canvas: HTMLCanvasElement) => void;
  outputWidth: number;
  outputHeight: number;
}

const CardTextureRenderer: React.FC<CardTextureRendererProps> = ({ displayItem, onRendered, outputWidth, outputHeight }) => {
    const tempDivRef = useRef<HTMLDivElement | null>(null);
    const reactRootRef = useRef<ReactDOM.Root | null>(null);
    const [preloadedImage, setPreloadedImage] = useState<HTMLImageElement | null>(null);
    const imageLoadAttemptedRef = useRef(false);

    // Effect for preloading the image
    useEffect(() => {
        let isMounted = true;
        imageLoadAttemptedRef.current = false; 
        setPreloadedImage(null); 

        const img = new Image();
        img.crossOrigin = 'anonymous'; 

        const loadAndSetImage = (src: string) => {
            imageLoadAttemptedRef.current = true; 
            img.src = src;
            img.onload = () => {
                if (isMounted) {
                    setPreloadedImage(img);
                }
            };
            img.onerror = () => {
                if (isMounted) {
                    console.error(`CardTextureRenderer (${displayItem.title}): Failed to preload image: ${src}.`);
                    if (src !== `${window.location.origin}${FALLBACK_IMAGE_SRC}`) {
                        loadAndSetImage(`${window.location.origin}${FALLBACK_IMAGE_SRC}`);
                    } else {
                        console.error(`CardTextureRenderer (${displayItem.title}): Fallback image also failed to load.`);
                        setPreloadedImage(null); 
                    }
                }
            };
        };

        const actualImageSrc = displayItem.imageSrc && (displayItem.imageSrc.startsWith('http://') || displayItem.imageSrc.startsWith('https://') || displayItem.imageSrc.startsWith('data:'))
            ? displayItem.imageSrc
            : `${window.location.origin}${displayItem.imageSrc || FALLBACK_IMAGE_SRC}`;
        
        loadAndSetImage(actualImageSrc);

        return () => {
            isMounted = false;
            img.onload = null;
            img.onerror = null;
        };
    }, [displayItem.imageSrc, displayItem.title]);


    // Effect for rendering and capturing the card
    useEffect(() => {
        if (!tempDivRef.current) {
            tempDivRef.current = document.createElement('div');
            tempDivRef.current.style.position = 'absolute';
            tempDivRef.current.style.left = '-9999px';
            tempDivRef.current.style.top = '-9999px';
            tempDivRef.current.style.width = `${outputWidth}px`;
            tempDivRef.current.style.height = `${outputHeight}px`;
            tempDivRef.current.style.backgroundColor = 'transparent'; 
            document.body.appendChild(tempDivRef.current);
            reactRootRef.current = ReactDOM.createRoot(tempDivRef.current);
        }

        const captureCard = async () => {
            if (!reactRootRef.current || !tempDivRef.current) {
                console.error("CardTextureRenderer: React root or temp div not ready for capture.");
                return;
            }

            const cardElement = (
                <React.StrictMode>
                    <CardVisuals 
                        displayItem={displayItem} 
                        outputWidth={outputWidth} 
                        outputHeight={outputHeight} 
                        preloadedImage={preloadedImage}
                    />
                </React.StrictMode>
            );

            reactRootRef.current.render(cardElement);

            await new Promise(resolve => setTimeout(resolve, 100));
            
            try {
                const canvas = await html2canvas(tempDivRef.current, {
                    backgroundColor: null, 
                    useCORS: true, 
                    allowTaint: true
                });

                onRendered(canvas);

            } catch (error) {
                console.error(`CardTextureRenderer (${displayItem.title}): html2canvas capture failed:`, error);
                const errorCanvas = document.createElement('canvas');
                errorCanvas.width = outputWidth;
                errorCanvas.height = outputHeight;
                const errorCtx = errorCanvas.getContext('2d');
                if (errorCtx) {
                    errorCtx.fillStyle = 'black';
                    errorCtx.fillRect(0, 0, outputWidth, outputHeight);
                    errorCtx.fillStyle = 'red';
                    errorCtx.fillText('Error capturing card!', 10, outputHeight / 2);
                }
                onRendered(errorCanvas);
            }
        };

        if (preloadedImage) {
            captureCard();
        } 

        return () => {
            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }
            if (tempDivRef.current && tempDivRef.current.parentNode === document.body) {
                document.body.removeChild(tempDivRef.current);
                tempDivRef.current = null;
            }
        };
    }, [displayItem, onRendered, outputWidth, outputHeight, preloadedImage]); 

    return null; 
};

export default CardTextureRenderer;