// src/components/game/tod/EquipmentLockerSection.tsx
// MODIFIED BY GEMINI (v35): Removed the getLevelColorVar helper function and
//                           now directly accesses ITEM_LEVEL_COLORS_CSS_VARS
//                           since constants.ts now includes mapping for Level 0.

"use client";

import React, { useRef, useState, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Imports from shared components and contexts ---
import { useAppContext, type GameItemBase, type ItemLevel, type ItemCategory, type PlayerInventoryItem } from '@/contexts/AppContext';
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext'; 
import { ITEM_LEVEL_COLORS_CSS_VARS } from '@/lib/constants'; // Now includes Level 0 mapping
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

// Removed getLevelColorVar helper function, as it's no longer needed.


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
    const [carouselDisplayItems, setCarouselDisplayItems] = useState<DisplayItem[]>([]); // Initialize with an empty array

    const autoRotateRef = useRef(true);

    const ITEM_CARD_RENDER_WIDTH = 256;
    const ITEM_CARD_RENDER_HEIGHT = 427;

    const createIndividualDisplayItem = useCallback((invItem: PlayerInventoryItem, baseDef: GameItemBase): DisplayItem => {
      return {
        id: invItem.id,
        baseItem: baseDef,
        title: baseDef.title || baseDef.name + ' L' + baseDef.level,
        quantityInStack: invItem.quantity,
        imageSrc: baseDef.imageSrc || FALLBACK_IMAGE_SRC,
        // Use direct access since constants.ts now handles ItemLevel 0
 colorVar: ITEM_LEVEL_COLORS_CSS_VARS[baseDef.level] || 'var(--level-1-color)',
        levelForVisuals: baseDef.level,
        stackType: 'individual',
        path: [baseDef.category, baseDef.name, baseDef.level.toString(), invItem.id],
        dataAiHint: baseDef.dataAiHint,
        instanceCurrentStrength: invItem.currentStrength,
        instanceMaxStrength: baseDef.strength?.max,
        instanceCurrentCharges: invItem.currentCharges,
        instanceMaxCharges: baseDef.maxCharges,
        instanceCurrentUses: invItem.currentUses,
        instanceMaxUses: baseDef.maxUses,
        instanceCurrentAlerts: invItem.currentAlerts,
        instanceMaxAlerts: baseDef.maxAlerts,
      };
    }, []);

    const createAggregatedStack = useCallback((items: { invDetails: PlayerInventoryItem; baseDef: GameItemBase }[], stackType: DisplayItem['stackType']): DisplayItem => {
      const firstItem = items[0];
      const aggregatedQuantity = items.reduce((sum, i) => sum + i.invDetails.quantity, 0);

      let aggregateCurrentStrength: number | undefined = undefined;
      let aggregateMaxStrength: number | undefined = undefined;
      let aggregateCurrentCharges: number | undefined = undefined;
      let aggregateMaxCharges: number | undefined = undefined;

      // Only aggregate if items have these properties
      if (items.some(i => i.invDetails.currentStrength !== undefined)) {
        aggregateCurrentStrength = items.reduce((sum, i) => sum + (i.invDetails.currentStrength ?? 0), 0);
        aggregateMaxStrength = items.reduce((sum, i) => sum + (i.baseDef.strength?.max ?? 0), 0);
      }
      if (items.some(i => i.invDetails.currentCharges !== undefined)) {
        aggregateCurrentCharges = items.reduce((sum, i) => sum + (i.invDetails.currentCharges ?? 0), 0);
        aggregateMaxCharges = items.reduce((sum, i) => sum + (i.baseDef.maxCharges ?? 0), 0);
      }
      // Note: currentUses and currentAlerts are typically for individual items only, not aggregated.

      let title: string;
      let imageSrc: string;
      let colorVar: string;
      let levelForVisuals: ItemLevel;
      let path: string[];
      let dataAiHint: string | undefined;

      switch (stackType) {
        case 'category':
          title = `${firstItem.baseDef.category} Items`;
          imageSrc = APP_SHOP_CATEGORIES.find(cat => cat.id === firstItem.baseDef.category)?.iconImageSrc || FALLBACK_IMAGE_SRC;
          // Use the highest level item's color for category stack, or Level 1 as fallback
          const highestLevelItemCategory = items.reduce((prev, current) =>
              (prev.baseDef.level > current.baseDef.level ? prev : current)
          );
          // Use direct access for color since constants.ts now handles ItemLevel 0
          colorVar = ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItemCategory.baseDef.level] || 'var(--level-1-color)';
          levelForVisuals = highestLevelItemCategory.baseDef.level;
          path = [firstItem.baseDef.category];
          dataAiHint = `${firstItem.baseDef.category} overview`;
          break;
        case 'itemType':
          const baseName = firstItem.baseDef.name.replace(/ L\d+$/, ''); // Remove level suffix
          title = `${baseName} (All Levels)`;
          imageSrc = firstItem.baseDef.tileImageSrc || firstItem.baseDef.imageSrc || FALLBACK_IMAGE_SRC;
          // Use the highest level item's color for itemType stack
          const highestLevelItemType = items.reduce((prev, current) =>
              (prev.baseDef.level > current.baseDef.level ? prev : current)
          );
          // Use direct access for color since constants.ts now handles ItemLevel 0
          colorVar = ITEM_LEVEL_COLORS_CSS_VARS[highestLevelItemType.baseDef.level] || 'var(--level-1-color)';
          levelForVisuals = highestLevelItemType.baseDef.level;
          path = [firstItem.baseDef.category, baseName];
          dataAiHint = `${baseName} overview`;
          break;
        case 'itemLevel':
          title = `${firstItem.baseDef.name} L${firstItem.baseDef.level} (x${aggregatedQuantity})`;
          imageSrc = firstItem.baseDef.tileImageSrc || firstItem.baseDef.imageSrc || FALLBACK_IMAGE_SRC;
          // Use direct access for color since constants.ts now handles ItemLevel 0
          colorVar = ITEM_LEVEL_COLORS_CSS_VARS[firstItem.baseDef.level] || 'var(--level-1-color)';
          levelForVisuals = firstItem.baseDef.level;
          path = [firstItem.baseDef.category, firstItem.baseDef.name.replace(/ L\d+$/, ''), firstItem.baseDef.level.toString()];
          dataAiHint = `${firstItem.baseDef.name} level ${firstItem.baseDef.level} stack`;
          break;
        default:
          title = "Unknown Stack";
          imageSrc = FALLBACK_IMAGE_SRC;
          colorVar = 'var(--level-1-color)';
          levelForVisuals = 1 as ItemLevel;
          path = [];
          dataAiHint = "unknown item stack";
          break;
      }

      return {
        id: `agg-${stackType}-${firstItem.baseDef.id.split('_l')[0]}-${firstItem.baseDef.level}`, // Example ID for aggregated item
        baseItem: null, // Aggregated items don't have a single base item
        title,
        quantityInStack: aggregatedQuantity,
        imageSrc,
        colorVar,
        levelForVisuals,
        stackType,
        path,
        dataAiHint,
        aggregateCurrentStrength,
        aggregateMaxStrength,
        aggregateCurrentCharges,
        aggregateMaxCharges,
      };
    }, []);
    

    const currentViewPath = useRef<string[]>([]);
    const [currentViewTitle, setCurrentViewTitle] = useState("Equipment Locker");

    const navigateToView = useCallback((path: string[]) => {
      autoRotateRef.current = true; // Always resume auto-rotate on navigation
      console.log("Navigating to view:", path);
      currentViewPath.current = path;
      updateCarouselItems(); // Trigger update based on new path
    }, []);

    const navigateBack = useCallback(() => {
      autoRotateRef.current = true; // Always resume auto-rotate on navigation
      if (currentViewPath.current.length > 0) {
        const newPath = currentViewPath.current.slice(0, -1);
        currentViewPath.current = newPath;
        updateCarouselItems(); // Trigger update
      }
    }, []);

    const onItemClick = useCallback((displayItem: DisplayItem) => {
      console.log("Item clicked:", displayItem);
      autoRotateRef.current = false; // Pause auto-rotate on click
      if (displayItem.stackType === 'individual') {
        openTODWindow(
          displayItem.title,
          <div className="flex flex-col items-center p-4 text-center">
            <h3 className="text-xl font-bold mb-2">{displayItem.title}</h3>
            <img src={displayItem.imageSrc} alt={displayItem.title} className="w-32 h-32 object-contain mb-4" />
            <p className="text-sm text-muted-foreground mb-1">{displayItem.baseItem?.description}</p>
            <p className="text-xs text-muted-foreground mb-1">Level: {displayItem.levelForVisuals}</p>
            <p className="text-xs text-muted-foreground mb-4">Quantity: {displayItem.quantityInStack}</p>
            {displayItem.instanceCurrentStrength !== undefined && displayItem.instanceMaxStrength !== undefined && (
              <p className="text-xs text-muted-foreground">Strength: {displayItem.instanceCurrentStrength}/{displayItem.instanceMaxStrength}</p>
            )}
            {displayItem.instanceCurrentCharges !== undefined && displayItem.instanceMaxCharges !== undefined && (
              <p className="text-xs text-muted-foreground">Charges: {displayItem.instanceCurrentCharges}/{displayItem.instanceMaxCharges}</p>
            )}
             {displayItem.instanceCurrentUses !== undefined && displayItem.instanceMaxUses !== undefined && (
              <p className="text-xs text-muted-foreground">Uses: {displayItem.instanceCurrentUses}/{displayItem.instanceMaxUses}</p>
            )}
             {displayItem.instanceCurrentAlerts !== undefined && displayItem.instanceMaxAlerts !== undefined && (
              <p className="text-xs text-muted-foreground">Alerts: {displayItem.instanceCurrentAlerts}/{displayItem.instanceMaxAlerts}</p>
            )}
          </div>
        );
      } else {
        navigateToView(displayItem.path);
      }
    }, [openTODWindow, navigateToView]);


    const calculateCarouselRadius = useCallback((numItems: number) => {
        if (numItems === 0) return 0;
        if (numItems === 1) return 0.01; // Small non-zero radius for single item to be in center
        
        // Calculate the circumference needed for items to be spaced out
        // ITEM_WIDTH * CARD_SPACING_FACTOR gives us the desired arc length per item
        const circumference = numItems * (ITEM_WIDTH * CARD_SPACING_FACTOR);
        const radius = circumference / (2 * Math.PI);
        return Math.max(MIN_RADIUS_FOR_TWO_ITEMS, radius);
    }, []);

    const updateCarouselItems = useCallback(() => {
      console.log("Updating carousel items for path:", currentViewPath.current);
      const inventoryArray = Object.values(playerInventory);
      let itemsForCurrentView: DisplayItem[] = [];
      let newTitle = "Equipment Locker";

      if (currentViewPath.current.length === 0) {
        // Root view: Group by category
        newTitle = "Equipment Locker";
        const categories = new Set<ItemCategory>();
        inventoryArray.forEach(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id);
          if (baseDef) categories.add(baseDef.category);
        });

        itemsForCurrentView = Array.from(categories).map(category => {
          const categoryItems = inventoryArray.filter(invItem => {
            const baseDef = getBaseItemByIdFromGameItems(invItem.id);
            return baseDef && baseDef.category === category;
          }).map(invItem => ({ invDetails: invItem, baseDef: getBaseItemByIdFromGameItems(invItem.id)! })); // ! because filter ensures baseDef exists
          
          if (categoryItems.length > 0) {
            return createAggregatedStack(categoryItems, 'category');
          }
          return null;
        }).filter(Boolean) as DisplayItem[];

      } else if (currentViewPath.current.length === 1) {
        // Category view: Group by itemType within category
        const selectedCategory = currentViewPath.current[0] as ItemCategory;
        newTitle = selectedCategory;
        const itemTypes = new Set<string>(); // Base names without level
        inventoryArray.filter(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id);
          return baseDef && baseDef.category === selectedCategory;
        }).forEach(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id)!;
          itemTypes.add(baseDef.name.replace(/ L\d+$/, ''));
        });

        itemsForCurrentView = Array.from(itemTypes).map(itemType => {
          const typeItems = inventoryArray.filter(invItem => {
            const baseDef = getBaseItemByIdFromGameItems(invItem.id);
            return baseDef && baseDef.category === selectedCategory && baseDef.name.replace(/ L\d+$/, '') === itemType;
          }).map(invItem => ({ invDetails: invItem, baseDef: getBaseItemByIdFromGameItems(invItem.id)! }));
          
          if (typeItems.length > 0) {
            return createAggregatedStack(typeItems, 'itemType');
          }
          return null;
        }).filter(Boolean) as DisplayItem[];

      } else if (currentViewPath.current.length === 2) {
        // ItemType view: Group by itemLevel within itemType
        const selectedCategory = currentViewPath.current[0] as ItemCategory;
        const selectedItemType = currentViewPath.current[1];
        newTitle = selectedItemType;

        const itemLevels = new Set<ItemLevel>();
        inventoryArray.filter(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id);
          return baseDef && baseDef.category === selectedCategory && baseDef.name.replace(/ L\d+$/, '') === selectedItemType;
        }).forEach(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id)!;
          itemLevels.add(baseDef.level);
        });

        itemsForCurrentView = Array.from(itemLevels).sort((a, b) => a - b).map(level => {
          const levelItems = inventoryArray.filter(invItem => {
            const baseDef = getBaseItemByIdFromGameItems(invItem.id);
            return baseDef && baseDef.category === selectedCategory && baseDef.name.replace(/ L\d+$/, '') === selectedItemType && baseDef.level === level;
          }).map(invItem => ({ invDetails: invItem, baseDef: getBaseItemByIdFromGameItems(invItem.id)! }));
          
          if (levelItems.length > 0) {
            return createAggregatedStack(levelItems, 'itemLevel');
          }
          return null;
        }).filter(Boolean) as DisplayItem[];

      } else if (currentViewPath.current.length === 3) {
        // ItemLevel view: Show individual items
        const selectedCategory = currentViewPath.current[0] as ItemCategory;
        const selectedItemType = currentViewPath.current[1];
        const selectedLevel = parseInt(currentViewPath.current[2], 10) as ItemLevel;
        newTitle = `${selectedItemType} L${selectedLevel}`;

        itemsForCurrentView = inventoryArray.filter(invItem => {
          const baseDef = getBaseItemByIdFromGameItems(invItem.id);
          return baseDef && baseDef.category === selectedCategory && baseDef.name.replace(/ L\d+$/, '') === selectedItemType && baseDef.level === selectedLevel;
        }).map(invItem => {
            const baseDef = getBaseItemByIdFromGameItems(invItem.id)!;
            return createIndividualDisplayItem(invItem, baseDef);
        });
      }
      
      setCurrentViewTitle(newTitle);
      setCarouselDisplayItems(itemsForCurrentView);
    }, [playerInventory, createIndividualDisplayItem, createAggregatedStack]);


    // Initial load and whenever playerInventory changes
    useEffect(() => {
      updateCarouselItems();
    }, [playerInventory, updateCarouselItems]);

    const carouselRadius = useMemo(() => calculateCarouselRadius(carouselDisplayItems.length || INITIAL_CAROUSEL_TARGET_COUNT), [carouselDisplayItems.length, calculateCarouselRadius]);

    const handleOpenSpyShop = useCallback(() => {
        console.log('Shop button clicked in EquipmentLockerSection. Opening Spy Shop.');
        openSpyShop();
    }, [openSpyShop]);

    return (
        <div className="relative w-full max-w-full lg:max-w-4xl xl:max-w-6xl mx-auto min-h-[500px] sm:min-h-[600px] flex items-center justify-center p-2 z-10">
            {/* Outward Border Glow Container */}
            <div className="absolute inset-0 rounded-2xl p-px z-[11]" style={{
                background: `linear-gradient(to bottom right, ${ITEM_LEVEL_COLORS_CSS_VARS[1]} 0%, transparent 50%, ${ITEM_LEVEL_COLORS_CSS_VARS[5]} 100%)`,
                filter: `blur(15px) opacity(0.7)`, // Outward glow
                pointerEvents: 'none',
            }} />
            
            {/* Main Holographic Panel */}
            <HolographicPanel
                className="relative w-full h-[500px] sm:h-[600px] flex flex-col items-center justify-start overflow-hidden rounded-2xl z-10"
                // No direct background color here, let HolographicPanel manage it
            >
                {/* Background Layer with inner glow effect */}

                <div className="absolute inset-0 rounded-2xl z-[1] flex items-center justify-center"
                    style={{
                        backgroundColor: '#0D1117', // Dark background for content
                        boxShadow: `inset 0 0 10px hsla(var(--primary-hsl), 0.5), inset 0 0 20px hsla(var(--accent-hsl), 0.3)`, // Inner glow
                    }}
                >
                    {/* Optional subtle yellow blurry glow behind the dark background */}
                    <div className="absolute inset-0 rounded-2xl" style={{
                        background: `radial-gradient(circle at center, hsla(var(--accent-hsl), 0.1) 0%, transparent 70%)`,
                        filter: 'blur(50px)',
                    }}></div>
                </div>


                {/* Layer 2: Carousel Content & Controls */}
                <div className="relative flex-grow w-full z-10 flex flex-col justify-between items-center p-3">
                    {/* Navigation Buttons */}
                    <div className="w-full flex justify-between items-center mb-2 px-4">
                        {currentViewPath.current.length > 0 ? (
                            <HolographicButton onClick={navigateBack} explicitTheme={currentGlobalTheme}>
                                &lt; Back
                            </HolographicButton>
                        ) : <div className="w-[80px]"></div>} {/* Placeholder for alignment */}
                        
                        <h3 className="text-xl font-orbitron holographic-text text-center flex-grow mx-2">
                           {currentViewTitle}
                        </h3>
                        <div className="w-[80px]"></div> {/* Placeholder for alignment */}
                    </div>

                    {/* 3D Carousel Area */}
                    <div id="locker-carousel-canvas-container" className="flex-grow w-full relative min-h-[300px] lg:min-h-[400px]">
                        {carouselDisplayItems.length > 0 ? (
                            <Canvas camera={{ fov: INITIAL_CAMERA_FOV, position: [0, 0, CAMERA_BASE_Z_DISTANCE] }}
                                className="!rounded-lg" // Apply rounded corners to the canvas
                            >
                                <ambientLight intensity={0.8} />
                                <pointLight position={[10, 10, 10]} />
                                <CameraManager carouselRadius={carouselRadius} />
                                <EquipmentCarousel
                                    itemsToDisplay={carouselDisplayItems}
                                    onItemClick={onItemClick}
                                    carouselRadius={carouselRadius}
                                    autoRotateRef={autoRotateRef}
                                />
                                <Resizer />
                            </Canvas>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center p-4">
                                <p className="text-lg">Your locker is empty, Agent.</p>
                                <p className="text-muted-foreground text-sm">Visit the Spy Shop or Check In with HQ.</p>
                            </div>
                        )}
                    </div>

                    {/* Layer 3: Header Overlay - absolute to sit on top of carousel content */}
                    <div className="absolute top-0 left-0 w-full z-20 flex items-center justify-between p-3 md:p-4"> 
                        <h2 className="text-2xl font-orbitron holographic-text">
                            Equipment Locker
                        </h2>
                        <HolographicButton onClick={handleOpenSpyShop} className="!p-2" aria-label="Open Spy Shop" explicitTheme={currentGlobalTheme}>
                            <ShoppingCart className="w-5 h-5 icon-glow" />
                        </HolographicButton>
                    </div>  

                    {/* Layer 3: Bottom Text Area Overlay - absolute to sit on top of carousel content */}
                    <p className="absolute bottom-0 left-0 w-full z-20 text-center text-xs text-muted-foreground p-3 md:p-4">
                        {carouselDisplayItems.length > 0 ? "Drag to rotate. Click stack to expand or item for details." : ""}
                    </p>
                </div> {/* Closes "Layer 2: Carousel Content & Controls" (div from L642) */}
            </HolographicPanel>
        </div> {/* Closes "Main container" (div from L616) */}
    );
};
