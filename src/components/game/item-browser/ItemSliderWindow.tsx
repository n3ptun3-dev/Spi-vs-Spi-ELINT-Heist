// src/components/game/item-browser/ItemSliderWindow.tsx
"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemCard } from './ItemCard';
import type { DisplayItem } from '@/components/game/tod/CardTextureRenderer';
import { HolographicButton } from '../shared/HolographicPanel';

export type ItemWindowContext =
  | { type: 'locker'; itemLevel: number }
  | { type: 'deploy_nexus'; vaultSlotId: string }
  | { type: 'deploy_lock'; vaultSlotId: string }
  | { type: 'upgrade_lock'; vaultSlotId: string; currentLock: DisplayItem }
  | { type: 'infiltrate'; opponentVaultId: string };

interface ItemSliderWindowProps {
  isOpen: boolean;
  onClose: () => void;
  items: DisplayItem[];
  context: ItemWindowContext;
  initialIndex?: number;
}

export const ItemSliderWindow: React.FC<ItemSliderWindowProps> = ({
  isOpen,
  onClose,
  items,
  context,
  initialIndex = 0,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && sliderRef.current) {
      // Set initial scroll position without animation
      const container = sliderRef.current;
      const cardWidth = container.offsetWidth;
      container.scrollLeft = cardWidth * initialIndex;
    }
  }, [isOpen, initialIndex]);

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-md"
        >
          {/* Main container for the slider */}
          <div
            ref={sliderRef}
            className="item-slider-container w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex"
          >
            {items.length > 0 ? (
              items.map((item, index) => (
                <div key={item.id} className="item-slider-card snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
                  <ItemCard displayItem={item} context={context} onClose={onClose} />
                </div>
              ))
            ) : (
              <div className="item-slider-card snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
                 <div className="flex flex-col items-center justify-center text-center p-8">
                    <p className="holographic-text text-xl font-orbitron mb-4">No compatible items available.</p>
                    <p className="text-muted-foreground mb-6">Your inventory lacks the required gear for this action.</p>
                    <HolographicButton onClick={() => { /* TODO: open spy shop */ }}>
                        Visit the Spy Shop
                    </HolographicButton>
                </div>
              </div>
            )}
          </div>

          {/* Floating Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-[9999] p-2 rounded-full bg-black/50 text-white hover:bg-white/20 transition-colors"
            aria-label="Close item viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};