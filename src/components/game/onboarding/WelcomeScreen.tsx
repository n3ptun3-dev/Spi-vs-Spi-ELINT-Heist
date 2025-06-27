
"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext, type Faction } from '@/contexts/AppContext';
import { FIXED_DEV_PI_ID } from '@/contexts/AppContext'; // Import the fixed ID
import { HolographicButton, HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wifi, UserCheck, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WelcomeScreen() {
  const {
    setOnboardingStep,
    attemptLoginWithPiId,
    handleAuthentication,
    addMessage,
  } = useAppContext();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuthenticate = async () => {
    addMessage({ type: 'system', text: 'Initiating Pi Network Authentication...' });
    await attemptLoginWithPiId(FIXED_DEV_PI_ID); // Use the imported fixed Pi ID
  };

  const handleProceedAsObserver = async () => {
    addMessage({ type: 'system', text: 'Engaging Observer protocol...' });
    await handleAuthentication("mock_observer_id_" + Date.now(), 'Observer');
  };


  if (!showContent) {
    return (
      <div className="flex flex-col flex-grow items-center justify-center text-center">
        <Wifi className="w-16 h-16 md:w-20 md:h-20 text-primary animate-pulse icon-glow" />
        <p className="mt-4 text-xl font-orbitron holographic-text">Establishing Secure Connection...</p>
      </div>
    );
  }

  return (
    <HolographicPanel
      className="w-full max-w-2xl mx-auto p-4 md:p-6 flex flex-col flex-grow h-0 overflow-hidden"
      explicitTheme="terminal-green"
    >
      <h1 className="text-3xl md:text-4xl font-orbitron mb-2 text-center holographic-text flex-shrink-0">
        Welcome to <br />Spi vs Spi
      </h1>
      
      <HolographicButton
        id="authenticate-button"
        className="w-full text-lg py-3 mt-auto flex-shrink-0 mb-3"
        onClick={handleAuthenticate}
      >
        <UserCheck className="w-5 h-5 mr-2" /> Authenticate with Pi
      </HolographicButton>
      
      <HolographicButton
        id="observer-button"
        variant="ghost"
        className="w-full text-sm py-2 flex-shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleProceedAsObserver}
      >
        <Eye className="w-4 h-4 mr-2" /> Proceed as Observer
      </HolographicButton>

    </HolographicPanel>
  );
}
