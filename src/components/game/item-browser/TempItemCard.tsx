// src/components/game/item-browser/ItemCard.tsx
"use client";

import React from 'react';
// Removed unused imports for a cleaner test component

// Define a minimal ItemCardProps interface for the test component
interface ItemCardProps {
    // We don't need all the complex props for a simple test card
    // but keeping a placeholder for displayItem and context if needed
    displayItem?: any; 
    context?: any;
    onClose?: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = () => {
    return (
        // The main container for the card.
        // `w-full` and `h-full` make it fill its parent container.
        // `bg-gray-700` for the grey background.
        // `border-4` for the border width.
        // `border-green-500` for the green color.
        // `border-dotted` for the dotted style.
        // `rounded-xl` for nice rounded corners.
        <div 
            className="w-full h-full bg-gray-700 border-4 border-green-500 border-dotted rounded-xl
                       flex items-center justify-center text-white text-2xl font-bold"
        >
            {/* Simple text to indicate it's the test card */}
            <p>Test Item Card</p>
        </div>
    );
};
