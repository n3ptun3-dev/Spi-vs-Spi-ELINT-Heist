// src/components/game/tod/CardTextureRenderer.tsx
// MODIFIED BY GEMINI and Louis (v25): Added 'export' to FALLBACK_IMAGE_SRC to make it importable
//                           in other files, resolving the 'not exported' error.

"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext'; 
import { cn } from '@/lib/utils';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';

// --- Constants ---
export const FALLBACK_IMAGE_SRC = '/Spi vs Spi icon.png'; // NOW EXPORTED!

// --- Level to Background Class Mapping ---
const LEVEL_TO_BG_CLASS: Record<ItemLevel, string> = {
  1: 'bg-level-1/30', 2: 'bg-level-2/30', 3: 'bg-level-3/30', 4: 'bg-level-4/30',
  5: 'bg-level-5/30', 6: 'bg-level-6/30', 7: 'bg-level-7/30', 8: 'bg-level-8/30',
  0: ''
};

// --- DisplayItem Interface (Keep this in sync with AppContext or a shared types file if possible) ---
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
}

// ============================================================================
//  Card ProgressBar Component
// ============================================================================
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

// ============================================================================
//  Card Visuals Component (the 2D React component that html2canvas captures)
// ============================================================================
interface CardVisualsProps {
  displayItem: DisplayItem; 
  outputWidth: number; 
  outputHeight: number;
  onImageReady: () => void; // Callback to signal image (or fallback) is loaded/errored
}

const CardVisuals: React.FC<CardVisualsProps> = ({ displayItem, outputWidth, outputHeight, onImageReady }) => {
    const { baseItem, quantityInStack, title, imageSrc, colorVar: itemColorCssVar, levelForVisuals } = displayItem;
    const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

    // Use the fallback image if imageSrc is empty or null, or if original failed
    const actualImageSrc = useMemo(() => {
        if (!imageSrc) return FALLBACK_IMAGE_SRC;
        // Check if the image starts with http or has a protocol, if not, prepend origin
        // This is a common pattern for images served from the same domain
        if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://') || imageSrc.startsWith('data:')) {
            return imageSrc;
        }
        return `${window.location.origin}${imageSrc}`;
    }, [imageSrc]);

    // This effect ensures that if actualImageSrc changes, we reset the status
    useEffect(() => {
        setImageStatus('loading');
    }, [actualImageSrc]);

    const handleImageLoad = useCallback(() => {
        console.log(`CardVisuals (${displayItem.title}): Image loaded successfully: ${actualImageSrc}`);
        setImageStatus('loaded');
        onImageReady(); // Image is ready, signal to parent
    }, [actualImageSrc, displayItem.title, onImageReady]);

    const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.currentTarget;
        console.error(`CardVisuals (${displayItem.title}): Failed to load image: ${target.src}. Attempting fallback.`);
        
        // Prevent infinite loop if fallback image also fails to load or is already set
        if (target.src !== `${window.location.origin}${FALLBACK_IMAGE_SRC}`) {
            target.src = `${window.location.origin}${FALLBACK_IMAGE_SRC}`;
            // Remove the error handler for the fallback image to prevent loops
            target.onerror = null; 
        }
        setImageStatus('error'); // Mark as error, fallback is being attempted or displayed
        onImageReady(); // Image is ready (or failed, but fallback path taken), signal to parent
    }, [displayItem.title, onImageReady]);

    const cardBgClass = LEVEL_TO_BG_CLASS[levelForVisuals] || 'bg-muted/30';
    let detailContent = null; 
    let currentVal = 0; 
    let maxVal = 0; 
    let progressBarLabel: string | undefined = undefined;
  
    // Logic for determining progress bar and details content
    if (displayItem.stackType === 'individual') {
        currentVal = displayItem.instanceCurrentStrength ?? displayItem.instanceCurrentCharges ?? displayItem.instanceCurrentUses ?? displayItem.instanceCurrentAlerts ?? 0;
        maxVal = displayItem.instanceMaxStrength ?? displayItem.instanceMaxCharges ?? displayItem.instanceMaxUses ?? displayItem.instanceMaxAlerts ?? 100;
        if (displayItem.instanceCurrentStrength !== undefined) progressBarLabel = "Strength";
        else if (displayItem.instanceCurrentCharges !== undefined) progressBarLabel = "Charges";
        else if (displayItem.instanceCurrentUses !== undefined) progressBarLabel = "Uses";
        else if (displayItem.instanceCurrentAlerts !== undefined) progressBarLabel = "Alerts";
    } else { // For stacks (itemType, itemLevel, category)
        currentVal = displayItem.aggregateCurrentStrength ?? displayItem.aggregateCurrentCharges ?? 0;
        maxVal = displayItem.aggregateMaxStrength ?? displayItem.aggregateMaxCharges ?? (displayItem.quantityInStack > 0 ? displayItem.quantityInStack * 100 : 100);
        // Special labels for aggregated stacks
        if (displayItem.stackType === 'itemLevel') {
            progressBarLabel = (displayItem.aggregateCurrentStrength !== undefined) ? "Total Strength" : "Total Charges";
        } else { // category or itemType
            progressBarLabel = (displayItem.aggregateCurrentStrength !== undefined) ? "Avg. Integrity" : "Avg. Charge";
        }
    }
    
    const isSingleUseType = baseItem?.type === 'One-Time Use' || baseItem?.type === 'Consumable';
    const isPermanentType = baseItem?.type === 'Permanent';
    
    // Determine content based on stack type and item properties
    if (displayItem.stackType === 'individual') {
      if (isSingleUseType) {
        detailContent = <p className="text-[9px] text-center font-semibold p-0.5 rounded bg-black/30 mt-auto mx-1" style={{ color: itemColorCssVar }}>Single Use</p>;
      } else if (isPermanentType) {
        detailContent = <p className="text-[9px] text-center font-semibold p-0.5 rounded bg-black/30 mt-auto mx-1" style={{ color: itemColorCssVar }}>Permanent</p>;
      } else if (progressBarLabel && maxVal > 0) {
        detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
      }
    } else if (progressBarLabel && maxVal > 0) { // For any stack that has a progress bar
      detailContent = <CardProgressBar label={progressBarLabel} current={currentVal} max={maxVal} colorVar={itemColorCssVar} />;
    }


    return (
        <div
            className={cn("w-full h-full rounded-md border flex flex-col items-center justify-start overflow-hidden relative", cardBgClass)}
            style={{
                width: `${outputWidth}px`, height: `${outputHeight}px`, borderColor: itemColorCssVar,
                fontFamily: 'var(--font-rajdhani)', color: `hsl(var(--foreground-hsl))`,
                boxShadow: `0 0 5px ${itemColorCssVar}`, // Using 5px for a consistent, subtle glow
                boxSizing: 'border-box',
            }}>
            {quantityInStack > 1 && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full z-10 shadow-md"
                    style={{ borderColor: itemColorCssVar, borderWidth: '1px' }}>
                    {quantityInStack}
                </div>
            )}
            <div className="w-full h-3/5 relative flex-shrink-0 flex items-center justify-center"> {/* Added flex centering for loading/error */}
                {imageStatus === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                        Loading Image...
                    </div>
                )}
                <img 
                    src={actualImageSrc} 
                    alt={title} 
                    className={cn(
                        "w-full h-full object-fill", 
                        imageStatus === 'loading' ? 'opacity-0' : 'opacity-100' // Hide image until loaded
                    )} 
                    crossOrigin="anonymous"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    // Explicitly set display property to ensure it renders for html2canvas
                    style={{ display: imageStatus === 'loading' ? 'none' : 'block' }} 
                />
                 {/* This gradient is on top of the image for visual effect */}
                 <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-50" />
            </div>
            <div className="w-full px-1 py-0.5 flex flex-col justify-between flex-grow min-h-0">
                <p className="text-[10px] font-semibold text-center leading-tight mb-0.5" style={{ color: itemColorCssVar }}>{title}</p>
                <div className="w-full text-xs space-y-0.5 overflow-y-auto scrollbar-hide flex-grow mt-auto">{detailContent}</div>
            </div>
        </div>
    );
};

// ============================================================================
//  Card Texture Renderer Component (orchestrates html2canvas capture)
// ============================================================================
interface CardTextureRendererProps {
  displayItem: DisplayItem; 
  onRendered: (canvas: HTMLCanvasElement) => void;
  outputWidth: number; 
  outputHeight: number;
}

const CardTextureRenderer: React.FC<CardTextureRendererProps> = ({ displayItem, onRendered, outputWidth, outputHeight }) => {
    const reactRootRef = useRef<ReactDOM.Root | null>(null);
    const tempDivRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Create a temporary div for rendering React component to capture with html2canvas
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute'; 
        tempDiv.style.left = '-9999px'; // Position off-screen
        tempDiv.style.top = '-99999px';
        tempDiv.style.width = `${outputWidth}px`; 
        tempDiv.style.height = `${outputHeight}px`;
        tempDiv.style.zIndex = '-1'; // Ensure it's not visible
        document.body.appendChild(tempDiv);
        tempDivRef.current = tempDiv;

        reactRootRef.current = ReactDOM.createRoot(tempDiv);

        // This function will be called by CardVisuals when its image is ready
        const onImageReadyToCapture = () => {
            console.log(`CardTextureRenderer (${displayItem.title}): Image reported ready. Capturing with html2canvas...`);
            html2canvas(tempDiv, {
                backgroundColor: null, // CRITICAL: Ensure transparent background
                useCORS: true,
                scale: window.devicePixelRatio * 2, // Use higher scale for better quality textures
                logging: false // Keep logging off for production
            }).then(canvas => {
                console.log(`CardTextureRenderer (${displayItem.title}): html2canvas captured successfully.`);
                if (typeof onRendered === 'function') {
                    onRendered(canvas);
                } else {
                    console.warn(`CardTextureRenderer (${displayItem.title}): onRendered prop is not a function.`);
                }
            }).catch(error => {
                console.error(`CardTextureRenderer (${displayItem.title}): Error during html2canvas capture:`, error);
            }).finally(() => {
                // Clean up: unmount React root and remove temp div
                if (reactRootRef.current) {
                    reactRootRef.current.unmount();
                    reactRootRef.current = null;
                }
                if (tempDivRef.current && tempDivRef.current.parentNode === document.body) {
                    document.body.removeChild(tempDivRef.current);
                    tempDivRef.current = null;
                }
                console.log(`CardTextureRenderer (${displayItem.title}): Cleanup complete.`);
            });
        };

        // Render CardVisuals into the temporary div, passing the callback
        reactRootRef.current.render(
            <React.StrictMode>
                <CardVisuals 
                    displayItem={displayItem} 
                    outputWidth={outputWidth} 
                    outputHeight={outputHeight} 
                    onImageReady={onImageReadyToCapture} 
                />
            </React.StrictMode>
        );

        // Cleanup function for useEffect
        return () => {
            console.log(`CardTextureRenderer (${displayItem.title}): Cleanup on unmount.`);
            // Ensure cleanup happens even if component unmounts before image is ready
            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }
            if (tempDivRef.current && tempDivRef.current.parentNode === document.body) {
                document.body.removeChild(tempDivRef.current);
                tempDivRef.current = null;
            }
        };
    }, [displayItem, onRendered, outputWidth, outputHeight]);
    
    return null; // This component doesn't render anything directly
};

export default CardTextureRenderer;

