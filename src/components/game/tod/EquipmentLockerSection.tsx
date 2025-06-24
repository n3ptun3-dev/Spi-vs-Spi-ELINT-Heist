// src/components/game/tod/EquipmentLockerSection.tsx
// MODIFIED BY GEMINI (v33): Refactored to import CardTextureRenderer (and indirectly CardVisuals)
//                           from the external CardTextureRenderer.tsx file for modularity.
//                           Adjusted handleCarouselItemClick to prevent TOD window flashing
//                           by only calling closeTODWindow when expanding a stack.

"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Imports from shared components and contexts ---
import { useAppContext, type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext';
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext'; 
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';
import { SHOP_CATEGORIES as APP_SHOP_CATEGORIES, getItemById as getBaseItemByIdFromGameItems } from '@/lib/game-items';
import { ShoppingCart } from 'lucide-react'; 

// --- Import the consolidated CardTextureRenderer and DisplayItem from its dedicated file ---
import CardTextureRenderer, { type DisplayItem, FALLBACK_IMAGE_SRC } from './CardTextureRenderer'; // Import DisplayItem and FALLBACK_IMAGE_SRC

// --- Constants ---
const ITEM_WIDTH = 0.9;
const ITEM_HEIGHT = 1.3;
const CAMERA_BASE_Z_DISTANCE = 2;
const INITIAL_CAMERA_FOV = 55;
const ROTATION_SPEED = 0.0035;
const CLICK_DRAG_THRESHOLD_SQUARED = 10 * 10; // Threshold for pixel movement to be considered a drag (10px * 10px)
const CLICK_DURATION_THRESHOLD = 250; // Max duration for a touch/click to be considered a click (ms)
const AUTO_ROTATE_RESUME_DELAY = 3000; // Delay before auto-rotate resumes after user interaction
const MIN_RADIUS_FOR_TWO_ITEMS = 0.5;
const CARD_SPACING_FACTOR = 1.7;
const INITIAL_CAROUSEL_TARGET_COUNT = 8;
// FALLBACK_IMAGE_SRC is now imported from CardTextureRenderer.tsx

// --- Type Definitions (DisplayItem is now imported) ---
interface SectionProps {
  parallaxOffset: number;
}

// ============================================================================
//  3D CAROUSEL COMPONENTS
// ============================================================================

const CameraManager: React.FC<{ carouselRadius: number }> = React.memo(({ carouselRadius }) => {
    const { camera } = useThree();
    useFrame(() => {
        const targetZ = carouselRadius + CAMERA_BASE_Z_DISTANCE;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);
    });
    return null;
});
CameraManager.displayName = 'CameraManager';

const CarouselItem = React.memo(function CarouselItem({ displayItem, index, totalItems, carouselRadius }: {
    displayItem: DisplayItem; index: number; totalItems: number; carouselRadius: number;
}) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

    const handleCanvasRendered = useCallback((canvas: HTMLCanvasElement) => {
        console.log(`CarouselItem (${displayItem.title}): Texture rendered callback received.`);
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.needsUpdate = true;
        setTexture(oldTexture => { 
            oldTexture?.dispose(); // Dispose old texture to prevent memory leaks
            return newTexture; 
        });
    }, [displayItem.title]);

    useEffect(() => () => { 
        console.log(`CarouselItem (${displayItem.title}): Disposing texture on unmount.`);
        texture?.dispose(); 
    }, [texture, displayItem.title]);
    
    useLayoutEffect(() => {
        if (meshRef.current) {
            const angle = totalItems > 1 ? (index / totalItems) * Math.PI * 2 : 0;
            const x = carouselRadius * Math.sin(angle);
            const z = carouselRadius * Math.cos(angle);
            meshRef.current.position.set(x, 0, z);
            meshRef.current.userData = { displayItem, isCarouselItem: true, id: displayItem.id };
            console.log(`CarouselItem (${displayItem.title}): Position set and userData updated.`);
        }
    }, [index, totalItems, carouselRadius, displayItem]);

    useFrame(({ camera }) => {
        if (meshRef.current) meshRef.current.lookAt(camera.position);
    });

    return (
        <>
            {/* CardTextureRenderer is now imported from external file */}
            <CardTextureRenderer displayItem={displayItem} onRendered={handleCanvasRendered} outputWidth={256} outputHeight={427} />
            <mesh ref={meshRef} userData={{ displayItem, isCarouselItem: true, id: displayItem.id }}>
                <planeGeometry args={[ITEM_WIDTH, ITEM_HEIGHT]} />
                <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} />
            </mesh>
        </>
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
        autoRotateTimeout: null as NodeJS.Timeout | null,
    }).current;
    
    // Cleanup timeout on unmount
    useEffect(() => () => {
        if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
    }, [interactionState]);
    
    // Event handling for drag-to-rotate and click
    useEffect(() => {
        const canvasElement = gl.domElement;
        
        const startInteraction = (e: PointerEvent) => {
            console.log('startInteraction: Fired', { pointerId: e.pointerId, isDown: interactionState.isDown });
            if (interactionState.isDown) return; // Already interacting
            interactionState.isDown = true;
            interactionState.pointerId = e.pointerId;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);

            autoRotateRef.current = false;
            if (interactionState.autoRotateTimeout) {
                clearTimeout(interactionState.autoRotateTimeout);
                interactionState.autoRotateTimeout = null;
            }
            appContext.setIsScrollLockActive(true);

            interactionState.isDragging = false; // Reset dragging state on new interaction start
            interactionState.downTime = performance.now();
            interactionState.downCoords = { x: e.clientX, y: e.clientY };
            interactionState.lastRotation = group.current.rotation.y;
            canvasElement.style.cursor = 'grabbing';
            console.log('startInteraction: State set to', { ...interactionState });
        };

        const moveInteraction = (e: PointerEvent) => {
            if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) return;

            const deltaX = e.clientX - interactionState.downCoords.x;
            const deltaY = e.clientY - interactionState.downCoords.y;
            
            // Check if it's a drag
            if (!interactionState.isDragging && (deltaX ** 2 + deltaY ** 2) > CLICK_DRAG_THRESHOLD_SQUARED) {
                interactionState.isDragging = true;
                console.log('moveInteraction: Detected as drag start. isDragging now:', interactionState.isDragging);
            }

            if (interactionState.isDragging) {
                const rotationAmount = deltaX * 0.005;
                group.current.rotation.y = interactionState.lastRotation + rotationAmount;
                invalidate();
            }
        };

        const endInteraction = (e: PointerEvent) => {
            const finalIsDraggingStateAtEnd = interactionState.isDragging; // Capture current state of isDragging
            console.log('endInteraction: Fired', { pointerId: e.pointerId, initialIsDown: interactionState.isDown, initialIsDragging: interactionState.isDragging, capturedIsDragging: finalIsDraggingStateAtEnd });

            if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) {
                console.log('endInteraction: Mismatch or not down, trying to clean up.');
                try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                canvasElement.style.cursor = 'grab';
                appContext.setIsScrollLockActive(false);
                // Ensure state is truly reset even on early exit
                interactionState.isDown = false;
                interactionState.isDragging = false;
                interactionState.pointerId = null;
                return; 
            }

            // Always release capture
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            canvasElement.style.cursor = 'grab';
            appContext.setIsScrollLockActive(false); // Ensure scroll lock is released

            const dragDuration = performance.now() - interactionState.downTime;
            
            console.log('endInteraction: Before outcome logic:', { finalIsDraggingStateAtEnd, dragDuration, CLICK_DURATION_THRESHOLD });

            if (finalIsDraggingStateAtEnd) { // This means moveInteraction set it to true
                console.log('endInteraction: Handling as a drag.');
                // For a drag, resume auto-rotate after a delay
                if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
                interactionState.autoRotateTimeout = setTimeout(() => {
                    autoRotateRef.current = true;
                    console.log('endInteraction: Auto-rotate resumed after drag timeout.');
                }, AUTO_ROTATE_RESUME_DELAY);
            } else if (dragDuration < CLICK_DURATION_THRESHOLD) { // Not a drag, and short duration = click
                console.log('endInteraction: Handling as a click.');
                const rect = canvasElement.getBoundingClientRect();
                const pointerVector = new THREE.Vector2(
                    ((e.clientX - rect.left) / rect.width) * 2 - 1,
                    -((e.clientY - rect.top) / rect.height) * 2 + 1
                );
                raycaster.setFromCamera(pointerVector, camera);
                const intersects = raycaster.intersectObjects(group.current.children, true);
                let clickedItem = false;
                if (intersects.length > 0) {
                    let obj: THREE.Object3D | null = intersects[0].object;
                    while (obj && !obj.userData?.isCarouselItem) obj = obj.parent;
                    if (obj?.userData?.isCarouselItem) {
                        onItemClick(obj.userData.displayItem);
                        clickedItem = true;
                        console.log('endInteraction: Clicked a carousel item. Item ID:', obj.userData.id);
                    }
                }
                // For a click, resume auto-rotate immediately.
                if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
                autoRotateRef.current = true; 
                console.log('endInteraction: Auto-rotate resumed immediately after click.');
            } else {
                 // Fallback: This path should ideally not be hit if thresholds are good
                 // It means not a drag, but also not a quick enough click (e.g., long press without drag)
                 console.log('endInteraction: Fallback: long press/tap without drag. Resuming auto-rotate immediately.');
                 if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
                 autoRotateRef.current = true; // Resume auto-rotate immediately
            }

            // Always reset core interaction state vars
            interactionState.isDown = false;
            interactionState.isDragging = false;
            interactionState.pointerId = null;
            console.log('endInteraction: State reset complete.', { finalInteractionState: { ...interactionState } });
        };

        const resumeAutoRotate = () => {
            console.log('resumeAutoRotate: Fired. Is down?', interactionState.isDown);
            if (interactionState.isDown) return; // Don't resume if still interacting
            if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
            interactionState.autoRotateTimeout = setTimeout(() => {
                autoRotateRef.current = true;
                console.log('resumeAutoRotate: Auto-rotate re-enabled via timeout.');
            }, AUTO_ROTATE_RESUME_DELAY);
        };
        
        canvasElement.addEventListener('pointerdown', startInteraction);
        canvasElement.addEventListener('pointermove', moveInteraction);
        canvasElement.addEventListener('pointerup', endInteraction);
        canvasElement.addEventListener('pointercancel', endInteraction); // Add pointercancel for robustness
        canvasElement.addEventListener('pointerleave', resumeAutoRotate);

        return () => {
            canvasElement.removeEventListener('pointerdown', startInteraction);
            canvasElement.removeEventListener('pointermove', moveInteraction);
            canvasElement.removeEventListener('pointerup', endInteraction);
            canvasElement.removeEventListener('pointercancel', endInteraction);
            canvasElement.removeEventListener('pointerleave', resumeAutoRotate);
            if (interactionState.autoRotateTimeout) clearTimeout(interactionState.autoRotateTimeout);
        };
    }, [gl, onItemClick, camera, raycaster, invalidate, appContext, autoRotateRef, interactionState]);
    
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
    useEffect(() => {
        const container = document.getElementById('locker-carousel-canvas-container');
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
    const { openTODWindow, closeTODWindow, playerInventory, getItemById, openSpyShop } = useAppContext();
    const { theme: currentGlobalTheme, themeVersion } = useTheme();
    const [carouselDisplayItems, setCarouselDisplayItems] = useState<DisplayItem[]>([]);
    const [initialItems, setInitialItems] = useState<DisplayItem[]>([]);
    const [pointLightColor, setPointLightColor] = useState<THREE.ColorRepresentation>('hsl(0, 0%, 100%)');
    const autoRotateRef = useRef(true);
    const sectionRef = useRef<HTMLDivElement>(null);

    const { generateChildrenForItem, generateInitialView } = useMemo(() => {
        const inventoryArray = Object.entries(playerInventory)
            .map(([_, val]) => ({ invDetails: val, baseDef: getItemById(val.id) }))
            .filter(item => item.baseDef && item.invDetails.quantity > 0) as Array<{
              baseItem: any; invDetails: PlayerInventoryItem; baseDef: GameItemBase 
}>;

        const createIndividualDisplayItem = (invItemDetails: PlayerInventoryItem, baseDef: GameItemBase, path: string[], instanceIndex: number): DisplayItem => ({
            id: `${invItemDetails.id}_instance_${instanceIndex}_${path.join('_')}`, 
            baseItem: baseDef, 
            title: baseDef.title || baseDef.name,
            quantityInStack: 1, 
            imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || FALLBACK_IMAGE_SRC, // Use FALLBACK_IMAGE_SRC
            colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || 'var(--level-1-color)',
            levelForVisuals: baseDef.level, 
            stackType: 'individual', 
            path, 
            dataAiHint: baseDef.dataAiHint, 
            instanceCurrentStrength: invItemDetails.currentStrength,
            instanceMaxStrength: baseDef.strength?.max, 
            instanceCurrentCharges: (invItemDetails as any).currentCharges, 
            instanceMaxCharges: (baseDef as any).maxCharges,
            instanceCurrentUses: (invItemDetails as any).currentUses, 
            instanceMaxUses: (baseDef as any).maxUses, 
            instanceCurrentAlerts: (invItemDetails as any).currentAlerts,
            instanceMaxAlerts: (baseDef as any).maxAlerts,
        });

        const createAggregatedStack = (items: Array<{ invDetails: PlayerInventoryItem; baseDef: GameItemBase }>, stackIdPrefix: string, stackTitle: string, stackType: 'category' | 'itemType' | 'itemLevel', path: string[]): DisplayItem | null => {
            if (items.length === 0) return null; 
            
            let highestLevelItem = items[0].baseDef; 
            let totalQuantity = 0;
            let aggCurrentStrength = 0, aggMaxStrength = 0, aggCurrentCharges = 0, aggMaxCharges = 0;
            
            items.forEach(({ invDetails, baseDef }) => { 
                totalQuantity += invDetails.quantity; 
                // Find the highest level item for the stack image
                if (baseDef.level > highestLevelItem.level) {
                    highestLevelItem = baseDef;
                }
                
                aggCurrentStrength += (invDetails.currentStrength ?? 0) * invDetails.quantity; 
                aggMaxStrength += (baseDef.strength?.max ?? 100) * invDetails.quantity;
                aggCurrentCharges += ((invDetails as any).currentCharges ?? 0) * invDetails.quantity; 
                aggMaxCharges += ((baseDef as any).maxCharges ?? 100) * invDetails.quantity;
            });

            const uniqueIdPart = path.join('_') || stackTitle.replace(/\s+/g, '_');
            return {
                id: `${stackIdPrefix}_${uniqueIdPart}`, 
                baseItem: null, // Base item is null for aggregated stacks
                title: stackTitle, 
                quantityInStack: totalQuantity, 
                // Use the image of the highest level item found in the stack
                imageSrc: highestLevelItem.tileImageSrc || highestLevelItem.imageSrc || FALLBACK_IMAGE_SRC, 
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItem.level] || 'var(--level-1-color)', 
                levelForVisuals: highestLevelItem.level, 
                aggregateCurrentStrength: aggCurrentStrength,
                aggregateMaxStrength: aggMaxStrength, 
                aggregateCurrentCharges: aggCurrentCharges, 
                aggregateMaxCharges: aggMaxCharges, // Corrected: Should be aggMaxCharges here
                stackType, 
                path, 
                dataAiHint: highestLevelItem.dataAiHint || stackTitle.toLowerCase(),
            };
        };

        const generateChildrenForItem = (item: DisplayItem): DisplayItem[] => {
            console.log('generateChildrenForItem: called for item:', item.id, 'with stackType:', item.stackType, 'and path:', item.path);
            const { stackType, path } = item; 
            let children: DisplayItem[] = [];
            
            if (stackType === 'category') {
                const categoryToExpand = path[0] as ItemCategory;
                console.log('generateChildrenForItem: Expanding category:', categoryToExpand);
                const itemsInExpandedCategory = inventoryArray.filter(i => i.baseDef.category === categoryToExpand);
                console.log('generateChildrenForItem: Items in category:', itemsInExpandedCategory.map(i => i.baseDef.name));

                const groupedByBaseName = itemsInExpandedCategory.reduce((acc, i) => { 
                    (acc[i.baseDef.name] = acc[i.baseDef.name] || []).push(i); 
                    return acc; 
                }, {} as Record<string, typeof inventoryArray>);
                
                Object.entries(groupedByBaseName).forEach(([baseName, items]) => { 
                    const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [...path, baseName]); 
                    if (stack) children.push(stack); 
                });
            } else if (stackType === 'itemType') {
                const [category, baseName] = path; 
                console.log('generateChildrenForItem: Expanding itemType:', baseName, 'in category:', category);
                const itemsOfExpandedType = inventoryArray.filter(i => i.baseDef.category === category && i.baseDef.name === baseName);
                console.log('generateChildrenForItem: Items of expanded type:', itemsOfExpandedType.map(i => `${i.baseDef.name} (Inv ID: ${i.invDetails.id})`));

                // Group items of the same base type by their specific inventory item ID (which implies level/instance)
                const groupedByInvId = itemsOfExpandedType.reduce((acc, i) => {
                    (acc[i.invDetails.id] = acc[i.invDetails.id] || []).push(i);
                    return acc;
                }, {} as Record<string, typeof inventoryArray>);

                Object.entries(groupedByInvId).forEach(([invId, items]) => {
                    const firstItemInStack = items[0]; // All items in this group have the same invDetails.id
                    console.log(`generateChildrenForItem: Processing invId: ${invId}, quantity: ${firstItemInStack.invDetails.quantity}`);
                    if (firstItemInStack.invDetails.quantity > 1) {
                        // If there's more than one of the exact same item instance, stack them by itemLevel
                        const stack = createAggregatedStack(items, 'itemLevel', firstItemInStack.baseDef.title || firstItemInStack.baseItem?.name || firstItemInStack.baseDef.name, 'itemLevel', [...path, invId]);
                        if (stack) children.push(stack);
                    } else {
                        // If quantity is 1, treat it as an individual item
                        children.push(createIndividualDisplayItem(firstItemInStack.invDetails, firstItemInStack.baseDef, [...path, invId], 0));
                    }
                });
            } else if (stackType === 'itemLevel') {
                const invIdToExpand = path[path.length - 1];
                console.log('generateChildrenForItem: Expanding itemLevel for invId:', invIdToExpand);
                const itemToExpandDetails = inventoryArray.find(i => i.invDetails.id === invIdToExpand);
                if (itemToExpandDetails) { 
                    console.log('generateChildrenForItem: Found item details for invId:', itemToExpandDetails.baseDef.name, 'Quantity:', itemToExpandDetails.invDetails.quantity);
                    for (let i = 0; i < itemToExpandDetails.invDetails.quantity; i++) {
                        children.push(createIndividualDisplayItem(itemToExpandDetails.invDetails, itemToExpandDetails.baseDef, [...path], i)); 
                    }
                } else {
                    console.warn('generateChildrenForItem: Could not find item details for invId:', invIdToExpand);
                }
            }
            console.log('generateChildrenForItem: Returning children:', children.map(c => ({ id: c.id, title: c.title, stackType: c.stackType })));
            return children.sort((a,b) => a.title.localeCompare(b.title));
        };
        
        const generateInitialView = (): DisplayItem[] => {
            const totalItems = inventoryArray.reduce((sum, item) => sum + item.invDetails.quantity, 0);
            if (totalItems > 0 && totalItems <= INITIAL_CAROUSEL_TARGET_COUNT) {
                 // Changed logic for initial view with few items:
                 // Aggregate by invDetails.id first (which uniquely identifies an item type at a specific level/state)
                 const itemStacks = inventoryArray.reduce((acc, item) => { 
                     (acc[item.invDetails.id] = acc[item.invDetails.id] || []).push(item); 
                     return acc; 
                 }, {} as Record<string, typeof inventoryArray>);

                 return Object.values(itemStacks).map(itemsOfSameId => {
                     const first = itemsOfSameId[0];
                     if (first.invDetails.quantity > 1) {
                         // If there's more than one of the exact same item instance, stack them by itemLevel
                         return createAggregatedStack(itemsOfSameId, 'itemLevel', first.baseDef.title || first.baseDef.name, 'itemLevel', [first.baseDef.category, first.baseDef.name, first.invDetails.id])!;
                     }
                     // Otherwise, display as individual
                     return createIndividualDisplayItem(first.invDetails, first.baseDef, [first.baseDef.category, first.baseDef.name, first.invDetails.id], 0);
                 }).sort((a,b) => a.title.localeCompare(b.title));
            } else if (inventoryArray.length > 0) {
                 // For many items, start with categories
                 return APP_SHOP_CATEGORIES.map(catInfo => createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name as ItemCategory]))
                    .filter((item): item is DisplayItem => item !== null).sort((a,b) => a.title.localeCompare(b.title));
            }
            return [];
        };

        return { generateChildrenForItem, generateInitialView };
    }, [playerInventory, getItemById]);
    
    useEffect(() => {
        const items = generateInitialView();
        console.log('useEffect (generateInitialView): Setting initial carousel display items:', items.map(i => i.id));
        setCarouselDisplayItems(items);
        setInitialItems(items);
    }, [generateInitialView]);

    useEffect(() => {
        const currentSectionRef = sectionRef.current;
        if (!currentSectionRef) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                autoRotateRef.current = entry.isIntersecting; // Stop when not visible, start when visible
                if (!entry.isIntersecting && carouselDisplayItems.length !== initialItems.length) {
                    console.log('Observer: Section not intersecting and carousel expanded. Resetting to initial view.');
                    setCarouselDisplayItems(initialItems); // Reset view
                }
            }, { threshold: 0.1 }
        );
        observer.observe(currentSectionRef);
        return () => { observer.unobserve(currentSectionRef); };
    }, [initialItems, carouselDisplayItems.length]);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hslVarName = (currentGlobalTheme === 'cyphers' || currentGlobalTheme === 'shadows') ? '--primary-hsl' : '--accent-hsl';
            const hslString = getComputedStyle(document.documentElement).getPropertyValue(hslVarName).trim();
            if(hslString) {
                // Fix for THREE.Color: "204 100% 50%" -> "hsl(204, 100%, 50%)
                const parts = hslString.split(" ");
                if (parts.length === 3) {
                    const formattedHsl = `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
                    setPointLightColor(formattedHsl);
                }
            }
        }
    }, [currentGlobalTheme, themeVersion]);
    
    const handleCarouselItemClick = useCallback((clickedItem: DisplayItem) => {
        console.log('handleCarouselItemClick: Clicked item:', clickedItem.id, 'Stack Type:', clickedItem.stackType);
        
        if (clickedItem.stackType === 'individual') {
            console.log('handleCarouselItemClick: Individual item clicked. Opening TOD Window.');
            autoRotateRef.current = false;
            // The closeTODWindow() call is removed here as it's now handled by AppContext
            // to ensure no flashing when opening a new general TOD window.
            openTODWindow(
                clickedItem.baseItem?.title || "Item Details",
                <div className="font-rajdhani p-4 text-center">
                    <h3 className="text-xl font-bold mb-2" style={{ color: clickedItem.colorVar }}>{clickedItem.title}</h3>
                    {/* Display the image in the TOD Window for individual items */}
                    <img src={clickedItem.imageSrc || FALLBACK_IMAGE_SRC} alt={clickedItem.title} className="mx-auto my-4 max-w-[150px] object-contain"
                         onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            if (target.src !== `${window.location.origin}${FALLBACK_IMAGE_SRC}`) { target.src = `${window.location.origin}${FALLBACK_IMAGE_SRC}`; target.onerror = null; }
                         }}
                    />
                    <HolographicButton onClick={closeTODWindow} className="mt-4" explicitTheme={currentGlobalTheme}>Close</HolographicButton>
                </div>,
                { showCloseButton: true, explicitTheme: currentGlobalTheme, themeVersion }
            );
        } else {
            // If it's a stack, and we're expanding it, we want to close any existing TOD window
            // because the user is navigating within the carousel, not viewing an item detail.
            closeTODWindow(); 
            console.log('handleCarouselItemClick: Stack clicked. Generating children.');
            const children = generateChildrenForItem(clickedItem);
            console.log('handleCarouselItemClick: Generated children:', children.map(c => c.id));
            if (children.length > 0) {
                 setCarouselDisplayItems(currentItems => {
                     const itemIndex = currentItems.findIndex(item => item.id === clickedItem.id);
                     if (itemIndex > -1) {
                         const newItems = [...currentItems];
                         newItems.splice(itemIndex, 1, ...children);
                         console.log('handleCarouselItemClick: Updating carousel display items with new items. New array length:', newItems.length);
                         return newItems;
                     }
                     console.warn('handleCarouselItemClick: Clicked item not found in current carousel items for replacement. This should not happen.');
                     return currentItems; // Should ideally not happen if a valid item was clicked
                 });
            } else {
                console.log('handleCarouselItemClick: No children generated for this stack. Not updating carousel display items.');
            }
        }
    }, [generateChildrenForItem, openTODWindow, closeTODWindow, currentGlobalTheme, themeVersion]);

    const dynamicCarouselRadius = useMemo(() => {
        const numItems = carouselDisplayItems.length;
        if (numItems <= 1) return 0;
        if (numItems === 2) return MIN_RADIUS_FOR_TWO_ITEMS;
        const circumference = numItems * (ITEM_WIDTH + (ITEM_WIDTH * (CARD_SPACING_FACTOR - 1)));
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, circumference / (2 * Math.PI));
    }, [carouselDisplayItems.length]);

    return (
        <div ref={sectionRef} className="flex flex-col h-full p-4 md:p-6"> {/* Removed overflow-hidden from this outer div */}
            {/* New container for layering the background block and the HolographicPanel */}
            {/* This parent now allows overflow for the HolographicPanel's shadow */}
            <div className="relative w-full h-full flex flex-col items-center justify-center"> {/* Removed overflow-hidden from this intermediate div */}

                {/* NEW: This is the element for the Holographic Panel's OUTWARD GLOW */}
                {/* It sits directly behind the HolographicPanel but outside its overflow:hidden */}
                <div className={cn(
                    "absolute z-[11]", // Changed z-index to 11 to be on top of carousel
                    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "rounded-lg", // Match border-radius of HolographicPanel
                    "pointer-events-none", // Ensures it doesn't interfere with clicks on the panel
                    "max-w-4xl", // Match max-width of HolographicPanel
                    "w-full mx-auto" // Match width properties
                )}
                style={{
                    // These dimensions ensure the shadow div exactly matches the HolographicPanel
                    // to give the appearance of an outward glow from the panel itself.
                    height: '100%',
                    // As max-w-4xl and w-full mx-auto handle width, explicit width is not always needed here,
                    // but if you have a fixed height for HolographicPanel, you might need to adjust
                    // this height and width to match exactly, or slightly larger for a stronger spread.
                }}>
                </div>

                {/* Layer 0: The Blurry Yellow Glow Effect (behind everything) */}
                <div className={cn(
                    "absolute z-[-1] rounded-md", // Lower z-index to be behind the black block
                    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "bg-yellow-500", // The vibrant yellow glow, neutral to themes
                    "filter blur-xl opacity-70" // Apply blur and adjust opacity for the glow effect
                )}
                style={{
                    height: 'min(35vh, 450px)',
                    minWidth: `calc(min(35vh, 450px) * 1.777)`,
                    // Slightly larger to make the glow more pronounced around the black block
                    transform: 'translate(-50%, -50%) scale(1.05)'
                }}>
                </div>
                
                {/* Layer 1: The Opaque Black Background Block (now with #0D1117) */}
                {/* This block is still contained by the outer wrapper's dimensions implicitly. */}
                <div className={cn(
                    "absolute z-0 rounded-md",
                    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" // Center it
                )}
                style={{
                    backgroundColor: '#0D1117', // The specific dark, off-black color
                    height: 'min(35vh, 450px)', // Fixed height, capped to ensure it's not too large
                    minWidth: `calc(min(35vh, 450px) * 1.777)`, // Ensure it's always at least 16:9 aspect ratio width
                }}>
                </div>

                {/* Layer 2: The Main Holographic Panel - sits on top of the background block */}
                {/* Now has overflow-hidden applied directly to it to clip its *internal* content. */}
                <HolographicPanel
                    className={cn(
                        "flex flex-col flex-grow rounded-lg relative z-10", // Panel is z-10, is relative for its children
                        "border border-[var(--hologram-panel-border)]",
                        // The inset shadow remains on the panel for internal glow, now 10px
                        "shadow-[inset_0_0_10px_var(--hologram-glow-color)]",
                        "bg-transparent", // Main panel background remains transparent
                        "max-w-4xl",
                        "w-full mx-auto",
                        "overflow-hidden" // This clips content INSIDE the panel, but not its own shadow (which is now external)
                    )}
                    explicitTheme={currentGlobalTheme} >

                    {/* Carousel Area (within HolographicPanel) - absolute inset-0 to fill panel content */}
                    <div
                        id="locker-carousel-canvas-container"
                        className={cn(
                            "absolute inset-0 z-10", // Fills the entire content area of HolographicPanel
                            "flex flex-col justify-center items-center" // Centers the Canvas vertically
                        )}
                        style={{ cursor: 'grab', touchAction: 'none' }} >
                        
                        {carouselDisplayItems.length > 0 ? (
                            <Canvas
                                id="locker-carousel-canvas"
                                camera={{ position: [0, 0, CAMERA_BASE_Z_DISTANCE], fov: INITIAL_CAMERA_FOV }}
                                shadows gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}
                                onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
                                className="relative w-full h-full" // Canvas fills its parent (locker-carousel-canvas-container)
                            >
                                <ambientLight intensity={1.2} />
                                <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
                                <pointLight position={[-5, 5, 15]} intensity={1.5} color={pointLightColor} />
                                <pointLight position={[0, -10, 0]} intensity={0.3} />
                                <CameraManager carouselRadius={dynamicCarouselRadius} />
                                {/* Added a key prop to force re-render/re-mount of EquipmentCarousel when items change */}
                                <EquipmentCarousel 
                                    key={carouselDisplayItems.map(item => item.id).join('-')} 
                                    itemsToDisplay={carouselDisplayItems} 
                                    onItemClick={handleCarouselItemClick} 
                                    carouselRadius={dynamicCarouselRadius} 
                                    autoRotateRef={autoRotateRef} 
                                />
                                <Resizer />
                            </Canvas>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full">
                                <p className="holographic-text text-lg">Locker Empty</p>
                                <p className="text-muted-foreground text-sm">Visit the Spy Shop or Check In with HQ.</p>
                            </div>
                        )}
                    </div>

                    {/* Layer 3: Header Overlay - absolute to sit on top of carousel content */}
                    <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-3 md:p-4"> 
                        <h2 className="text-2xl font-orbitron holographic-text">
                            Equipment Locker
                        </h2>
                        <HolographicButton onClick={() => {
                            console.log('Shop button clicked in EquipmentLockerSection. Opening Spy Shop.');
                            openSpyShop();
                        }} className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}>
                            <ShoppingCart className="w-5 h-5 icon-glow" />
                        </HolographicButton>
                    </div>  

                    {/* Layer 3: Bottom Text Area Overlay - absolute to sit on top of carousel content */}
                    <p className="absolute bottom-0 left-0 w-full z-20 text-center text-xs text-muted-foreground p-3 md:p-4">
                        {carouselDisplayItems.length > 0 ? "Drag to rotate. Click stack to expand or item for details." : ""}
                    </p>
                </HolographicPanel>
            </div>
        </div>
    );
};
