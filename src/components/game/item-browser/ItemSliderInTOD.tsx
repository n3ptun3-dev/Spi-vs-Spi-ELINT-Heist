// src/components/game/item-browser/ItemSliderInTOD.tsx
"use client";

import React from 'react';
import { ItemCard } from './ItemCard';
import type { DisplayItem } from '@/contexts/AppContext';
import type { ItemWindowContext } from '@/contexts/AppContext';
import { HolographicButton } from '../shared/HolographicPanel';
import { useAppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ItemSliderInTODProps {
  items: DisplayItem[];
  context: ItemWindowContext;
  onClose: () => void;
}

export const ItemSliderInTOD: React.FC<ItemSliderInTODProps> = ({
  items,
  context,
  onClose,
}) => {
  const { openSpyShop } = useAppContext();

  const handleVisitShop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(); 
    openSpyShop(); 
  };

  return (
    <div className="w-full h-full flex flex-col p-0">
      {items.length > 0 ? (
        <ScrollArea className="w-full h-full whitespace-nowrap">
            <div className="flex h-full items-center space-x-4 py-2">
                {items.map((item) => (
                    <div key={item.id} className="h-[323px] w-[215px] flex-shrink-0">
                        <ItemCard displayItem={item} context={context} onClose={onClose} />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
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
