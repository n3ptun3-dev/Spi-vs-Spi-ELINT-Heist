
// src/components/game/tod/EquipmentLockerSection.tsx
// MODIFIED BY GEMINI (v2): This version fixes interaction bugs (two-click drag), improves auto-rotation resume,
// adjusts card styling (padding, fonts, corners), and resolves the THREE.Color console warning.

"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

// --- (Assuming these imports are correct based on your project structure) ---
import { useAppContext, type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext';
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { ITEM_LEVEL_COLORS_CSS_VARS, XP_THRESHOLDS } from '@/lib/constants';
import { SHOP_CATEGORIES as APP_SHOP_CATEGORIES, getItemById as getBaseItemByIdFromGameItems, type SpecificItemData } from '@/lib/game-items';
import { ShoppingCart } from 'lucide-react';

// --- Constants ---
const ITEM_WIDTH = 1.2;
const ITEM_HEIGHT = 1.9;
const CAMERA_BASE_Z_DISTANCE = 5.0; // Increased distance
const MIN_CAMERA_Z = 3.5;
const INITIAL_CAMERA_FOV = 50; // Slightly reduced FOV
const ROTATION_SPEED = 0.0035;
const CLICK_DRAG_THRESHOLD_SQUARED = 10 * 10;
const CLICK_DURATION_THRESHOLD = 250;
const AUTO_ROTATE_RESUME_DELAY = 3000;
const MIN_RADIUS_FOR_TWO_ITEMS = 1.4;
const CARD_SPACING_FACTOR = 1.7; // Increased spacing
const INITIAL_CAROUSEL_TARGET_COUNT = 8;


// --- Type Definitions ---
interface SectionProps {
  parallaxOffset: number;
}

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
//  CARD VISUALS LOGIC
// ============================================================================

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

const CardVisuals: React.FC<{ displayItem: DisplayItem }> = ({ displayItem }) => {
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
    } else { // For stacks: category, itemType, itemLevel
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
                borderColor: itemColorCssVar,
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
                    }} />
                 <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-50" />
            </div>
            <div className="w-full px-1 py-0.5 flex flex-col justify-between flex-grow min-h-0">
                <p className="text-sm font-semibold text-center leading-tight mb-0.5 truncate" style={{ color: itemColorCssVar }}>{title}</p>
                <div className="w-full text-xs space-y-0.5 overflow-y-auto scrollbar-hide flex-grow mt-auto">{detailContent}</div>
            </div>
        </div>
    );
};

// ============================================================================
//  3D CAROUSEL COMPONENTS
// ============================================================================

const CameraManager: React.FC<{ targetZ: number }> = React.memo(({ targetZ }) => {
    const { camera } = useThree();
    useFrame(() => {
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
    });
    return null;
});
CameraManager.displayName = 'CameraManager';

const CarouselItem = React.memo(function CarouselItem({ displayItem, index, totalItems, carouselRadius }: {
    displayItem: DisplayItem; index: number; totalItems: number; carouselRadius: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    
    useLayoutEffect(() => {
        if (meshRef.current) {
            const angle = totalItems > 1 ? (index / totalItems) * Math.PI * 2 : 0;
            const x = carouselRadius * Math.sin(angle);
            const z = carouselRadius * Math.cos(angle);
            meshRef.current.position.set(x, 0, z);
            meshRef.current.userData = { displayItem, isCarouselItem: true, id: displayItem.id };
        }
    }, [index, totalItems, carouselRadius, displayItem]);

    useFrame(({ camera }) => {
        if (meshRef.current) meshRef.current.lookAt(camera.position);
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[ITEM_WIDTH, ITEM_HEIGHT]} />
            <meshBasicMaterial transparent color="black" opacity={0} />
            <Html
                center
                distanceFactor={10}
                style={{ pointerEvents: 'none', width: `${ITEM_WIDTH * 80}px`, height: `${ITEM_HEIGHT * 80}px` }}
            >
                <CardVisuals displayItem={displayItem} />
            </Html>
        </mesh>
    );
});
CarouselItem.displayName = 'CarouselItem';

const EquipmentCarousel: React.FC<{
    itemsToDisplay: DisplayItem[]; onItemClick: (displayItem: DisplayItem) => void;
    carouselRadius: number; autoRotateRef: React.MutableRefObject<boolean>;
}> = React.memo(({ itemsToDisplay, onItemClick, carouselRadius, autoRotateRef }) => {
    const group = useRef<THREE.Group>(null!);
    const { gl, camera, raycaster, invalidate } = useThree();
    const appContext = useAppContext();
    
    const interactionState = useRef({
        isDown: false,
        isDragging: false,
        pointerId: null as number | null,
        downTime: 0,
        downCoords: { x: 0, y: 0 },
        lastRotation: 0,
    }).current;
    
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetAutoRotateTimer = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = setTimeout(() => {
            if (!interactionState.isDown && !appContext.isTODWindowOpen) {
                autoRotateRef.current = true;
            }
        }, AUTO_ROTATE_RESUME_DELAY);
    }, [interactionState, appContext.isTODWindowOpen, autoRotateRef]);

    useEffect(() => {
        const canvasElement = gl.domElement;
        
        const startInteraction = (e: PointerEvent) => {
            if (interactionState.isDown) return;
            interactionState.isDown = true;
            interactionState.pointerId = e.pointerId;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);

            autoRotateRef.current = false;
            if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
            appContext.setIsScrollLockActive(true);

            interactionState.isDragging = false;
            interactionState.downTime = performance.now();
            interactionState.downCoords = { x: e.clientX, y: e.clientY };
            interactionState.lastRotation = group.current.rotation.y;
            canvasElement.style.cursor = 'grabbing';
        };

        const moveInteraction = (e: PointerEvent) => {
            if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) return;
            const deltaX = e.clientX - interactionState.downCoords.x;
            const deltaY = e.clientY - interactionState.downCoords.y;
            if (!interactionState.isDragging && (deltaX ** 2 + deltaY ** 2) > CLICK_DRAG_THRESHOLD_SQUARED) {
                interactionState.isDragging = true;
            }
            if (interactionState.isDragging) {
                const rotationAmount = deltaX * 0.005;
                group.current.rotation.y = interactionState.lastRotation + rotationAmount;
                invalidate();
            }
        };

        const endInteraction = (e: PointerEvent) => {
            if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) return;
            
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            canvasElement.style.cursor = 'grab';
            appContext.setIsScrollLockActive(false);

            const dragDuration = performance.now() - interactionState.downTime;

            if (!interactionState.isDragging && dragDuration < CLICK_DURATION_THRESHOLD) {
                const rect = canvasElement.getBoundingClientRect();
                const pointerVector = new THREE.Vector2(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                );
                raycaster.setFromCamera(pointerVector, camera);
                const intersects = raycaster.intersectObjects(group.current.children, true);
                if (intersects.length > 0) {
                    let obj: THREE.Object3D | null = intersects[0].object;
                    while (obj && !obj.userData?.isCarouselItem) obj = obj.parent;
                    if (obj?.userData?.isCarouselItem) {
                        onItemClick(obj.userData.displayItem);
                    }
                }
            }
            interactionState.isDown = false;
            interactionState.isDragging = false;
            interactionState.pointerId = null;
            resetAutoRotateTimer();
        };

        const leaveInteraction = () => {
            if (!interactionState.isDown) resetAutoRotateTimer();
        };
        
        canvasElement.addEventListener('pointerdown', startInteraction);
        canvasElement.addEventListener('pointermove', moveInteraction);
        canvasElement.addEventListener('pointerup', endInteraction);
        canvasElement.addEventListener('pointerleave', leaveInteraction);

        return () => {
            canvasElement.removeEventListener('pointerdown', startInteraction);
            canvasElement.removeEventListener('pointermove', moveInteraction);
            canvasElement.removeEventListener('pointerup', endInteraction);
            canvasElement.removeEventListener('pointerleave', leaveInteraction);
            if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        };
    }, [gl, onItemClick, camera, raycaster, invalidate, appContext, autoRotateRef, interactionState, resetAutoRotateTimer]);
    
    useFrame((state, delta) => {
        if (group.current && autoRotateRef.current && itemsToDisplay.length > 1) {
            group.current.rotation.y += ROTATION_SPEED * delta * 60;
        }
    });

    return (
        <group ref={group}>
            {itemsToDisplay.map((item, index) => (
                <CarouselItem key={item.id} displayItem={item} index={index} totalItems={itemsToDisplay.length} carouselRadius={carouselRadius} />
            ))}
        </group>
    );
});
EquipmentCarousel.displayName = 'EquipmentCarousel';

const Resizer = React.memo(() => {
    const { camera, gl } = useThree();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        containerRef.current = document.getElementById('locker-carousel-canvas-container') as HTMLDivElement;
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = container.getBoundingClientRect();
            if (width > 0 && height > 0) {
                gl.setSize(width, height);
                if (camera instanceof THREE.PerspectiveCamera) camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        });
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [camera, gl]);
    
    return null;
});
Resizer.displayName = 'Resizer';

// ============================================================================
//  MAIN SECTION COMPONENT
// ============================================================================

export const EquipmentLockerSection: React.FC<SectionProps> = ({ parallaxOffset }) => {
    const appContext = useAppContext();
    const { openTODWindow, closeTODWindow, playerInventory, getItemById, openSpyShop, isTODWindowOpen } = appContext;
    const { theme: currentGlobalTheme, themeVersion } = useTheme();
    
    const [expandedStackPath, setExpandedStackPath] = useState<string[]>([]);
    const [pointLightColor, setPointLightColor] = useState<THREE.ColorRepresentation>('hsl(0, 0%, 100%)');
    
    const autoRotateRef = useRef(true);
    const todOpenedByLockerRef = useRef(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Auto-rotation timer logic
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const resetAutoRotateTimer = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = setTimeout(() => {
            if (!isTODWindowOpen) {
                autoRotateRef.current = true;
            }
        }, AUTO_ROTATE_RESUME_DELAY);
    }, [isTODWindowOpen]);

    // Monitor TOD window state for rotation
    useEffect(() => {
        if (!isTODWindowOpen && todOpenedByLockerRef.current) {
            resetAutoRotateTimer();
            todOpenedByLockerRef.current = false;
        }
    }, [isTODWindowOpen, resetAutoRotateTimer]);
    
    const aggregatePlayerItems = useMemo(() => {
        const inventoryArray = Object.entries(playerInventory)
            .map(([_, val]) => ({ invDetails: val, baseDef: getBaseItemByIdFromGameItems(val.id) }))
            .filter(item => item.baseDef && item.invDetails.quantity > 0) as Array<{ invDetails: PlayerInventoryItem; baseDef: GameItemBase }>;

        const createIndividualDisplayItem = (invItemDetails: PlayerInventoryItem, baseDef: GameItemBase, path: string[], instanceIndex: number): DisplayItem => ({
            id: `${invItemDetails.id}_instance_${instanceIndex}_${path.join('_')}`, baseItem: baseDef, title: baseDef.title || baseDef.name,
            quantityInStack: 1, imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || '/Spi vs Spi icon.png', colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || 'var(--level-1-color)',
            levelForVisuals: baseDef.level, stackType: 'individual', path, dataAiHint: baseDef.dataAiHint, instanceCurrentStrength: invItemDetails.currentStrength,
            instanceMaxStrength: baseDef.strength?.max, instanceCurrentCharges: invItemDetails.currentCharges, instanceMaxCharges: baseDef.maxCharges,
            instanceCurrentUses: invItemDetails.currentUses, instanceMaxUses: baseDef.maxUses, instanceCurrentAlerts: invItemDetails.currentAlerts,
            instanceMaxAlerts: baseDef.maxAlerts,
        });

        const createAggregatedStack = (items: Array<{ invDetails: PlayerInventoryItem; baseDef: GameItemBase }>, stackIdPrefix: string, stackTitle: string, stackType: 'category' | 'itemType' | 'itemLevel', path: string[]): DisplayItem | null => {
            if (items.length === 0) return null; let highestLevelItem = items[0].baseDef; let totalQuantity = 0;
            let aggCurrentStrength = 0, aggMaxStrength = 0, aggCurrentCharges = 0, aggMaxCharges = 0;
            items.forEach(({ invDetails, baseDef }) => {
                totalQuantity += invDetails.quantity; if (baseDef.level > highestLevelItem.level) highestLevelItem = baseDef;
                if(baseDef.strength?.max) {
                  aggCurrentStrength += (invDetails.currentStrength ?? 0) * invDetails.quantity; aggMaxStrength += (baseDef.strength.max) * invDetails.quantity;
                }
                if(baseDef.maxCharges) {
                  aggCurrentCharges += (invDetails.currentCharges ?? 0) * invDetails.quantity; aggMaxCharges += (baseDef.maxCharges) * invDetails.quantity;
                }
            });
            const uniqueIdPart = path.join('_') || stackTitle.replace(/\s+/g, '_');
            return {
                id: `${stackIdPrefix}_${uniqueIdPart}`, baseItem: null, title: stackTitle, quantityInStack: totalQuantity, imageSrc: highestLevelItem.tileImageSrc || highestLevelItem.imageSrc || '/Spi vs Spi icon.png',
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItem.level] || 'var(--level-1-color)', levelForVisuals: highestLevelItem.level, aggregateCurrentStrength: aggCurrentStrength,
                aggregateMaxStrength: aggMaxStrength, aggregateCurrentCharges: aggCurrentCharges, aggregateMaxCharges: aggMaxCharges, stackType, path, dataAiHint: highestLevelItem.dataAiHint || stackTitle.toLowerCase(),
            };
        };

        let itemsToDisplay: DisplayItem[] = [];
        const currentPathLevel = expandedStackPath.length;

        if (currentPathLevel === 0) {
            const totalPhysicalItems = inventoryArray.reduce((sum, item) => sum + item.invDetails.quantity, 0);
            if (totalPhysicalItems > 0 && totalPhysicalItems <= INITIAL_CAROUSEL_TARGET_COUNT) {
                 const itemStacks = inventoryArray.reduce((acc, item) => { (acc[item.invDetails.id] = acc[item.invDetails.id] || []).push(item); return acc; }, {} as Record<string, typeof inventoryArray>);
                 itemsToDisplay = Object.values(itemStacks).map(itemsOfSameId => {
                     const first = itemsOfSameId[0];
                     if (first.invDetails.quantity > 1) return createAggregatedStack(itemsOfSameId, 'itemLevel', first.baseDef.title || first.baseDef.name, 'itemLevel', [first.baseDef.category, first.baseDef.name, first.invDetails.id])!;
                     return createIndividualDisplayItem(first.invDetails, first.baseDef, [first.baseDef.category, first.baseDef.name, first.invDetails.id], 0);
                 }).sort((a,b) => a.title.localeCompare(b.title));
            } else if (inventoryArray.length > 0) {
                 itemsToDisplay = APP_SHOP_CATEGORIES.map(catInfo => createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name as ItemCategory]))
                    .filter((item): item is DisplayItem => item !== null).sort((a,b) => a.title.localeCompare(b.title));
            }
        } else {
             const deepestClickedStack = expandedStackPath.slice(-1)[0];
             const parentPath = expandedStackPath.slice(0, -1);
             // Logic for additive expansion
             const tempItems = new Set<DisplayItem>();
             let itemsFromExpandedStack: DisplayItem[] = [];
             
             // Get items from the stack that was just clicked
             if (currentPathLevel === 1) { // Expanding a category
                const categoryToExpand = expandedStackPath[0] as ItemCategory;
                const itemsInExpandedCategory = inventoryArray.filter(i => i.baseDef.category === categoryToExpand);
                const groupedByBaseName = itemsInExpandedCategory.reduce((acc, i) => { (acc[i.baseDef.name] = acc[i.baseDef.name] || []).push(i); return acc; }, {} as Record<string, typeof inventoryArray>);
                Object.entries(groupedByBaseName).forEach(([baseName, items]) => { const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [...expandedStackPath, baseName]); if (stack) itemsFromExpandedStack.push(stack); });
             } else if (currentPathLevel === 2) { // Expanding an item type
                const [category, baseName] = expandedStackPath;
                const itemsOfExpandedType = inventoryArray.filter(i => i.baseDef.category === category && i.baseDef.name === baseName);
                itemsOfExpandedType.forEach(i => { if (i.invDetails.quantity > 1) { const stack = createAggregatedStack([i], 'itemLevel', i.baseDef.title || i.baseDef.name, 'itemLevel', [...expandedStackPath, i.invDetails.id]); if (stack) itemsFromExpandedStack.push(stack); } else { itemsFromExpandedStack.push(createIndividualDisplayItem(i.invDetails, i.baseDef, [...expandedStackPath, i.invDetails.id], 0)); } });
             } else if (currentPathLevel === 3) { // Expanding an item level stack
                const itemToExpandDetails = inventoryArray.find(i => i.invDetails.id === expandedStackPath[2]);
                if (itemToExpandDetails) { for (let i = 0; i < itemToExpandDetails.invDetails.quantity; i++) itemsFromExpandedStack.push(createIndividualDisplayItem(itemToExpandDetails.invDetails, itemToExpandDetails.baseDef, [...expandedStackPath], i)); }
             }
             itemsFromExpandedStack.forEach(item => tempItems.add(item));
             
             // Get other items at the same level
             if(currentPathLevel === 1) { // We expanded a category, so other categories should still be there
                APP_SHOP_CATEGORIES.forEach(catInfo => {
                    if (catInfo.name !== expandedStackPath[0]) {
                        const stack = createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name as ItemCategory]);
                        if (stack) tempItems.add(stack);
                    }
                });
             } else if(currentPathLevel === 2) { // We expanded an item type, so other item types in the same category should be there
                 const [category] = expandedStackPath;
                 const itemsInParentCategory = inventoryArray.filter(i => i.baseDef.category === category);
                 const groupedByBaseName = itemsInParentCategory.reduce((acc, i) => { (acc[i.baseDef.name] = acc[i.baseDef.name] || []).push(i); return acc; }, {} as Record<string, typeof inventoryArray>);
                 Object.entries(groupedByBaseName).forEach(([baseName, items]) => { 
                    if(baseName !== expandedStackPath[1]) {
                        const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [category, baseName]); 
                        if (stack) tempItems.add(stack);
                    }
                 });
             }
             // No "other items" logic for level 3, as it expands to individuals which is the final level.

             itemsToDisplay = Array.from(tempItems).sort((a,b) => a.title.localeCompare(b.title));
        }
        return itemsToDisplay;
    }, [playerInventory, getItemById, expandedStackPath]);

    const handleCarouselItemClick = useCallback((clickedItem: DisplayItem) => {
        autoRotateRef.current = false;
        if(autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);

        if (clickedItem.stackType === 'individual') {
            todOpenedByLockerRef.current = true;
            openTODWindow(
                clickedItem.baseItem?.title || "Item Details",
                <div className="font-rajdhani p-4 text-center">
                    <h3 className="text-xl font-bold mb-2" style={{ color: clickedItem.colorVar }}>{clickedItem.title}</h3>
                    <HolographicButton onClick={closeTODWindow} className="mt-4" explicitTheme={currentGlobalTheme}>Close</HolographicButton>
                </div>,
                { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
            );
        } else {
            setExpandedStackPath(clickedItem.path);
            resetAutoRotateTimer();
        }
    }, [openTODWindow, closeTODWindow, currentGlobalTheme, themeVersion, resetAutoRotateTimer]);
    
    // Effect to handle color change of point light based on theme
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hslVarName = (currentGlobalTheme === 'cyphers' || currentGlobalTheme === 'shadows') ? '--primary-hsl' : '--accent-hsl';
            const hslString = getComputedStyle(document.documentElement).getPropertyValue(hslVarName).trim();
            if(hslString) {
                const parts = hslString.split(" ");
                if (parts.length === 3) {
                    const formattedHsl = `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
                    setPointLightColor(formattedHsl);
                }
            }
        }
    }, [currentGlobalTheme, themeVersion]);

    const dynamicCarouselRadius = useMemo(() => {
        const numItems = aggregatePlayerItems.length;
        if (numItems <= 1) return 0;
        if (numItems === 2) return MIN_RADIUS_FOR_TWO_ITEMS;
        const circumference = numItems * (ITEM_WIDTH * CARD_SPACING_FACTOR);
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, circumference / (2 * Math.PI));
    }, [aggregatePlayerItems.length]);
    
    const dynamicCameraZ = Math.max(MIN_CAMERA_Z, dynamicCarouselRadius + CAMERA_BASE_Z_DISTANCE);

    // Reset carousel on scroll out of view
    useEffect(() => {
        const currentSectionRef = sectionRef.current;
        if (!currentSectionRef) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                autoRotateRef.current = entry.isIntersecting;
                if (!entry.isIntersecting) {
                    setExpandedStackPath([]);
                }
            }, { threshold: 0.1 }
        );
        observer.observe(currentSectionRef);
        return () => { if(currentSectionRef) observer.unobserve(currentSectionRef); };
    }, []);

    const handleBackClick = () => {
        setExpandedStackPath(prev => prev.slice(0, -1));
    };

    return (
        <div ref={sectionRef} className="flex flex-col items-center justify-center h-full w-full p-4 md:p-6">
            <HolographicPanel
                className="w-full h-full flex flex-col items-center px-0 py-2 md:py-4 overflow-hidden"
                explicitTheme={currentGlobalTheme} >
                <div className="flex-shrink-0 w-full flex items-center justify-between px-4 my-2 md:my-3">
                    {expandedStackPath.length > 0 ? (
                        <HolographicButton onClick={handleBackClick} className="!p-2" explicitTheme={currentGlobalTheme}>Back</HolographicButton>
                    ) : (
                        <div className="w-16 h-9"></div> 
                    )}
                    <h2 className="text-xl md:text-2xl font-orbitron holographic-text text-center flex-grow whitespace-nowrap overflow-hidden text-ellipsis px-2">
                        Equipment Locker
                    </h2>
                    <HolographicButton onClick={openSpyShop} className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}>
                        <ShoppingCart className="w-5 h-5 icon-glow" />
                    </HolographicButton>
                </div>
                <div
                    id="locker-carousel-canvas-container"
                    className="w-full flex-grow min-h-0 relative"
                    style={{ cursor: 'grab', touchAction: 'none' }} >
                    {aggregatePlayerItems.length > 0 ? (
                        <Canvas
                            id="locker-carousel-canvas" camera={{ position: [0, 0.5, dynamicCameraZ], fov: INITIAL_CAMERA_FOV }}
                            shadows gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}
                            onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }} >
                            <ambientLight intensity={1.2} />
                            <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
                            <pointLight position={[-5, 5, 15]} intensity={1.5} color={pointLightColor} />
                            <pointLight position={[0, -10, 0]} intensity={0.3} />
                            <CameraManager targetZ={dynamicCameraZ} />
                            <EquipmentCarousel itemsToDisplay={aggregatePlayerItems} onItemClick={handleCarouselItemClick} carouselRadius={dynamicCarouselRadius} autoRotateRef={autoRotateRef} />
                            <Resizer />
                        </Canvas>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <p className="holographic-text text-lg">Locker Empty</p>
                            <p className="text-muted-foreground text-sm">Visit the Spy Shop or Check In with HQ.</p>
                        </div>
                    )}
                </div>
                 <p className="text-center text-xs text-muted-foreground mt-2 flex-shrink-0 px-2">
                    {aggregatePlayerItems.length > 0 ? "Drag to rotate. Click stack to expand or item for details." : ""}
                </p>
            </HolographicPanel>
        </div>
    );
};
