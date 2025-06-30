// src/components/game/tod/EquipmentLockerSection.tsx
// MODIFIED BY LEXI (2025-06-28): Reverted carousel expansion logic.
//                                - Clicking a stack now replaces it with its children within the existing carousel,
//                                  rather than creating a new carousel view.
// MODIFIED BY LEXI (2025-06-29): Updated useAppContext import to include DisplayItem.
//                                - Modified handleCarouselItemClick to open ItemSliderWindow for individual items.

"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Imports from shared components and contexts ---
import { useAppContext, type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem, type DisplayItem } from '@/contexts/AppContext'; // Update import
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants';
import { SHOP_CATEGORIES as APP_SHOP_CATEGORIES, getItemById as getBaseItemByIdFromGameItems } from '@/lib/game-items';
import { ShoppingCart } from 'lucide-react';

// --- Import the consolidated CardTextureRenderer and DisplayItem from its dedicated file ---
import CardTextureRenderer, { FALLBACK_IMAGE_SRC } from './CardTextureRenderer'; // DisplayItem is now imported from AppContext

// --- Constants ---
const ITEM_WIDTH = 0.9;
const ITEM_HEIGHT = 1.3;
const CAMERA_BASE_Z_DISTANCE = 2;
const INITIAL_CAMERA_FOV = 55;
const ROTATION_SPEED = 0.0035;
const SINGLE_ITEM_ROTATION_SPEED = 0.01;
const CLICK_DRAG_THRESHOLD_SQUARED = 10 * 10;
const CLICK_DURATION_THRESHOLD = 250;
const AUTO_ROTATE_RESUME_DELAY = 3000;
const MIN_RADIUS_FOR_TWO_ITEMS = 0.5;
const CARD_SPACING_FACTOR = 1.1;
const INITIAL_CAROUSEL_TARGET_COUNT = 8;
const SINGLE_USE_ITEMS = new Set(['Dummy Node', 'Reactive Armor', 'System Hack', 'Stealth Program', 'Code Scrambler', 'Power Spike', 'Seismic Charge', 'Bio-Scanner Override']);
const BAR_ITEMS_BY_NAME = new Set(['Security Camera', 'Emergency Repair System', 'Emergency Power Cell']);

// --- Type Definitions ---
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

interface CarouselItemProps {
    displayItem: DisplayItem;
    index: number;
    totalItems: number;
    carouselRadius: number;
    autoRotateRef: React.MutableRefObject<boolean>;
    isSingleItem: boolean;
}

const CarouselItem = React.memo(function CarouselItem({ displayItem, index, totalItems, carouselRadius, autoRotateRef, isSingleItem }: CarouselItemProps) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

    const handleCanvasRendered = useCallback((canvas: HTMLCanvasElement) => {
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.needsUpdate = true;
        setTexture(oldTexture => {
            oldTexture?.dispose();
            return newTexture;
        });
    }, []);

    useEffect(() => () => {
        texture?.dispose();
    }, [texture]);

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
        if (meshRef.current) {
            if (isSingleItem) {
                if (autoRotateRef.current) {
                    meshRef.current.rotation.y += SINGLE_ITEM_ROTATION_SPEED;
                }
            } else {
                meshRef.current.lookAt(camera.position);
            }
        }
    });

    return (
        <>
            <CardTextureRenderer displayItem={displayItem} onRendered={handleCanvasRendered} outputWidth={256} outputHeight={427} />
            <mesh ref={meshRef} userData={{ displayItem, isCarouselItem: true, id: displayItem.id }}>
                <planeGeometry args={[ITEM_WIDTH, ITEM_HEIGHT]} />
                <meshBasicMaterial map={texture} transparent={true} side={THREE.DoubleSide} />
            </mesh>
        </>
    );
});
CarouselItem.displayName = 'CarouselItem';

interface EquipmentCarouselProps {
    itemsToDisplay: DisplayItem[];
    onItemClick: (displayItem: DisplayItem) => void;
    carouselRadius: number;
    autoRotateRef: React.MutableRefObject<boolean>;
    stopRotation: () => void;
    resumeRotationAfterDelay: () => void;
}

const EquipmentCarousel: React.FC<EquipmentCarouselProps> = React.memo(({ itemsToDisplay, onItemClick, carouselRadius, autoRotateRef, stopRotation, resumeRotationAfterDelay }) => {
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

    useEffect(() => {
        const canvasElement = gl.domElement;

        const startInteraction = (e: PointerEvent) => {
            if (interactionState.isDown) return;
            interactionState.isDown = true;
            interactionState.pointerId = e.pointerId;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);

            stopRotation();
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
            if (interactionState.isDragging && itemsToDisplay.length > 1) {
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

            const wasDragging = interactionState.isDragging;
            const dragDuration = performance.now() - interactionState.downTime;

            interactionState.isDown = false;
            interactionState.isDragging = false;
            interactionState.pointerId = null;

            if (!wasDragging && dragDuration < CLICK_DURATION_THRESHOLD) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Fix for mobile ghost click

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
                        return;
                    }
                }
            }

            resumeRotationAfterDelay();
        };

        canvasElement.addEventListener('pointerdown', startInteraction);
        canvasElement.addEventListener('pointermove', moveInteraction);
        canvasElement.addEventListener('pointerup', endInteraction);
        canvasElement.addEventListener('pointercancel', endInteraction);

        return () => {
            canvasElement.removeEventListener('pointerdown', startInteraction);
            canvasElement.removeEventListener('pointermove', moveInteraction);
            canvasElement.removeEventListener('pointerup', endInteraction);
            canvasElement.removeEventListener('pointercancel', endInteraction);
        };
    }, [gl, onItemClick, camera, raycaster, invalidate, appContext, itemsToDisplay.length, stopRotation, resumeRotationAfterDelay]);

    useFrame((state, delta) => {
        if (group.current && autoRotateRef.current && itemsToDisplay.length > 1) {
            group.current.rotation.y += ROTATION_SPEED * delta * 60;
        }
    });

    return (
        <group ref={group}>
            {itemsToDisplay.map((item, index) => (
                <CarouselItem
                    key={item.id}
                    displayItem={item}
                    index={index}
                    totalItems={itemsToDisplay.length}
                    carouselRadius={carouselRadius}
                    autoRotateRef={autoRotateRef}
                    isSingleItem={itemsToDisplay.length === 1}
                />
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
    const { openTODWindow, closeTODWindow, playerInventory, getItemById, openSpyShop, isTODWindowOpen, openItemSlider } = useAppContext();
    const { theme: currentGlobalTheme, themeVersion } = useTheme();
    const [carouselDisplayItems, setCarouselDisplayItems] = useState<DisplayItem[]>([]);
    const [initialItems, setInitialItems] = useState<DisplayItem[]>([]);
    const [pointLightColor, setPointLightColor] = useState<THREE.ColorRepresentation>('hsl(0, 0%, 100%)');
    const sectionRef = useRef<HTMLDivElement>(null);

    const autoRotateRef = useRef(true);
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const stopRotation = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateRef.current = false;
    }, []);

    const resumeRotationAfterDelay = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = setTimeout(() => {
            if (sectionRef.current && !isTODWindowOpen) {
                 autoRotateRef.current = true;
            }
        }, AUTO_ROTATE_RESUME_DELAY);
    }, [isTODWindowOpen]);

    useEffect(() => {
        if (!isTODWindowOpen) {
            resumeRotationAfterDelay();
        } else {
            stopRotation();
        }
    }, [isTODWindowOpen, resumeRotationAfterDelay, stopRotation]);


    const { generateChildrenForItem, generateInitialView } = useMemo(() => {
        const inventoryArray = Object.values(playerInventory)
            .map(invDetails => ({ invDetails, baseDef: getBaseItemByIdFromGameItems(invDetails.id) }))
            .filter(item => item.baseDef && item.invDetails.quantity > 0) as Array<{
              invDetails: PlayerInventoryItem; baseDef: GameItemBase
            }>;

        const createIndividualDisplayItem = (invItemDetails: PlayerInventoryItem, baseDef: GameItemBase, path: string[], instanceIndex: number): DisplayItem => {
            let displayTextLabel: string | undefined = undefined;
            let hasBar = false;

            if (baseDef.category === 'Hardware' || BAR_ITEMS_BY_NAME.has(baseDef.name)) {
                hasBar = true;
            }

            if (!hasBar) {
                if (SINGLE_USE_ITEMS.has(baseDef.name)) {
                    displayTextLabel = 'Single Use';
                } else if (baseDef.name === 'Pick (L1)') {
                    displayTextLabel = 'standard issue';
                } else if (baseDef.name === 'Reinforced Foundation') {
                    displayTextLabel = 'Permanent';
                } else if ((baseDef.category === 'Infiltration Gear' || baseDef.category === 'Lock Fortifiers') && baseDef.perUseCost && baseDef.perUseCost > 0) {
                    displayTextLabel = `Activation Cost: ${baseDef.perUseCost} ELINT`;
                }
            }

            return {
                id: `${invItemDetails.id}_instance_${instanceIndex}_${path.join('_')}`,
                baseItem: baseDef,
                title: baseDef.title || baseDef.name,
                quantityInStack: 1,
                imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || FALLBACK_IMAGE_SRC,
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || 'var(--level-1-color)',
                levelForVisuals: baseDef.level,
                stackType: 'individual',
                path,
                dataAiHint: baseDef.dataAiHint,
                displayTextLabel,
                instanceCurrentStrength: hasBar ? invItemDetails.currentStrength : undefined,
                instanceMaxStrength: hasBar ? baseDef.strength?.max : undefined,
                instanceCurrentCharges: hasBar ? (invItemDetails as any).currentCharges : undefined,
                instanceMaxCharges: hasBar ? (baseDef as any).maxCharges : undefined,
                instanceCurrentAlerts: hasBar ? (invItemDetails as any).currentAlerts : undefined,
                instanceMaxAlerts: hasBar ? (baseDef as any).maxAlerts : undefined,
            };
        };

        const createAggregatedStack = (items: Array<{ invDetails: PlayerInventoryItem; baseDef: GameItemBase }>, stackIdPrefix: string, stackTitle: string, stackType: 'category' | 'itemType' | 'itemLevel', path: string[]): DisplayItem | null => {
            if (items.length === 0) return null;

            let highestLevelItem = items[0].baseDef;
            let totalQuantity = 0;
            let aggCurrentStrength = 0, aggMaxStrength = 0, aggCurrentCharges = 0, aggMaxCharges = 0, aggCurrentAlerts = 0, aggMaxAlerts = 0;
            let hasBarItems = false;
            const textLabels = new Set<string>();

            items.forEach(({ invDetails, baseDef }) => {
                totalQuantity += invDetails.quantity;
                if (baseDef.level > highestLevelItem.level) {
                    highestLevelItem = baseDef;
                }

                let itemHasBar = baseDef.category === 'Hardware' || BAR_ITEMS_BY_NAME.has(baseDef.name);

                if (itemHasBar) {
                    hasBarItems = true;
                    aggCurrentStrength += (invDetails.currentStrength ?? 0) * invDetails.quantity;
                    aggMaxStrength += (baseDef.strength?.max ?? 0) * invDetails.quantity;
                    aggCurrentCharges += ((invDetails as any).currentCharges ?? 0) * invDetails.quantity;
                    aggMaxCharges += ((baseDef as any).maxCharges ?? 0) * invDetails.quantity;
                    aggCurrentAlerts += ((invDetails as any).currentAlerts ?? 0) * invDetails.quantity;
                    aggMaxAlerts += ((baseDef as any).maxAlerts ?? 0) * invDetails.quantity;
                } else {
                    let label = "Multiple Types";
                    if (SINGLE_USE_ITEMS.has(baseDef.name)) {
                        label = 'Single Use Items';
                    } else if (baseDef.perUseCost && baseDef.perUseCost > 0) {
                        label = `Activation Cost: ${baseDef.perUseCost} ELINT`;
                    }
                    textLabels.add(label);
                }
            });

            let finalDisplayTextLabel: string | undefined = undefined;
            if (!hasBarItems) {
                if (textLabels.size === 1) {
                    finalDisplayTextLabel = textLabels.values().next().value;
                } else if (textLabels.size > 1) {
                    finalDisplayTextLabel = 'Multiple Types';
                }
            }

            const uniqueIdPart = path.join('_') || stackTitle.replace(/\s+/g, '_');
            return {
                id: `${stackIdPrefix}_${uniqueIdPart}`,
                baseItem: null,
                title: stackTitle,
                quantityInStack: totalQuantity,
                imageSrc: highestLevelItem.tileImageSrc || highestLevelItem.imageSrc || FALLBACK_IMAGE_SRC,
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItem.level] || 'var(--level-1-color)',
                levelForVisuals: highestLevelItem.level,
                stackType,
                path,
                dataAiHint: highestLevelItem.dataAiHint || stackTitle.toLowerCase(),
                displayTextLabel: finalDisplayTextLabel,
                aggregateCurrentStrength: hasBarItems ? aggCurrentStrength : undefined,
                aggregateMaxStrength: hasBarItems ? aggMaxStrength : undefined,
                aggregateCurrentCharges: hasBarItems ? aggCurrentCharges : undefined,
                aggregateMaxCharges: hasBarItems ? aggMaxCharges : undefined,
                aggregateCurrentAlerts: hasBarItems ? aggCurrentAlerts : undefined,
                aggregateMaxAlerts: hasBarItems ? aggMaxAlerts : undefined,
            };
        };

        const generateChildrenForItem = (item: DisplayItem): DisplayItem[] => {
            const { stackType, path } = item;
            let children: DisplayItem[] = [];

            if (stackType === 'category') {
                const categoryToExpand = path[0] as ItemCategory;
                const itemsInExpandedCategory = inventoryArray.filter(i => i.baseDef.category === categoryToExpand);
                const groupedByBaseName = itemsInExpandedCategory.reduce((acc, i) => {
                    (acc[i.baseDef.name] = acc[i.baseDef.name] || []).push(i);
                    return acc;
                }, {} as Record<string, typeof inventoryArray>);

                Object.entries(groupedByBaseName).forEach(([baseName, items]) => {
                    const totalQuantityForBaseName = items.reduce((sum, i) => sum + i.invDetails.quantity, 0);

                    if (totalQuantityForBaseName === 1) {
                        const theOnlyItem = items[0];
                        children.push(createIndividualDisplayItem(theOnlyItem.invDetails, theOnlyItem.baseDef, [...path, theOnlyItem.invDetails.id], 0));
                    } else {
                        const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [...path, baseName]);
                        if (stack) children.push(stack);
                    }
                });
            } else if (stackType === 'itemType') {
                const [category, baseName] = path;
                const itemsOfExpandedType = inventoryArray.filter(i => i.baseDef.category === category && i.baseDef.name === baseName);
                const groupedByInvId = itemsOfExpandedType.reduce((acc, i) => {
                    (acc[i.invDetails.id] = acc[i.invDetails.id] || []).push(i);
                    return acc;
                }, {} as Record<string, typeof inventoryArray>);

                Object.entries(groupedByInvId).forEach(([invId, items]) => {
                    const firstItemInStack = items[0];
                    if (firstItemInStack.invDetails.quantity > 1) {
                        const stack = createAggregatedStack(items, 'itemLevel', firstItemInStack.baseDef.title || firstItemInStack.baseDef.name, 'itemLevel', [...path, invId]);
                        if (stack) children.push(stack);
                    } else {
                        children.push(createIndividualDisplayItem(firstItemInStack.invDetails, firstItemInStack.baseDef, [...path, invId], 0));
                    }
                });
            } else if (stackType === 'itemLevel') {
                const invIdToExpand = path[path.length - 1];
                const itemToExpandDetails = inventoryArray.find(i => i.invDetails.id === invIdToExpand);
                if (itemToExpandDetails) {
                    for (let i = 0; i < itemToExpandDetails.invDetails.quantity; i++) {
                        children.push(createIndividualDisplayItem(itemToExpandDetails.invDetails, itemToExpandDetails.baseDef, [...path], i));
                    }
                }
            }
            return children.sort((a,b) => a.title.localeCompare(b.title));
        };

        const generateInitialView = (): DisplayItem[] => {
            const totalItems = inventoryArray.reduce((sum, item) => sum + item.invDetails.quantity, 0);
            if (totalItems > 0 && totalItems <= INITIAL_CAROUSEL_TARGET_COUNT) {
                 const itemStacks = inventoryArray.reduce((acc, item) => {
                     (acc[item.invDetails.id] = acc[item.invDetails.id] || []).push(item);
                     return acc;
                 }, {} as Record<string, typeof inventoryArray>);

                 return Object.values(itemStacks).map(itemsOfSameId => {
                     const first = itemsOfSameId[0];
                     if (first.invDetails.quantity > 1) {
                         return createAggregatedStack(itemsOfSameId, 'itemLevel', first.baseDef.title || first.baseDef.name, 'itemLevel', [first.baseDef.category, first.baseDef.name, first.invDetails.id])!;
                     }
                     return createIndividualDisplayItem(first.invDetails, first.baseDef, [first.baseDef.category, first.baseDef.name, first.invDetails.id], 0);
                 }).sort((a,b) => a.title.localeCompare(b.title));
            } else if (inventoryArray.length > 0) {
                 return APP_SHOP_CATEGORIES.map(catInfo => createAggregatedStack(inventoryArray.filter(item => item.baseDef.category === catInfo.name), 'category', catInfo.name, 'category', [catInfo.name as ItemCategory]))
                    .filter((item): item is DisplayItem => item !== null).sort((a,b) => a.title.localeCompare(b.title));
            }
            return [];
        };

        return { generateChildrenForItem, generateInitialView };
    }, [playerInventory, getItemById]);

    useEffect(() => {
        const items = generateInitialView();
        setCarouselDisplayItems(items);
        setInitialItems(items);
    }, [generateInitialView]);

    useEffect(() => {
        const currentSectionRef = sectionRef.current;
        if (!currentSectionRef) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if(entry.isIntersecting) {
                    resumeRotationAfterDelay();
                } else {
                    stopRotation();
                     if (carouselDisplayItems.length !== initialItems.length) {
                        setCarouselDisplayItems(initialItems);
                    }
                }
            }, { threshold: 0.1 }
        );
        observer.observe(currentSectionRef);
        return () => { observer.unobserve(currentSectionRef); };
    }, [initialItems, carouselDisplayItems.length, resumeRotationAfterDelay, stopRotation]);

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

    const handleCarouselItemClick = useCallback((clickedItem: DisplayItem) => {
        stopRotation();
        if (clickedItem.stackType === 'individual' && clickedItem.baseItem) {
            // --- THIS IS THE KEY CHANGE ---
            // Instead of opening a TOD Window, open the new Item Slider Window.
            // We need to find all items of the same type and level in inventory.
            const allInstances = Object.values(playerInventory)
                .filter(invItem => invItem.id === clickedItem.baseItem!.id)
                .flatMap(invItem =>
                    Array.from({ length: invItem.quantity }, (_, i) => ({...invItem, instanceIndex: i}))
                );

            const displayItemsForSlider = allInstances.map((inst, i) => {
                 // This logic should mirror how individual DisplayItems are created
                 const baseDef = getItemById(inst.id);
                 if (!baseDef) return null; // Should not happen if filtered correctly above

                 let displayTextLabel: string | undefined = undefined;
                 let hasBar = false;

                 if (baseDef.category === 'Hardware' || BAR_ITEMS_BY_NAME.has(baseDef.name)) {
                     hasBar = true;
                 }

                 if (!hasBar) {
                     if (SINGLE_USE_ITEMS.has(baseDef.name)) {
                         displayTextLabel = 'Single Use';
                     } else if (baseDef.name === 'Pick (L1)') {
                         displayTextLabel = 'standard issue';
                     } else if (baseDef.name === 'Reinforced Foundation') {
                         displayTextLabel = 'Permanent';
                     } else if ((baseDef.category === 'Infiltration Gear' || baseDef.category === 'Lock Fortifiers') && baseDef.perUseCost && baseDef.perUseCost > 0) {
                         displayTextLabel = `Activation Cost: ${baseDef.perUseCost} ELINT`;
                     }
                 }

                 return {
                     id: `${inst.id}_slider_${i}`, // Unique ID for each instance in the slider
                     baseItem: baseDef,
                     title: baseDef.title || baseDef.name,
                     quantityInStack: 1, // Always 1 for individual items in slider
                     imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || FALLBACK_IMAGE_SRC,
                     colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || 'var(--level-1-color)',
                     levelForVisuals: baseDef.level,
                     stackType: 'individual',
                     path: clickedItem.path, // Maintain the path from the clicked item for consistency
                     dataAiHint: baseDef.dataAiHint,
                     displayTextLabel,
                     instanceCurrentStrength: hasBar ? inst.currentStrength : undefined,
                     instanceMaxStrength: hasBar ? baseDef.strength?.max : undefined,
                     instanceCurrentCharges: hasBar ? (inst as any).currentCharges : undefined,
                     instanceMaxCharges: hasBar ? (baseDef as any).maxCharges : undefined,
                     instanceCurrentAlerts: hasBar ? (inst as any).currentAlerts : undefined,
                     instanceMaxAlerts: hasBar ? (baseDef as any).maxAlerts : undefined,
                 } as DisplayItem;
            }).filter((item): item is DisplayItem => item !== null); // Filter out any nulls

            // Find the index of the specific item clicked to start there
            const initialIndex = displayItemsForSlider.findIndex(d => d.id.startsWith(clickedItem.id));

            openItemSlider(
                "Item Details",
                displayItemsForSlider,
                { type: 'locker', itemLevel: clickedItem.baseItem.level },
                initialIndex >= 0 ? initialIndex : 0
            );

        } else {
            // Existing logic for expanding stacks
            const children = generateChildrenForItem(clickedItem);
            if (children.length > 0) {
                  setCarouselDisplayItems(currentItems => {
                     const itemIndex = currentItems.findIndex(item => item.id === clickedItem.id);
                     if (itemIndex > -1) {
                         const newItems = [...currentItems];
                         newItems.splice(itemIndex, 1, ...children);
                         return newItems;
                     }
                     console.warn(`Could not find clicked stack item with id ${clickedItem.id} to expand.`);
                     return currentItems;
                 });
                 resumeRotationAfterDelay();
            }
        }
    }, [playerInventory, openItemSlider, generateChildrenForItem, stopRotation, resumeRotationAfterDelay, getItemById]); // Added getItemById to dependencies

    const dynamicCarouselRadius = useMemo(() => {
        const numItems = carouselDisplayItems.length;
        if (numItems <= 1) return 0;
        if (numItems === 2) return MIN_RADIUS_FOR_TWO_ITEMS;
        const circumference = numItems * (ITEM_WIDTH + (ITEM_WIDTH * (CARD_SPACING_FACTOR - 1)));
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, circumference / (2 * Math.PI));
    }, [carouselDisplayItems.length]);

    return (
        <div ref={sectionRef} className="flex flex-col h-full p-4 md:p-6">
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className={cn("absolute inset-0 max-w-4xl mx-auto rounded-lg", "overflow-hidden", "z-0")}>
                    <div className={cn("absolute rounded-md", "bg-yellow-500", "filter blur-xl opacity-70")}
                    style={{ height: 'min(35vh, 450px)', minWidth: `calc(min(35vh, 450px) * 1.777)`, left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(1.05)' }} />
                    <div className={cn("absolute rounded-lg")}
                    style={{ backgroundColor: '#0D1117', height: 'min(35vh, 450px)', minWidth: `calc(min(35vh, 450px) * 1.777)`, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
                </div>
                <HolographicPanel
                    className={cn( "absolute inset-0", "flex flex-col flex-grow rounded-lg relative z-10", "border border-[var(--hologram-panel-border)]", "bg-transparent", "w-full h-full" )}
                    explicitTheme={currentGlobalTheme} >
                    <div
                        id="locker-carousel-canvas-container"
                        className={cn( "absolute inset-0 z-10", "flex flex-col justify-center items-center", "overflow-hidden" )}
                        style={{ cursor: 'grab', touchAction: 'none' }} >

                        {carouselDisplayItems.length > 0 ? (
                            <Canvas
                                id="locker-carousel-canvas"
                                camera={{ position: [0, 0, CAMERA_BASE_Z_DISTANCE], fov: INITIAL_CAMERA_FOV }}
                                shadows gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}
                                onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
                                className="relative w-full h-full"
                            >
                                <ambientLight intensity={1.2} />
                                <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
                                <pointLight position={[-5, 5, 15]} intensity={1.5} color={pointLightColor} />
                                <pointLight position={[0, -10, 0]} intensity={0.3} />
                                <CameraManager carouselRadius={dynamicCarouselRadius} />
                                <EquipmentCarousel
                                    key={carouselDisplayItems.map(item => item.id).join('-')}
                                    itemsToDisplay={carouselDisplayItems}
                                    onItemClick={handleCarouselItemClick}
                                    carouselRadius={dynamicCarouselRadius}
                                    autoRotateRef={autoRotateRef}
                                    stopRotation={stopRotation}
                                    resumeRotationAfterDelay={resumeRotationAfterDelay}
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
                    <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-3 md:p-4">
                        <h2 className="text-2xl font-orbitron holographic-text">
                            Equipment Locker
                        </h2>
                        <HolographicButton onClick={(e) => { e.stopPropagation(); openSpyShop(); }} className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}>
                            <ShoppingCart className="w-5 h-5 icon-glow" />
                        </HolographicButton>
                    </div>
                    <p className="absolute bottom-0 left-0 w-full z-20 text-center text-xs text-muted-foreground p-3 md:p-4">
                        {carouselDisplayItems.length > 0 ? "Drag to rotate. Click stack to expand or item for details." : ""}
                    </p>
                </HolographicPanel>
            </div>
        </div>
    );
};
