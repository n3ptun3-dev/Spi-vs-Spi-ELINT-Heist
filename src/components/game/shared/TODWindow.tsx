// src/components/game/item-browser/TODWindow.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Theme } from '@/contexts/ThemeContext';
import { HolographicPanel } from './HolographicPanel';

interface TODWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'large';
  explicitTheme?: Theme;
  themeVersion?: number; // To help ensure re-render when theme changes
  showCloseButton?: boolean;
}

export function TODWindow({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  explicitTheme,
  themeVersion,
  showCloseButton = true,
}: TODWindowProps) {
  // shouldRender controls whether the component (and its content) is mounted in the DOM
  const [shouldRender, setShouldRender] = useState(isOpen); // Initialize based on isOpen
  // isAnimating controls whether the slide-in/out CSS animation classes are applied
  const [isAnimating, setIsAnimating] = useState(false);
  // Ref to get the latest isOpen prop value inside handleAnimationEnd
  const isOpenRef = useRef(isOpen);

  // Keep the ref updated with the latest isOpen prop
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Effect to manage shouldRender and isAnimating based on the isOpen prop
  useEffect(() => {
    if (isOpen) {
      // When opening, ensure the component is rendered
      setShouldRender(true);

      // Use setTimeout with 0ms to defer setting isAnimating to the next tick.
      // This ensures shouldRender has been processed and the component is "ready"
      // in the DOM for the animation class to be applied.
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 0);
      return () => clearTimeout(timer); // Cleanup the timeout if component unmounts or isOpen changes again
    } else { // isOpen is false, means we want to close
      // Only start the close animation if the component is currently rendered AND not already animating out
      if (shouldRender && !isAnimating) {
        setIsAnimating(true); // Trigger the exit animation
      }
    }
  }, [isOpen, isAnimating, shouldRender]); // Dependencies for this effect

  // Callback for when the CSS animation ends
  const handleAnimationEnd = () => {
    setIsAnimating(false); // The animation has truly finished

    // If the window was meant to be closed (isOpenRef.current is false)
    if (!isOpenRef.current) {
      setShouldRender(false); // Now, and only now, unmount the component's visible parts
    }
  };

  const effectiveTheme = explicitTheme || 'terminal-green';

  // The main container for the backdrop blur. It will appear/disappear instantly.
  const containerClasses = cn(
    "fixed inset-0 z-[9999] flex items-center justify-center",
    "backdrop-blur-sm", // Apply backdrop blur directly
    // Control its visibility instantly based on shouldRender state
    shouldRender ? "opacity-100" : "opacity-0", // Instant opacity change
    // Hide and disable pointer events when fully closed and not animating
    (!shouldRender && !isAnimating) && "pointer-events-none hidden"
  );

  // If shouldRender is false AND it's not animating, completely unmount the component from the DOM.
  if (!shouldRender && !isAnimating && !isOpen) {
    return null;
  }

  return (
    <div
      className={containerClasses}
      onClick={showCloseButton ? onClose : undefined} // Click outside to close (if close button visible)
      aria-hidden={!isOpen && !isAnimating} // Accessibility for screen readers
    >
      <HolographicPanel
        key={`${effectiveTheme}-${themeVersion}-window-panel`}
        className={cn(
          "relative m-4 flex flex-col z-[10000]", // HolographicPanel needs to be relative for its children
          "w-[calc(100vw-80px)] max-w-[600px]",
          "h-[calc(100vh-100px)] max-h-[600px]",
          "bg-black/70", // <-- Apply 70% black background directly to HolographicPanel
          // Apply animation class based on whether it's opening or closing animation
          isOpen ? "animate-slide-in-right-tod" : isAnimating ? "animate-slide-out-right-tod" : "",
        )}
        onClick={(e) => e.stopPropagation()} // Prevent clicks on panel from closing the window
        explicitTheme={effectiveTheme}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* The content divs are now directly inside HolographicPanel */}
        <div className={cn(
            "flex-shrink-0 flex items-center justify-between pb-2 mb-2 border-b",
            "border-current opacity-50"
          )}
        >
          <h2 className="text-xl font-orbitron text-foreground holographic-text">
            {title}
          </h2>
          {showCloseButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className={cn("p-1 text-muted-foreground hover:text-foreground")}
              aria-label="Close window"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* This is the key change: removed the fixed height calculation */}
        {/* Now, this div will simply flex-grow to fill available space */}
        <div className="flex-grow min-h-0 overflow-y-auto scrollbar-hide">
            {children}
        </div>
      </HolographicPanel>
    </div>
  );
}
