
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
const INITIAL_CAMERA_FOV = 50;
const ROTATION_SPEED = 0.0035;
const SINGLE_ITEM_ROTATION_SPEED = 0.01;
const CLICK_DRAG_THRESHOLD_SQUARED = 10 * 10;
const CLICK_DURATION_THRESHOLD = 250;
const AUTO_ROTATE_RESUME_DELAY = 3000;
const MIN_RADIUS_FOR_TWO_ITEMS = 1.4;
const CARD_SPACING_FACTOR = 1.7;
const SINGLE_USE_ITEMS = new Set(['Dummy Node', 'Reactive Armor', 'System Hack', 'Stealth Program', 'Code Scrambler', 'Power Spike', 'Seismic Charge', 'Bio-Scanner Override']);
const BAR_ITEMS_BY_NAME = new Set(['Security Camera', 'Emergency Repair System', 'Emergency Power Cell']);
const INITIAL_CAROUSEL_TARGET_COUNT = 8;
const MIN_CAMERA_Z = 3.5;
const CAMERA_DISTANCE_FROM_FRONT_CARD = 5.0;

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
        const targetZ = Math.max(MIN_CAMERA_Z, carouselRadius + CAMERA_DISTANCE_FROM_FRONT_CARD);
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
}

const EquipmentCarousel: React.FC<EquipmentCarouselProps> = React.memo(({ itemsToDisplay, onItemClick, carouselRadius, autoRotateRef }) => {
    const group = useRef<THREE.Group>(null!);
    
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
    const [expandedStackPath, setExpandedStackPath] = useState<string[]>([]);
    const [pointLightColor, setPointLightColor] = useState<THREE.ColorRepresentation>('hsl(0, 0%, 100%)');
    const sectionRef = useRef<HTMLDivElement>(null);

    const autoRotateRef = useRef(true);
    const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const todOpenedByLockerRef = useRef(false);

    const resumeRotation = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = setTimeout(() => {
            if (sectionRef.current && !todOpenedByLockerRef.current) {
                 autoRotateRef.current = true;
            }
        }, AUTO_ROTATE_RESUME_DELAY);
    }, []);

    const stopRotation = useCallback(() => {
        if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
        autoRotateRef.current = false;
    }, []);

    useEffect(() => {
        if (!isTODWindowOpen && todOpenedByLockerRef.current) {
            todOpenedByLockerRef.current = false;
            resumeRotation();
        }
    }, [isTODWindowOpen, resumeRotation]);


    const { generateChildrenForItem, generateInitialView } = useMemo(() => {
        const inventoryArray = Object.values(playerInventory)
            .map(invDetails => ({ invDetails, baseDef: getBaseItemByIdFromGameItems(invDetails.id) }))
            .filter(item => item.baseDef && item.invDetails.quantity > 0) as Array<{
              invDetails: PlayerInventoryItem; baseDef: GameItemBase
            }>;

        const createIndividualDisplayItem = (invItemDetails: PlayerInventoryItem, baseDef: GameItemBase, path: string[], instanceIndex: number): DisplayItem => {
            let displayTextLabel: string | undefined = undefined;
            let hasBar = baseDef.category === 'Hardware' || BAR_ITEMS_BY_NAME.has(baseDef.name);

            if (!hasBar) {
                if (SINGLE_USE_ITEMS.has(baseDef.name)) displayTextLabel = 'Single Use';
                else if (baseDef.perUseCost && baseDef.perUseCost > 0) displayTextLabel = `Activation Cost: ${baseDef.perUseCost} ELINT`;
            }

            return {
                id: `${invItemDetails.id}_instance_${instanceIndex}_${path.join('_')}`,
                baseItem: baseDef,
                title: baseDef.title || baseDef.name,
                quantityInStack: 1,
                imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || FALLBACK_IMAGE_SRC,
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || ITEM_LEVEL_COLORS_CSS_VARS[1],
                levelForVisuals: baseDef.level,
                stackType: 'individual',
                path,
                dataAiHint: baseDef.dataAiHint,
                displayTextLabel,
                instanceCurrentStrength: hasBar ? invItemDetails.currentStrength : undefined,
                instanceMaxStrength: hasBar ? baseDef.strength?.max : undefined,
                instanceCurrentCharges: hasBar ? invItemDetails.currentCharges : undefined,
                instanceMaxCharges: hasBar ? baseDef.maxCharges : undefined,
            };
        };

        const createAggregatedStack = (items: Array<{ invDetails: PlayerInventoryItem; baseDef: GameItemBase }>, stackIdPrefix: string, stackTitle: string, stackType: 'category' | 'itemType' | 'itemLevel', path: string[]): DisplayItem | null => {
            if (items.length === 0) return null;

            let highestLevelItem = items[0].baseDef;
            let totalQuantity = 0;
            let aggCurrentStrength = 0, aggMaxStrength = 0, aggCurrentCharges = 0, aggMaxCharges = 0;

            items.forEach(({ invDetails, baseDef }) => {
                totalQuantity += invDetails.quantity;
                if (baseDef.level > highestLevelItem.level) highestLevelItem = baseDef;
                aggCurrentStrength += (invDetails.currentStrength ?? 0) * invDetails.quantity;
                aggMaxStrength += (baseDef.strength?.max ?? 100) * invDetails.quantity;
                aggCurrentCharges += (invDetails.currentCharges ?? 0) * invDetails.quantity;
                aggMaxCharges += (baseDef.maxCharges ?? 100) * invDetails.quantity;
            });
            const uniqueIdPart = path.join('_') || stackTitle.replace(/\s+/g, '_');
            return {
                id: `${stackIdPrefix}_${uniqueIdPart}`,
                baseItem: null,
                title: stackTitle,
                quantityInStack: totalQuantity,
                imageSrc: highestLevelItem.tileImageSrc || highestLevelItem.imageSrc || FALLBACK_IMAGE_SRC,
                colorVar: ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItem.level] || ITEM_LEVEL_COLORS_CSS_VARS[1],
                levelForVisuals: highestLevelItem.level,
                stackType,
                path,
                dataAiHint: highestLevelItem.dataAiHint || stackTitle.toLowerCase(),
                aggregateCurrentStrength: aggCurrentStrength,
                aggregateMaxStrength: aggMaxStrength,
                aggregateCurrentCharges: aggCurrentCharges,
                aggregateMaxCharges: aggMaxCharges,
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
                        children.push(createIndividualDisplayItem(items[0].invDetails, items[0].baseDef, [...path, items[0].invDetails.id], 0));
                    } else {
                        const stack = createAggregatedStack(items, 'itemType', baseName, 'itemType', [...path, baseName]);
                        if (stack) children.push(stack);
                    }
                });
            } else if (stackType === 'itemType') {
                const [category, baseName] = path;
                const itemsOfExpandedType = inventoryArray.filter(i => i.baseDef.category === category && i.baseDef.name === baseName);
                if (itemsOfExpandedType.length === 1 && itemsOfExpandedType[0].invDetails.quantity === 1) {
                    return [createIndividualDisplayItem(itemsOfExpandedType[0].invDetails, itemsOfExpandedType[0].baseDef, [...path], 0)];
                }
                itemsOfExpandedType.forEach(itemDetails => {
                    if (itemDetails.invDetails.quantity > 1) {
                        const stack = createAggregatedStack([itemDetails], 'itemLevel', itemDetails.baseDef.title || itemDetails.baseDef.name, 'itemLevel', [...path, itemDetails.invDetails.id]);
                        if(stack) children.push(stack);
                    } else {
                        children.push(createIndividualDisplayItem(itemDetails.invDetails, itemDetails.baseDef, [...path, itemDetails.invDetails.id], 0));
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
                 return inventoryArray.flatMap(({invDetails, baseDef}) => 
                    Array.from({length: invDetails.quantity}, (_, i) => createIndividualDisplayItem(invDetails, baseDef, [baseDef.category, baseDef.name, invDetails.id], i))
                 ).sort((a,b) => a.title.localeCompare(b.title));
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
    }, [generateInitialView]);
    
    useEffect(() => {
        if (expandedStackPath.length === 0) {
            setCarouselDisplayItems(generateInitialView());
            return;
        }

        const newDisplayItems: DisplayItem[] = [];
        const currentPathLevel = expandedStackPath.length;
        const expandedStackId = expandedStackPath.join('_');

        const topLevelStacks = generateInitialView();

        if (currentPathLevel === 1) { // Expanding a Category
            const categoryToExpand = expandedStackPath[0];
            const itemsFromExpandedCategory = generateChildrenForItem({ path: [categoryToExpand] } as DisplayItem);
            newDisplayItems.push(...itemsFromExpandedCategory);
            
            const otherTopLevelItems = topLevelStacks.filter(item => item.path[0] !== categoryToExpand);
            newDisplayItems.push(...otherTopLevelItems);

        } else if (currentPathLevel > 1) { // Expanding an Item Type or Level
            const categoryToExpand = expandedStackPath[0];
            const otherTopLevelItems = topLevelStacks.filter(item => item.path[0] !== categoryToExpand);
            
            const categoryItems = generateChildrenForItem({ path: [categoryToExpand] } as DisplayItem);
            const itemTypeToExpand = expandedStackPath[1];
            
            const otherItemsFromCategory = categoryItems.filter(item => item.path[1] !== itemTypeToExpand);
            const itemsFromExpandedType = generateChildrenForItem({ stackType: 'itemType', path: [categoryToExpand, itemTypeToExpand] } as DisplayItem);

            newDisplayItems.push(...itemsFromExpandedType);
            newDisplayItems.push(...otherItemsFromCategory);
            newDisplayItems.push(...otherTopLevelItems);
        }
        
        setCarouselDisplayItems(newDisplayItems.sort((a,b) => a.title.localeCompare(b.title)));

    }, [expandedStackPath, generateChildrenForItem, generateInitialView]);


    useEffect(() => {
        const currentSectionRef = sectionRef.current;
        if (!currentSectionRef) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if(entry.isIntersecting) {
                    resumeRotation();
                } else {
                    stopRotation();
                    if(expandedStackPath.length > 0) setExpandedStackPath([]);
                }
            }, { threshold: 0.1 }
        );
        observer.observe(currentSectionRef);
        return () => { if(currentSectionRef) observer.unobserve(currentSectionRef); };
    }, [expandedStackPath, resumeRotation, stopRotation]);

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
            todOpenedByLockerRef.current = true;
            const allInstances = Object.values(playerInventory)
                .filter(invItem => invItem.id === clickedItem.baseItem!.id)
                .flatMap(invItem =>
                    Array.from({ length: invItem.quantity }, (_, i) => ({...invItem, instanceIndex: i}))
                );

            const displayItemsForSlider = allInstances.map((inst, i) => {
                 const baseDef = getItemById(inst.id);
                 if (!baseDef) return null;
                 let displayTextLabel: string | undefined = undefined;
                 let hasBar = baseDef.category === 'Hardware' || BAR_ITEMS_BY_NAME.has(baseDef.name);

                 if (!hasBar) {
                     if (SINGLE_USE_ITEMS.has(baseDef.name)) displayTextLabel = 'Single Use';
                     else if (baseDef.perUseCost && baseDef.perUseCost > 0) displayTextLabel = `Activation Cost: ${baseDef.perUseCost} ELINT`;
                 }

                 return {
                     id: `${inst.id}_slider_${i}`,
                     baseItem: baseDef,
                     title: baseDef.title || baseDef.name,
                     quantityInStack: 1,
                     imageSrc: baseDef.tileImageSrc || baseDef.imageSrc || FALLBACK_IMAGE_SRC,
                     colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || ITEM_LEVEL_COLORS_CSS_VARS[1],
                     levelForVisuals: baseDef.level,
                     stackType: 'individual',
                     path: clickedItem.path,
                     dataAiHint: baseDef.dataAiHint,
                     displayTextLabel,
                     instanceCurrentStrength: hasBar ? inst.currentStrength : undefined,
                     instanceMaxStrength: hasBar ? baseDef.strength?.max : undefined,
                     instanceCurrentCharges: hasBar ? inst.currentCharges : undefined,
                     instanceMaxCharges: hasBar ? baseDef.maxCharges : undefined,
                 } as DisplayItem;
            }).filter((item): item is DisplayItem => item !== null);

            const initialIndex = displayItemsForSlider.findIndex(d => d.id.startsWith(clickedItem.id));

            openItemSlider(
                "Item Details",
                displayItemsForSlider,
                { type: 'locker', itemLevel: clickedItem.baseItem.level },
            );

        } else if(clickedItem.stackType !== 'individual') {
            setExpandedStackPath(clickedItem.path);
            resumeRotation();
        } else {
             resumeRotation();
        }
    }, [playerInventory, openItemSlider, stopRotation, resumeRotation, getItemById]);

    const dynamicCarouselRadius = useMemo(() => {
        const numItems = carouselDisplayItems.length;
        if (numItems <= 1) return 0;
        if (numItems === 2) return MIN_RADIUS_FOR_TWO_ITEMS;
        const circumference = numItems * (ITEM_WIDTH * CARD_SPACING_FACTOR);
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, circumference / (2 * Math.PI));
    }, [carouselDisplayItems.length]);
    
    const handleOpenSpyShop = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        openSpyShop();
    }, [openSpyShop]);

    const gl = useMemo(() => ({
        powerPreference: "high-performance",
        antialias: true,
        alpha: true,
    }), []);
    
    const interactionState = useRef({
        isDown: false,
        isDragging: false,
        pointerId: null as number | null,
        downTime: 0,
        downCoords: { x: 0, y: 0 },
        lastRotationY: 0,
    }).current;

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (interactionState.isDown) return;
        interactionState.isDown = true;
        interactionState.pointerId = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        stopRotation();

        interactionState.isDragging = false;
        interactionState.downTime = performance.now();
        interactionState.downCoords = { x: e.clientX, y: e.clientY };
        
        const canvas = e.currentTarget.querySelector('canvas');
        if (canvas && canvas.__r3f && canvas.__r3f.scene) {
            const group = canvas.__r3f.scene.getObjectByName('carouselGroup');
            if (group) {
                interactionState.lastRotationY = group.rotation.y;
            }
        }

    }, [interactionState, stopRotation]);
    
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) return;
        const deltaX = e.clientX - interactionState.downCoords.x;
        const deltaY = e.clientY - interactionState.downCoords.y;
        if (!interactionState.isDragging && (deltaX ** 2 + deltaY ** 2) > CLICK_DRAG_THRESHOLD_SQUARED) {
            interactionState.isDragging = true;
        }
        if (interactionState.isDragging && carouselDisplayItems.length > 1) {
            const rotationAmount = deltaX * 0.005;
            const canvas = e.currentTarget.querySelector('canvas');
            if (canvas && canvas.__r3f && canvas.__r3f.scene) {
                const group = canvas.__r3f.scene.getObjectByName('carouselGroup');
                if (group) {
                    group.rotation.y = interactionState.lastRotationY + rotationAmount;
                }
            }
        }
    }, [interactionState, carouselDisplayItems.length]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!interactionState.isDown || e.pointerId !== interactionState.pointerId) return;

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        
        const wasDragging = interactionState.isDragging;
        const dragDuration = performance.now() - interactionState.downTime;

        interactionState.isDown = false;
        interactionState.isDragging = false;
        interactionState.pointerId = null;
        
        if (!wasDragging && dragDuration < CLICK_DURATION_THRESHOLD) {
            const canvas = e.currentTarget.querySelector('canvas');
            if (!canvas || !canvas.__r3f || !canvas.__r3f.scene) { resumeRotation(); return; }

            const { camera, scene, raycaster } = canvas.__r3f;
            if (!camera || !scene || !raycaster) { resumeRotation(); return; }
            
            const rect = canvas.getBoundingClientRect();
            const pointerVector = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            raycaster.setFromCamera(pointerVector, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            if (intersects.length > 0) {
                let obj: THREE.Object3D | null = intersects[0].object;
                while (obj && !obj.userData?.isCarouselItem) obj = obj.parent;
                if (obj?.userData?.isCarouselItem) {
                    handleCarouselItemClick(obj.userData.displayItem);
                    return; 
                }
            }
        }
        
        resumeRotation();

    }, [interactionState, resumeRotation, handleCarouselItemClick]);

    return (
        <div ref={sectionRef} className="flex flex-col items-center justify-center h-full w-full p-4">
            <HolographicPanel
                  className="w-full h-full flex flex-col items-center px-0 py-2 md:py-4 overflow-hidden"
                  explicitTheme={currentGlobalTheme}>
                  <div className="flex-shrink-0 w-full flex items-center justify-between px-2 my-2 md:my-3">
                      <div className="w-9 h-9"></div> 
                      <h2 className="text-xl md:text-2xl font-orbitron holographic-text text-center flex-grow whitespace-nowrap overflow-hidden text-ellipsis px-2">
                          Equipment Locker
                      </h2>
                      <HolographicButton onClick={handleOpenSpyShop} className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}>
                          <ShoppingCart className="w-5 h-5 icon-glow" />
                      </HolographicButton>
                  </div>
                  <div
                      id="locker-carousel-canvas-container"
                      className="w-full flex-grow min-h-0 relative"
                      style={{ cursor: 'grab', touchAction: 'none' }} 
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}>
                      {carouselDisplayItems.length > 0 ? (
                          <Canvas
                              id="locker-carousel-canvas" camera={{ position: [0, 0, CAMERA_BASE_Z_DISTANCE], fov: INITIAL_CAMERA_FOV }}
                              shadows gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}
                              onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }} >
                              <ambientLight intensity={1.2} />
                              <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
                              <pointLight position={[-5, 5, 15]} intensity={1.5} color={pointLightColor} />
                              <pointLight position={[0, -10, 0]} intensity={0.3} />
                              <CameraManager carouselRadius={dynamicCarouselRadius} />
                              <EquipmentCarousel itemsToDisplay={carouselDisplayItems} onItemClick={handleCarouselItemClick} carouselRadius={dynamicCarouselRadius} autoRotateRef={autoRotateRef} />
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
                      {carouselDisplayItems.length > 0 ? "Drag to rotate. Click stack to expand or item for details." : ""}
                  </p>
            </HolographicPanel>
        </div>
    );
};
