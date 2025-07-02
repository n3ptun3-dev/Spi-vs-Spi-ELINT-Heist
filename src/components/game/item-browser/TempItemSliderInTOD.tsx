// src/components/game/item-browser/TempItemSliderInTOD.tsx
"use client";

import React from 'react';
import { ItemCard } from './ItemCard'; // Import the new temporary card
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // Assuming these are from shadcn/ui

interface ItemSliderInTODProps {
  // No props needed for this temp version, we'll hardcode some items
}

export const TempItemSliderInTOD: React.FC<TempItemSliderInTODProps> = () => {
  // Hardcoded dummy items for testing purposes
  const dummyItems = [
    { id: '1', title: 'Tiny Card', description: 'This card should be small.', color: '#FF0000' },
    { id: '2', title: 'Medium Card', description: 'This one is just right.', color: '#00FF00' },
    { id: '3', title: 'Tall Card', description: 'This card has a bit more text to test height.', color: '#0000FF' },
    { id: '4', title: 'Another Card', description: 'Just for good measure.', color: '#FFFF00' },
    { id: '5', title: 'Last Card', description: 'The final test subject.', color: '#00FFFF' },
  ];

  return (
    <div className="w-full h-screen flex flex-col p-4 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4 text-center">Temp Item Slider for Debugging</h1>
      <div className="flex-grow flex flex-col items-center justify-center">
        {/* This div is the blue-bordered container. It now uses flex-col to properly manage its children's height. */}
        <div className="w-full h-[300px] max-h-[50vh] border-2 border-dashed border-blue-500 rounded-lg p-2 flex flex-col">
          {/* The paragraph is now flex-shrink-0 so it doesn't take up too much space */}
          <p className="text-center text-blue-300 mb-2 flex-shrink-0">This is your slider container (should be 300px tall or 50vh)</p>
          {/* The ScrollArea now uses flex-grow to take up all remaining vertical space */}
          <ScrollArea className="w-full flex-grow whitespace-nowrap">
            <div className="flex space-x-4 h-full py-2 px-2 items-center"> {/* h-full here ensures cards fill the ScrollArea's height */}
              {dummyItems.map((item) => (
                <div key={item.id} className="h-full inline-block flex-shrink-0 w-[80vw] max-w-[320px] border border-green-500 rounded-lg">
                  <TempItemCard title={item.title} description={item.description} color={item.color} />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};
