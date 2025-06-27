
"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import type { Theme } from '@/contexts/ThemeContext';
import { HolographicInput, HolographicButton } from '@/components/game/shared/HolographicPanel';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface CodenameInputProps {
  explicitTheme?: Theme;
}

export function CodenameInput({ explicitTheme }: CodenameInputProps) {
  const {
    setPlayerSpyName,
    setOnboardingStep,
    closeTODWindow,
    faction, 
    addMessage
  } = useAppContext();
  const [codename, setCodename] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  console.log('[CodenameInput] Rendering. Faction from context:', faction, "Explicit theme received:", explicitTheme);

  useEffect(() => {
    if (faction === 'Observer') {
      toast({ title: "Observation Protocol", description: "Observers do not set codenames. System engaging.", variant: "default" });
      closeTODWindow();
    }
  }, [faction, closeTODWindow, toast]);

  const handleSubmit = async () => {
    setError(null);
    const trimmedCodename = codename.trim();

    if (!trimmedCodename) {
      setError("Codename cannot be empty.");
      return;
    }
    if (trimmedCodename.length < 3 || trimmedCodename.length > 20) {
      setError("Codename must be between 3 and 20 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/.test(trimmedCodename)) {
       setError("Codename can only contain letters, numbers, and single spaces between words.");
       return;
    }

    try {
        await setPlayerSpyName(trimmedCodename); 
        addMessage({ type: 'system', text: `Codename "${trimmedCodename}" registered.`});
        closeTODWindow();
        setOnboardingStep('fingerprint'); // Proceed to fingerprint after codename
    } catch (e) {
        console.error("Error setting player spy name:", e);
        setError("Failed to register codename. Please try again.");
        toast({ title: "Registration Error", description: "Could not save your codename.", variant: "destructive"});
    }
  };

  if (faction === 'Observer') {
    return null; // Don't render anything if faction is Observer (useEffect handles closing)
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4 font-rajdhani">
      <Label htmlFor="codename-input" className="text-sm text-muted-foreground holographic-text">Enter Your Codename:</Label>
      <HolographicInput
        id="codename-input"
        type="text"
        value={codename}
        onChange={(e) => setCodename(e.target.value)}
        className="w-full text-center text-lg"
        maxLength={20}
        explicitTheme={explicitTheme} // Use the theme passed from parent
      />
      {error && <p className="text-xs text-destructive text-center pt-1">{error}</p>}
      
      <p className="text-muted-foreground text-center text-xs leading-relaxed mt-1 mb-3 holographic-text px-2">
        Choose wisely; changing it later might have consequences.
      </p>

      <HolographicButton
        onClick={handleSubmit}
        className="w-full max-w-sm py-3 text-lg"
        disabled={!codename.trim()}
        explicitTheme={explicitTheme} // Use the theme passed from parent
      >
        Register
      </HolographicButton>
    </div>
  );
}
