// src/components/game/item-browser/ItemSliderInTOD.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ItemCard } from './ItemCard';
import type { DisplayItem } from '@/contexts/AppContext';
import type { ItemWindowContext } from '@/contexts/AppContext';
import { HolographicButton } from '../shared/HolographicPanel';
import { useAppContext } from '@/contexts/AppContext';

interface ItemSliderInTODProps {
  items: DisplayItem[];
  context: ItemWindowContext;
  initialIndex?: number;
  onClose: () => void;
}

export const ItemSliderInTOD: React.FC<ItemSliderInTODProps> = ({
  items,
  context,
  initialIndex = 0,
  onClose,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const { openSpyShop } = useAppContext();

  useEffect(() => {
    if (sliderRef.current) {
      // Set initial scroll position without animation
      const container = sliderRef.current;
      const cardWidth = container.offsetWidth; // This is the width of the scroll container
      container.scrollLeft = cardWidth * initialIndex;
    }
  }, [initialIndex]);

  const handleVisitShop = () => {
    onClose(); // Close the current TOD
    openSpyShop(); // Open the spy shop
  };

  return (
    <div className="w-full h-full flex flex-col">
      {items.length > 0 ? (
        <div
          ref={sliderRef}
          className="item-slider-container w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex items-center"
        >
          {items.map((item) => (
            <div key={item.id} className="item-slider-card snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
              <ItemCard displayItem={item} context={context} onClose={onClose} />
            </div>
          ))}
        </div>
      ) : (
        <div className="item-slider-card snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
           <div className="flex flex-col items-center justify-center text-center p-8">
              <p className="holographic-text text-xl font-orbitron mb-4">No compatible items available.</p>
              <p className="text-muted-foreground mb-6">Your inventory lacks the required gear for this action.</p>
              <HolographicButton onClick={handleVisitShop}>
                  Visit the Spy Shop
              </HolographicButton>
          </div>
        </div>
      )}
    </div>
  );
};
