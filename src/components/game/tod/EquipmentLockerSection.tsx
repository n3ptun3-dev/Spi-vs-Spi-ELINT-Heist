
// src/components/game/tod/EquipmentLockerSection.tsx
"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppContext, type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext';
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';
import { SHOP_CATEGORIES as APP_SHOP_CATEGORIES, getItemById as getBaseItemByIdFromGameItems, type SpecificItemData } from '@/lib/game-items';
import CardTextureRenderer, { type DisplayItem as ImportedDisplayItem } from './CardTextureRenderer';
import { ShoppingCart } from 'lucide-react';

// Re-export DisplayItem to be used within this file
export type DisplayItem = ImportedDisplayItem;

// --- Constants ---
const ITEM_WIDTH = 1.25;
const ITEM_HEIGHT = 1.75;
const CARD_TEXTURE_WIDTH = 256;
const CARD_TEXTURE_HEIGHT = 358;
const MIN_RADIUS_FOR_TWO_ITEMS = 1.5;
const CARD_SPACING_FACTOR = 1.7;
const CAMERA_BASE_Z_DISTANCE = 5.0;
const MIN_CAMERA_Z = 3.5;
const INITIAL_CAMERA_FOV = 50;
const ROTATION_SPEED = 0.0035;
const CLICK_DRAG_THRESHOLD_SQUARED = 10 * 10;
const CLICK_DURATION_THRESHOLD = 250;
const AUTO_ROTATE_RESUME_DELAY = 3000;
const INITIAL_CAROUSEL_TARGET_COUNT = 8;

interface SectionProps {
  parallaxOffset: number;
}

// ============================================================================
//  3D CAROUSEL COMPONENTS
// ============================================================================

const TextureProvider: React.FC<{
    items: DisplayItem[];
    onTextureLoaded: (id: string, texture: THREE.CanvasTexture) => void;
}> = React.memo(({ items, onTextureLoaded }) => {
    return (
        <>
            {items.map(item => (
                <CardTextureRenderer
                    key={item.id}
                    displayItem={item}
                    outputWidth={CARD_TEXTURE_WIDTH}
                    outputHeight={CARD_TEXTURE_HEIGHT}
                    onRendered={(canvas) => {
                        const texture = new THREE.CanvasTexture(canvas);
                        texture.needsUpdate = true;
                        onTextureLoaded(item.id, texture);
                    }}
                />
            ))}
        </>
    );
});
TextureProvider.displayName = 'TextureProvider';

const CarouselItem: React.FC<{
    displayItem: DisplayItem;
    texture: THREE.CanvasTexture | undefined;
    index: number;
    totalItems: number;
    carouselRadius: number;
}> = React.memo(({ displayItem, texture, index, totalItems, carouselRadius }) => {
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
            <meshBasicMaterial map={texture} transparent opacity={texture ? 1 : 0} />
        </mesh>
    );
});
CarouselItem.displayName = 'CarouselItem';

const EquipmentCarousel: React.FC<{
    itemsToDisplay: DisplayItem[];
    textures: Map<string, THREE.CanvasTexture>;
    onItemClick: (displayItem: DisplayItem) => void;
    carouselRadius: number;
    autoRotateRef: React.MutableRefObject<boolean>;
}> = React.memo(({ itemsToDisplay, textures, onItemClick, carouselRadius, autoRotateRef }) => {
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

        canvasElement.addEventListener('pointerdown', startInteraction);
        canvasElement.addEventListener('pointermove', moveInteraction);
        canvasElement.addEventListener('pointerup', endInteraction);

        return () => {
            canvasElement.removeEventListener('pointerdown', startInteraction);
            canvasElement.removeEventListener('pointermove', moveInteraction);
            canvasElement.removeEventListener('pointerup', endInteraction);
            if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        };
    }, [gl, onItemClick, camera, raycaster, invalidate, autoRotateRef, interactionState, resetAutoRotateTimer]);
    
    useFrame((state, delta) => {
        if (group.current && autoRotateRef.current && itemsToDisplay.length > 1) {
            group.current.rotation.y += ROTATION_SPEED * delta * 60;
        }
    });

    return (
        <group ref={group}>
            {itemsToDisplay.map((item, index) => (
                <CarouselItem key={item.id} displayItem={item} texture={textures.get(item.id)} index={index} totalItems={itemsToDisplay.length} carouselRadius={carouselRadius} />
            ))}
        </group>
    );
});
EquipmentCarousel.displayName = 'EquipmentCarousel';


// ============================================================================
//  MAIN SECTION COMPONENT
// ============================================================================

export const EquipmentLockerSection: React.FC<SectionProps> = ({ parallaxOffset }) => {
    const appContext = useAppContext();
    const { openTODWindow, closeTODWindow, playerInventory, getItemById, openSpyShop, isTODWindowOpen } = appContext;
    const { theme: currentGlobalTheme, themeVersion } = useTheme();
    
    const [expandedStackPath, setExpandedStackPath] = useState<string[]>([]);
    const [textures, setTextures] = useState(new Map<string, THREE.CanvasTexture>());
    
    const autoRotateRef = useRef(true);
    const todOpenedByLockerRef = useRef(false);
    const sectionRef = useRef<HTMLDivElement>(null);
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetAutoRotateTimer = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = setTimeout(() => {
            if (!isTODWindowOpen) {
                autoRotateRef.current = true;
            }
        }, AUTO_ROTATE_RESUME_DELAY);
    }, [isTODWindowOpen]);

    useEffect(() => {
        if (!isTODWindowOpen && todOpenedByLockerRef.current) {
            resetAutoRotateTimer();
            todOpenedByLockerRef.current = false;
        }
    }, [isTODWindowOpen, resetAutoRotateTimer]);
    
    const aggregatePlayerItems = useMemo(() => {
        const inventoryArray = Object.values(playerInventory)
            .map(invDetails => ({ invDetails, baseDef: getBaseItemByIdFromGameItems(invDetails.id) }))
            .filter(item => item.baseDef) as { invDetails: PlayerInventoryItem; baseDef: GameItemBase }[];

        const createIndividualDisplayItem = (invItemDetails: PlayerInventoryItem, baseDef: GameItemBase, path: string[], instanceIndex: number): DisplayItem => ({
            id: `${invItemDetails.id}_instance_${instanceIndex}_${path.join('_')}`, baseItem: baseDef, title: baseDef.title || baseDef.name,
            quantityInStack: 1, imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || '/Spi vs Spi icon.png', colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level],
            levelForVisuals: baseDef.level, stackType: 'individual', path, dataAiHint: baseDef.dataAiHint, instanceCurrentStrength: invItemDetails.currentStrength,
            instanceMaxStrength: baseDef.strength?.max, instanceCurrentCharges: invItemDetails.currentCharges, instanceMaxCharges: baseDef.maxCharges,
            instanceCurrentUses: invItemDetails.currentUses, instanceMaxUses: baseDef.maxUses, instanceCurrentAlerts: invItemDetails.currentAlerts,
            instanceMaxAlerts: baseDef.maxAlerts,
        });

        const createAggregatedStack = (items: typeof inventoryArray, stackIdPrefix: string, stackTitle: string, stackType: 'category' | 'itemType' | 'itemLevel', path: string[]): DisplayItem | null => {
            if (items.length === 0) return null;
            let highestLevelItem = items[0].baseDef;
            let totalQuantity = 0;
            let aggCurrentStrength = 0, aggMaxStrength = 0, aggCurrentCharges = 0, aggMaxCharges = 0;
            items.forEach(({ invDetails, baseDef }) => {
                totalQuantity += invDetails.quantity;
                if (baseDef.level > highestLevelItem.level) highestLevelItem = baseDef;
                if (baseDef.strength?.max) {
                    aggCurrentStrength += (invDetails.currentStrength ?? baseDef.strength.max) * invDetails.quantity;
                    aggMaxStrength += baseDef.strength.max * invDetails.quantity;
                }
                if (baseDef.maxCharges) {
                    aggCurrentCharges += (invDetails.currentCharges ?? baseDef.maxCharges) * invDetails.quantity;
                    aggMaxCharges += baseDef.maxCharges * invDetails.quantity;
                }
            });
            const uniqueIdPart = path.join('_') || stackTitle.replace(/\s+/g, '_');
            return {
                id: `${stackIdPrefix}_${uniqueIdPart}`, baseItem: null, title: stackTitle, quantityInStack: totalQuantity,
                imageSrc: highestLevelItem.tileImageSrc || highestLevelItem.imageSrc || '/Spi vs Spi icon.png',
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItem.level], levelForVisuals: highestLevelItem.level,
                aggregateCurrentStrength: aggCurrentStrength, aggregateMaxStrength: aggMaxStrength,
                aggregateCurrentCharges: aggCurrentCharges, aggregateMaxCharges: aggMaxCharges,
                stackType, path, dataAiHint: highestLevelItem.dataAiHint || stackTitle.toLowerCase(),
            };
        };

        const totalPhysicalItems = inventoryArray.reduce((sum, item) => sum + item.invDetails.quantity, 0);

        if (expandedStackPath.length === 0) {
            if (totalPhysicalItems <= INITIAL_CAROUSEL_TARGET_COUNT) {
                return inventoryArray.flatMap(({ invDetails, baseDef }) => 
                    Array.from({ length: invDetails.quantity }, (_, i) => 
                        createIndividualDisplayItem(invDetails, baseDef, [baseDef.category, baseDef.name, invDetails.id], i)
                    )
                );
            } else {
                return APP_SHOP_CATEGORIES.map(catInfo => createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name]))
                    .filter((item): item is DisplayItem => !!item);
            }
        } else {
            const currentPath = expandedStackPath;
            const expandedItems: DisplayItem[] = [];
            
            // Logic for expanding the deepest part of the path
            if (currentPath.length === 1) { // Expanding a category
                const category = currentPath[0];
                const itemsInCat = inventoryArray.filter(i => i.baseDef.category === category);
                const groupedByBaseName = itemsInCat.reduce((acc, i) => { (acc[i.baseDef.name] = acc[i.baseDef.name] || []).push(i); return acc; }, {} as Record<string, typeof inventoryArray>);
                Object.entries(groupedByBaseName).forEach(([baseName, items]) => {
                    const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [...currentPath, baseName]);
                    if (stack) expandedItems.push(stack);
                });
            } else if (currentPath.length === 2) { // Expanding an item type
                const [category, baseName] = currentPath;
                const itemsOfType = inventoryArray.filter(i => i.baseDef.category === category && i.baseDef.name === baseName);
                const groupedByLevel = itemsOfType.reduce((acc, i) => { (acc[i.baseDef.id] = acc[i.baseDef.id] || []).push(i); return acc; }, {} as Record<string, typeof inventoryArray>);
                Object.entries(groupedByLevel).forEach(([itemId, items]) => {
                    const stack = createAggregatedStack(items, 'itemLevel', items[0].baseDef.title || items[0].baseDef.name, 'itemLevel', [...currentPath, itemId]);
                    if (stack) expandedItems.push(stack);
                });
            } else if (currentPath.length === 3) { // Expanding an item level
                const [category, baseName, itemId] = currentPath;
                const itemToExpand = inventoryArray.find(i => i.invDetails.id === itemId);
                if (itemToExpand) {
                    for (let i = 0; i < itemToExpand.invDetails.quantity; i++) {
                        expandedItems.push(createIndividualDisplayItem(itemToExpand.invDetails, itemToExpand.baseDef, [...currentPath], i));
                    }
                }
            }

            // Logic for adding back the "other" items at the current level
            const otherItems = inventoryArray.filter(item => !item.baseDef.path?.startsWith(currentPath.join('/')));

            const otherStacks = APP_SHOP_CATEGORIES
                .filter(cat => cat.name !== currentPath[0])
                .map(catInfo => createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name]))
                .filter((item): item is DisplayItem => !!item);

            return [...expandedItems, ...otherStacks].sort((a, b) => a.title.localeCompare(b.title));
        }
    }, [playerInventory, getItemById, expandedStackPath]);

    const handleCarouselItemClick = useCallback((clickedItem: DisplayItem) => {
        autoRotateRef.current = false;
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);

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
    
    useEffect(() => {
        const currentSectionRef = sectionRef.current;
        if (!currentSectionRef) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    setExpandedStackPath([]);
                }
            }, { threshold: 0.1 }
        );
        observer.observe(currentSectionRef);
        return () => { if (currentSectionRef) observer.unobserve(currentSectionRef); };
    }, []);

    const dynamicCarouselRadius = useMemo(() => {
        const numItems = aggregatePlayerItems.length;
        if (numItems <= 1) return 0;
        if (numItems === 2) return MIN_RADIUS_FOR_TWO_ITEMS;
        const circumference = numItems * (ITEM_WIDTH * CARD_SPACING_FACTOR);
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, circumference / (2 * Math.PI));
    }, [aggregatePlayerItems.length]);
    
    const dynamicCameraZ = Math.max(MIN_CAMERA_Z, dynamicCarouselRadius + CAMERA_BASE_Z_DISTANCE);

    const handleTextureLoaded = useCallback((id: string, texture: THREE.CanvasTexture) => {
        setTextures(prev => new Map(prev).set(id, texture));
    }, []);

    return (
        <div ref={sectionRef} className="flex flex-col h-full w-full p-4 md:p-6">
            <HolographicPanel
                className="w-full h-full flex flex-col items-center px-0 py-2 md:py-4 overflow-hidden"
                explicitTheme={currentGlobalTheme} >
                <div className="flex-shrink-0 w-full flex items-center justify-between px-4 my-2 md:my-3">
                    <h2 className="text-xl md:text-2xl font-orbitron holographic-text text-left flex-grow">
                        Equipment Locker
                    </h2>
                    <HolographicButton 
                        onClick={(e) => { e.stopPropagation(); openSpyShop(); }} 
                        className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}
                    >
                        <ShoppingCart className="w-5 h-5 icon-glow" />
                    </HolographicButton>
                </div>
                <div
                    id="locker-carousel-canvas-container"
                    className="w-full flex-grow min-h-0 relative"
                    style={{ cursor: 'grab', touchAction: 'none' }} >
                    
                    <TextureProvider items={aggregatePlayerItems} onTextureLoaded={handleTextureLoaded} />
                    
                    {aggregatePlayerItems.length > 0 ? (
                        <Canvas
                            id="locker-carousel-canvas" camera={{ position: [0, 0, dynamicCameraZ], fov: INITIAL_CAMERA_FOV }}
                            gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}
                            onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }} >
                            <ambientLight intensity={1.5} />
                            <pointLight position={[0, 10, 10]} intensity={1} />
                            <EquipmentCarousel 
                                itemsToDisplay={aggregatePlayerItems} 
                                textures={textures}
                                onItemClick={handleCarouselItemClick} 
                                carouselRadius={dynamicCarouselRadius} 
                                autoRotateRef={autoRotateRef} 
                            />
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
