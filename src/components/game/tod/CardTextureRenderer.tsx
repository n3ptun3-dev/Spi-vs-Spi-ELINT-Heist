// src/components/game/tod/CardTextureRenderer.tsx
// MODIFIED BY GEMINI and Louis (v39): Removed extraneous s from the code
//                                    and corrected the import paths for 'cn' and 'ITEM_LEVEL_COLORS_CSS_VARS'.
//                                    This should resolve all current build errors.

"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import html2canvas from 'html2canvas';
import { type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext'; 
import { cn } from '@/lib/utils'; // Corrected import path
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants'; // Corrected import path

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
//  Card ProgressBar Component (Kept for future reintroduction, not used now)
// ============================================================================
const CardProgressBar: React.FC<{ label?: string; current: number; max: number; colorVar: string }> = React.memo(({ label, current, max, colorVar }) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (    
    <div className="w-full mt-auto px-1">
      <div className="flex justify-between items-center text-[9px] opacity-80 mb-px">
        {label && <span className="text-left font-semibold">{label}</span>}
        <span className="text-right">{current}/{max}</span>
      </div>
      <div className="rounded-full overflow-hidden w-full" style={{ height: '6px', backgroundColor: `hsla(var(--muted-hsl), 0.3)` }}>
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: colorVar }} />
      </div>      
    </div>
  );
});
CardProgressBar.displayName = 'CardProgressBar';

// ============================================================================
//  Card Visuals Component (Now renders the <img> tag directly)
// ============================================================================
interface CardVisualsProps {
  displayItem: DisplayItem; 
  outputWidth: number; 
  outputHeight: number;
  preloadedImage: HTMLImageElement | null; // New prop to receive the preloaded image
}

const CardVisuals: React.FC<CardVisualsProps> = ({ displayItem, outputWidth, outputHeight, preloadedImage }) => {
    const { colorVar: itemColorCssVar, levelForVisuals, title } = displayItem; // Keep title for image alt text

    const cardBgClass = LEVEL_TO_BG_CLASS[levelForVisuals] || 'bg-muted/30';
    
    return (
        <div 
            className={cn(
                "w-full h-full flex flex-col items-center justify-center relative overflow-hidden",
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
                // Render the image if preloadedImage is available
                <img 
                    src={preloadedImage.src} 
                    alt={title} // Use title as alt text for accessibility
                    className="w-full h-full object-contain p-2" // Adjust styling as needed
                    style={{
                        // Ensure image takes up appropriate space within the card
                        // For now, let's try to fill the card as much as possible
                        // You might need to adjust this once content is reintroduced
                        width: 'calc(100% - 20px)', // 10px padding on each side
                        height: 'calc(100% - 20px)', // 10px padding top/bottom
                        objectFit: 'contain' // Ensures image fits within the bounds without cropping
                    }}
                />
            ) : (
                // Show "LOADING IMAGE..." if image is not yet preloaded
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-white text-2xl font-bold opacity-50 select-none">
                        LOADING IMAGE...
                    </p>
                </div>
            )}
        </div>
    );
};
CardVisuals.displayName = 'CardVisuals';


// ============================================================================
//  CardTextureRenderer Component (Captures CardVisuals which now contains <img>)
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
                    console.log(`CardTextureRenderer (${displayItem.title}): Preloaded image success: ${src}`);
                    setPreloadedImage(img);
                }
            };
            img.onerror = () => {
                if (isMounted) {
                    console.error(`CardTextureRenderer (${displayItem.title}): Failed to preload image: ${src}.`);
                    if (src !== `${window.location.origin}${FALLBACK_IMAGE_SRC}`) {
                        console.log(`CardTextureRenderer (${displayItem.title}): Attempting fallback image: ${FALLBACK_IMAGE_SRC}`);
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
    // This useEffect now explicitly waits for preloadedImage to be not null
    useEffect(() => {
        if (!tempDivRef.current) {
            tempDivRef.current = document.createElement('div');
            tempDivRef.current.style.position = 'absolute';
            tempDivRef.current.style.left = '-9999px'; // Move off-screen
            tempDivRef.current.style.top = '-9999px';
            tempDivRef.current.style.width = `${outputWidth}px`;
            tempDivRef.current.style.height = `${outputHeight}px`;
            tempDivRef.current.style.backgroundColor = 'transparent'; 
            document.body.appendChild(tempDivRef.current);
            reactRootRef.current = ReactDOM.createRoot(tempDivRef.current);
            console.log(`CardTextureRenderer (${displayItem.title}): Temp div and root created.`);
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
                        preloadedImage={preloadedImage} // Pass the preloaded image directly
                    />
                </React.StrictMode>
            );

            console.log(`CardTextureRenderer (${displayItem.title}): Capturing CardVisuals with html2canvas (IMAGE NOW IN DOM).`);
            reactRootRef.current.render(cardElement);

            // Give React a moment to render and for the image in the DOM to be ready
            // html2canvas works best when the images it needs to capture are fully loaded.
            await new Promise(resolve => setTimeout(resolve, 100)); // Increased delay slightly for image rendering
            
            try {
                const canvas = await html2canvas(tempDivRef.current, {
                    backgroundColor: null, 
                    useCORS: true, 
                    allowTaint: true // May be needed if CORS is an issue despite preloading
                });

                // IMPORTANT: Manual ctx.drawImage() is REMOVED.
                // html2canvas should now capture the <img> tag directly.

                console.log(`CardTextureRenderer (${displayItem.title}): Calling onRendered callback.`);
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

        // Only trigger captureCard if preloadedImage is available (to ensure <img> has src)
        if (preloadedImage) {
            captureCard();
        } else {
            console.log(`CardTextureRenderer (${displayItem.title}): Waiting for image to preload...`);
        }


        // Cleanup function for useEffect
        return () => {
            console.log(`CardTextureRenderer (${displayItem.title}): Cleanup on unmount.`);
            if (reactRootRef.current) {
                reactRootRef.current.unmount();
                reactRootRef.current = null;
            }
            if (tempDivRef.current && tempDivRef.current.parentNode === document.body) {
                document.body.removeChild(tempDivRef.current);
                tempDivRef.current = null;
            }
        };
    }, [displayItem, onRendered, outputWidth, outputHeight, preloadedImage]); // preloadedImage is key dependency

    return null; // This component doesn't render anything directly
};

export default CardTextureRenderer;
