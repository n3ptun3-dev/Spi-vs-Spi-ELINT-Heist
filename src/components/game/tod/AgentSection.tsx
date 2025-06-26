"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppContext, Faction } from '@/contexts/AppContext';
import { HolographicButton } from '@/components/game/shared/HolographicPanel';
import { Fingerprint, Info, Zap, LockOpen, Lock, Trophy, BookOpen, Power, Brain, Puzzle } from 'lucide-react'; // Added Brain and Puzzle icons
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { Progress } from "@/components/ui/progress";
import { Settings } from 'lucide-react'; // Removed BookOpen, Power as they are imported above
import { ScrollArea } from '@/components/ui/scroll-area';
import { XP_THRESHOLDS } from '@/lib/constants';
import { HardwareItem, InfiltrationGearItem, LockFortifierItem, ITEM_LEVELS, HARDWARE_ITEMS, INFILTRATION_GEAR_ITEMS, ItemLevel } from '@/lib/game-items'; // Import necessary item types and lists


const PEEK_AMOUNT = 20; // Pixels for the screen peek

// --- Sub-Components for PAD Screen Views ---
const AgentDossierView = React.memo(() => {
  const { playerSpyName, playerPiName, faction, playerStats, setFaction: setAppFaction, addMessage } = useAppContext();
  const { theme: currentGlobalTheme } = useTheme();

  const handleFactionChange = useCallback(() => {
    let newFaction: Faction = faction === 'Cyphers' ? 'Shadows' : 'Cyphers';
    if (faction === 'Observer') {
 newFaction = 'Cyphers' as Faction; // Explicitly cast to Faction
        addMessage({ type: 'system', text: `Observer protocol overridden. Faction allegiance protocols engaged. Defaulting to Cyphers.` });
    } else {
        addMessage({ type: 'system', text: `Faction allegiance protocols updated to: ${newFaction}. Coordinating with HQ.` });
    }
    setAppFaction(newFaction);
  }, [faction, setAppFaction, addMessage]);

  const currentLevelXpForDossier = XP_THRESHOLDS[playerStats.level] || 0;
  const nextLevelXpTargetForDossier = XP_THRESHOLDS[playerStats.level + 1] || (XP_THRESHOLDS[XP_THRESHOLDS.length -1] + (XP_THRESHOLDS[XP_THRESHOLDS.length - 1] - XP_THRESHOLDS[XP_THRESHOLDS.length - 2] || 100));
  const xpForCurrentLevelInDossier = playerStats.xp - currentLevelXpForDossier;
  const xpToNextLevelSpanInDossier = nextLevelXpTargetForDossier - currentLevelXpForDossier;
  const xpProgressForDossier = xpToNextLevelSpanInDossier > 0 ? Math.max(0, Math.min(100, (xpForCurrentLevelInDossier / xpToNextLevelSpanInDossier) * 100)) : 100;

  return (
    <ScrollArea className="h-full p-3">
      <h3 className="text-xl font-orbitron mb-4 holographic-text">Agent Dossier</h3>
      <div className="space-y-3 text-sm font-rajdhani">
        <div>
          <p className="font-semibold text-muted-foreground">Agent Identification:</p>
          <p>Code Name: <span className="text-lg text-primary font-semibold">{playerSpyName || "Recruit"}</span></p>
          <p>Pi Name: <span className="text-primary">{playerPiName ? `${playerPiName.substring(0, 3)}***${playerPiName.slice(-2)}` : "CLASSIFIED"}</span></p>
          <p>Agent ID: <span className="text-primary">UID-{playerPiName || "UNKNOWN"}</span></p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Faction Details:</p>
          <p>Current Faction: <span className={`font-semibold cursor-pointer ${faction === 'Cyphers' ? 'text-blue-400 hover:text-blue-300' : faction === 'Shadows' ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-gray-300'}`} onClick={handleFactionChange}>{faction}</span></p>
          <p className="text-xs text-muted-foreground">Faction History: [Placeholder]</p>
          <p className="text-xs text-muted-foreground">Joined: [Date Placeholder]</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Stats & Performance:</p>
          <p>Level: {playerStats.level}</p>
          <Progress value={xpProgressForDossier} className="w-full max-w-[65%] h-1.5 mt-1 bg-primary/20 [&>div]:bg-primary" />
          <p className="text-xs text-muted-foreground">{playerStats.xp} / {nextLevelXpTargetForDossier} XP</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Infiltration Stats:</p>
          <p>Successful Vault Infiltrations: {playerStats.successfulVaultInfiltrations}</p>
          <p>Successful Lock Infiltrations: {playerStats.successfulLockInfiltrations}</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">ELINT Stats (Total):</p>
          <p>Obtained: {playerStats.elintObtainedTotal}</p>
          <p>Lost: {playerStats.elintLostTotal}</p>
          <p>Generated: {playerStats.elintGeneratedTotal}</p>
        </div>
          <div>
          <p className="font-semibold text-muted-foreground">ELINT Stats (This Cycle):</p>
          <p>Obtained: {playerStats.elintObtainedCycle}</p>
          <p>Lost: {playerStats.elintLostCycle}</p>
          <p>Generated: {playerStats.elintGeneratedCycle}</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Transfer Stats:</p>
          <p>All Time ELINT Transferred to HQ: {playerStats.elintTransferred}</p>
          <p>ELINT Transferred to HQ (This Cycle): {playerStats.elintTransferredToHQCyle}</p>
          <p>Successful Interferences: {playerStats.successfulInterferences}</p>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Economy Stats:</p>
          <p>ELINT Spent (Spy Shop): {playerStats.elintSpentSpyShop}</p>
        </div>
      </div>
    </ScrollArea>
  );
});
AgentDossierView.displayName = 'AgentDossierView';

const IntelFilesView = React.memo(() => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { theme: currentGlobalTheme } = useTheme();

  const categories = [
    { id: "briefing", title: "Briefing", heading: "Current Situation & Objectives", content: "Placeholder content for Briefing: Overview of the current game state, active global events, and primary objectives for agents." },
    { id: "assets", title: "Operational Assets", heading: "Currency & Network Tap", content: "Placeholder for Operational Assets: Details on ELINT, how to acquire it, and the functionality of the Network Tap for passive generation." },
    { id: "vault_protocols", title: "Secure Vault Protocols", heading: "Vault & Defense", content: "Placeholder for Secure Vault Protocols: Information on vault security, hardware, fortifiers, and defense strategies." },
    { id: "infiltration_techniques", title: "Infiltration Techniques", heading: "Attacking & Entry", content: "Placeholder for Infiltration Techniques: Guide on entry tools, assault tech, and methods for bypassing vault defenses." },
    { id: "field_ops", title: "Field Operations", heading: "Scanner & Dead Drops", content: "Placeholder for Field Operations: Using the Network Scanner, locating targets, and interacting with Dead Drops for team sharing." },
    { id: "minigames", title: "Mini-Game Protocols", heading: "Infiltration & Transfer", content: "Placeholder for Mini-Game Protocols: Instructions and tips for the Infiltration (vault hacking) and ELINT Transfer minigames." },
    { id: "progression", title: "Progression Matrix", heading: "XP & Leveling", content: "Placeholder for Progression Matrix: How XP is earned, agent level benefits, and the path to becoming an elite operative." },
    { id: "comms_checkin", title: "Comms & Check-In Protocol", heading: "Messages & Daily Rewards", content: "Placeholder for Comms & Check-In Protocol: Understanding the message feed, daily check-in rewards, and team communication." },
    { id: "handbook", title: "Agent Handbook", heading: "Glossary", content: "Placeholder for Agent Handbook: A glossary of common terms, acronyms, and spy jargon used within the Elint Heist universe." },
  ];

  const selectedCategoryData = categories.find(cat => cat.id === activeCategory);

  if (activeCategory && selectedCategoryData) {
    return (
      <div className="p-3 animate-slide-in-right-tod h-full flex flex-col">
        <HolographicButton
          onClick={() => setActiveCategory(null)}
          className="mb-4 !py-1 !px-2 text-xs flex-shrink-0"
          explicitTheme={currentGlobalTheme}
        >
          &larr; Back to Intel Files
        </HolographicButton>
        <h4 className="text-lg font-orbitron mb-2 holographic-text flex-shrink-0">{selectedCategoryData.heading}</h4>
        <ScrollArea className="flex-grow min-h-0">
          <p className="text-muted-foreground whitespace-pre-line font-rajdhani pr-2">{selectedCategoryData.content}</p>
        </ScrollArea>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full p-3">
      <div className="flex items-center mb-4">
        <h3 className="text-xl font-orbitron holographic-text">Intel Files</h3>
      </div>
      <ul className="space-y-1 font-rajdhani">
        {categories.map(cat => (
          <li key={cat.id}>
            <HolographicButton
              className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5 hover:text-green-400 transition-colors"
              onClick={() => setActiveCategory(cat.id)}
              explicitTheme={currentGlobalTheme}
            >
              {cat.title}
            </HolographicButton>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
});
IntelFilesView.displayName = 'IntelFilesView';

const SettingsView = React.memo(() => {
  const { theme: currentGlobalTheme } = useTheme();
  return (
    <ScrollArea className="h-full p-3 font-rajdhani">
      <h3 className="text-xl font-orbitron mb-4 holographic-text">Settings</h3>
      <ul className="space-y-2 text-sm">
        <li><HolographicButton className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5 hover:text-green-400 transition-colors" explicitTheme={currentGlobalTheme}>Notifications (Placeholder)</HolographicButton></li>
        <li><HolographicButton className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5 hover:text-green-400 transition-colors" explicitTheme={currentGlobalTheme}>Sound (Placeholder)</HolographicButton></li>
        <li><HolographicButton className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5 hover:text-green-400 transition-colors" explicitTheme={currentGlobalTheme}>Language (Placeholder)</HolographicButton></li>
        <li><HolographicButton className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5 text-destructive" explicitTheme={currentGlobalTheme}>Delete History (Placeholder)</HolographicButton></li>
      </ul>
    </ScrollArea>
  );
});
SettingsView.displayName = 'SettingsView';

// NEW: TrainingView component
const TrainingView = React.memo(() => {
  const { openMinigame, addMessage } = useAppContext();
  const { theme: currentGlobalTheme } = useTheme();

  const handleStartMinigame = useCallback((lockType: string, lockLevel: ItemLevel, toolType: string) => {
    // Find dummy lock and tool data for the minigame
    const dummyLock = HARDWARE_ITEMS.find(item => item.name === lockType && item.level === lockLevel) as HardwareItem;
    const dummyTool = INFILTRATION_GEAR_ITEMS.find(item => item.name === toolType && item.level === lockLevel) as InfiltrationGearItem;

    if (!dummyLock || !dummyTool) {
      addMessage({ type: 'error', text: `Training scenario data not found for ${lockType} with ${toolType} at L${lockLevel}.` });
      return;
    }

    addMessage({ type: 'system', text: `Initiating training simulation: ${lockType} L${lockLevel} with ${toolType} L${lockLevel}.` });
    openMinigame(dummyLock, dummyTool); // Pass dummy data to openMinigame
  }, [openMinigame, addMessage]);

  return (
    <ScrollArea className="h-full p-3 font-rajdhani">
      <h3 className="text-xl font-orbitron mb-4 holographic-text">Training Simulations</h3>
      <p className="text-muted-foreground mb-4">Select a lock type to begin a training simulation:</p>
      <div className="space-y-2 text-sm">
        <HolographicButton
          className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5"
          explicitTheme={currentGlobalTheme} // Apply green hover effect
          onClick={() => handleStartMinigame('Cypher Lock', 1, 'Pick')}
        >
          Key Cracker: L1 Cypher Lock (w/ L1 Pick)
        </HolographicButton>
        <HolographicButton
          className="w-full justify-start text-left !bg-transparent hover:!bg-primary/10 !py-1.5"
          explicitTheme={currentGlobalTheme} // Apply green hover effect
          onClick={() => handleStartMinigame('Quantum Entanglement Lock', 1, 'Pick')}
        >
          Quantum Circuit Weaver: L1 Quantum Entanglement Lock (w/ L1 Pick)
        </HolographicButton>
        {/* Add more training scenarios as you implement more minigames */}
      </div>
    </ScrollArea>
  );
});
TrainingView.displayName = 'TrainingView';


type PadScreenView = 'dossier' | 'intel' | 'settings' | 'training'; // Added 'training'

interface AgentSectionProps {
  parallaxOffset: number;
}

export function AgentSection({ parallaxOffset }: AgentSectionProps) {
  const { playerSpyName, faction, playerStats, isLoading } = useAppContext();
  const { theme: currentGlobalTheme } = useTheme();

  const [isPadUp, setIsPadUp] = useState(false);
  const [padScreenView, setPadScreenView] = useState<PadScreenView>('dossier');
  const [padButtonPanelHeight, setPadButtonPanelHeight] = useState(60); 
  const [padPeekPlusButtonHeight, setPadPeekPlusButtonHeight] = useState(padButtonPanelHeight + PEEK_AMOUNT);


  const topContentRef = useRef<HTMLDivElement>(null);
  const titleAreaContentRef = useRef<HTMLDivElement>(null);
  const statsAreaRef = useRef<HTMLDivElement>(null);
  const thePadRef = useRef<HTMLDivElement>(null);
  const padButtonPanelRef = useRef<HTMLDivElement>(null);
  const invisibleSpacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (padButtonPanelRef.current) {
      const measuredHeight = padButtonPanelRef.current.offsetHeight;
      if (measuredHeight > 0) {
        setPadButtonPanelHeight(measuredHeight);
      }
    }
  }, []);

  useEffect(() => {
    setPadPeekPlusButtonHeight(padButtonPanelHeight + PEEK_AMOUNT);
  }, [padButtonPanelHeight]);

  // NEW: Intersection Observer to close PAD when it leaves the viewport
  useEffect(() => {
    if (!thePadRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // If the PAD is currently open (isPadUp)
        // AND its top edge is no longer visible (entry.boundingClientRect.top < 0)
        // OR it's not intersecting at all (meaning it has fully scrolled out)
        // then close it.
        if (isPadUp && (entry.boundingClientRect.top < 0 || !entry.isIntersecting)) {
          setIsPadUp(false);
        }
      },
      {
        root: null, // Use the viewport as the root
        threshold: 0 // Trigger when any part of the target enters or leaves the root
      }
    );

    observer.observe(thePadRef.current);

    return () => {
      if (thePadRef.current) {
        observer.unobserve(thePadRef.current);
      }
    };
  }, [isPadUp]); // Re-run this effect if isPadUp changes, to re-evaluate the observation


  const handlePowerClick = useCallback(() => {
    setIsPadUp(prev => !prev);
  }, []);

  const currentLevelXp = XP_THRESHOLDS[playerStats.level] || 0;
  const nextLevelXpTarget = XP_THRESHOLDS[playerStats.level + 1] || (XP_THRESHOLDS[XP_THRESHOLDS.length -1] + (XP_THRESHOLDS[XP_THRESHOLDS.length - 1] - XP_THRESHOLDS[XP_THRESHOLDS.length - 2] || 100));
  const xpForCurrentLevel = playerStats.xp - currentLevelXp;
  const xpToNextLevelSpan = nextLevelXpTarget - currentLevelXp;
  const xpProgress = xpToNextLevelSpan > 0 ? Math.max(0, Math.min(100, (xpForCurrentLevel / xpToNextLevelSpan) * 100)) : 100;

  const renderPadScreenContent = () => {
    switch (padScreenView) {
      case 'dossier': return <AgentDossierView />;
      case 'intel': return <IntelFilesView />;
      case 'settings': return <SettingsView />;
      case 'training': return <TrainingView />; // New case for training
      default: return <AgentDossierView />;
    }
  };
  
  const padDynamicStyle: React.CSSProperties = {
    top: isPadUp ? '0px' : `calc(100% - ${padPeekPlusButtonHeight}px)`,
    height: isPadUp ? '100%' : `${padPeekPlusButtonHeight}px`,
  };

  const currentPadInlineStyle: React.CSSProperties = {
    ...padDynamicStyle,
    // backgroundColor: `hsl(var(--pad-bg-hsl))`, // Opaque themed background
    borderColor: `hsl(var(--pad-border-hsl))`,
    borderRadius: '0.5rem',
    borderWidth: '1px',
    borderStyle: 'solid',
  };

  const buttonPanelInlineStyle: React.CSSProperties = {
    // backgroundColor: `hsl(var(--pad-bg-hsl))`, // Opaque themed background
    borderBottomColor: `hsl(var(--pad-button-panel-separator-hsl))`,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderTopLeftRadius: '0.5rem',
    borderTopRightRadius: '0.5rem',
  };

  const screenWrapperInlineStyle: React.CSSProperties = {
    // backgroundColor: `hsl(var(--pad-bg-hsl))`, // Opaque themed background
    borderBottomLeftRadius: '0.5rem',
    borderBottomRightRadius: '0.5rem',
  };


  if (isLoading && !playerSpyName && playerStats.level === 0) {
    return (
      <div className="relative h-full overflow-hidden flex items-center justify-center">
        <p className="holographic-text text-xl animate-pulse">Loading Agent Data...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden 
      max-w-4xl mx-auto 
      flex flex-col"> {/* AgentSection Root */}
      {/* Static Background Layer (Title + Stats) */}
      <div
        ref={topContentRef}
        className="absolute inset-0 flex flex-col z-10 pointer-events-none" 
      >
        <div
          ref={titleAreaContentRef}
          className="flex-grow flex flex-col items-center justify-center pt-4 md:pt-2 pb-2 text-center relative overflow-hidden group"
        >
          <h1 className="text-3xl md:text-4xl font-orbitron holographic-text">{playerSpyName || "Agent"}</h1>
          {/* Conditional rendering for Fingerprint icon (Observer) or background emblem overlay (Cyphers/Shadows) */}
          {faction === 'Observer' && (
            <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-10">
              <Fingerprint className="w-48 h-48 md:w-64 md:h-64 text-primary icon-glow" />
            </div>
          )}
          <p className={cn(
            "text-lg font-semibold",
            faction === 'Cyphers' ? 'text-blue-400' : faction === 'Shadows' ? 'text-red-400' : 'text-gray-400'
          )}>{faction}</p>
          {/* Overlay for opacity effect on background images */}
          {faction !== 'Observer' && (
            <div className="absolute inset-0 -z-10"
              style={{
                backgroundImage: faction === 'Cyphers' ? 'url(/backgrounds/cyphers_emblem.png)' : faction === 'Shadows' ? 'url(/backgrounds/shadows_emblem.png)' : 'none',
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.7
              }} />
          )}
        </div>
        <div ref={statsAreaRef} className="flex-shrink-0 text-center pt-2 pb-4 px-2">
            <div className="w-full max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Agent Rank: {playerStats.level}</p>
              <Progress value={xpProgress} className="w-full max-w-[65%] h-1.5 mt-1 bg-primary/20 [&>div]:bg-primary mx-auto" />
              <p className="text-xs text-muted-foreground">{xpForCurrentLevel} / {xpToNextLevelSpan} XP ({playerStats.xp} total)</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-sm w-full max-w-md mx-auto font-rajdhani">
              <div>
                <p className="text-muted-foreground">ELINT Reserves</p>
                <p className="font-digital7 text-xl holographic-text">{playerStats.elintReserves}</p>
              </div>
              <div>
                <p className="text-muted-foreground">ELINT Transferred (HQ)</p>
                <p className="font-digital7 text-xl holographic-text">{playerStats.elintTransferred}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-sm font-semibold font-rajdhani text-yellow-400">
                Next Transfer Window:
              </p>
              <p className="font-digital7 text-xl holographic-text">
                02:34:56 {/* Placeholder */}
              </p>
            </div>
        </div>
        {/* Invisible Spacer to reserve space for PAD when off */}
        <div ref={invisibleSpacerRef} className="flex-shrink-0" style={{ height: `${padPeekPlusButtonHeight}px` }} />
      </div>

      {/* The PAD (Absolutely Positioned Sliding Layer) */}
      <div
        ref={thePadRef}
        className={cn(
          "absolute inset-x-0 w-[90%] mx-auto flex flex-col shadow-lg z-20",
          "transition-all duration-500 ease-in-out", 
        )}
        style={currentPadInlineStyle}
      >
        {/* PAD Button Panel */}
        <div
          ref={padButtonPanelRef}
          className={cn(
            "h-[60px] flex-shrink-0 flex items-center justify-between px-4",
            "bg-black/70 rounded-t-lg",
            "pad-gloss-effect"
          )}
            style={buttonPanelInlineStyle}
        >
          {isPadUp ? (
            <div className="flex-grow flex justify-center gap-4">
              <HolographicButton
                onClick={() => setPadScreenView('dossier')}
                className={cn("!p-1.5", padScreenView === 'dossier' && "active-pad-button")}
                aria-label="Agent Dossier"
                explicitTheme={currentGlobalTheme}
              >
                <Info className="w-5 h-5" />
              </HolographicButton>
              <HolographicButton
                onClick={() => setPadScreenView('intel')}
                className={cn("!p-1.5", padScreenView === 'intel' && "active-pad-button")}
                aria-label="Intel Files"
                explicitTheme={currentGlobalTheme}
              >
                <BookOpen className="w-5 h-5" />
              </HolographicButton>
              <HolographicButton
                onClick={() => setPadScreenView('training')}
                className={cn("!p-1.5", padScreenView === 'training' && "active-pad-button")}
                aria-label="Training Simulations"
                explicitTheme={currentGlobalTheme}
              >
                <Brain className="w-5 h-5" />
              </HolographicButton>
              <HolographicButton
                onClick={() => setPadScreenView('settings')}
                className={cn("!p-1.5", padScreenView === 'settings' && "active-pad-button")}
                aria-label="Settings"
                explicitTheme={currentGlobalTheme}
              >
                <Settings className="w-5 h-5" />
              </HolographicButton>
            </div>
          ) : (
            <div className="flex-grow text-center">
              <p className="font-orbitron text-base holographic-text">
                {faction === 'Cyphers' ? "Cypher PAD" : faction === 'Shadows' ? "Shadow PAD" : "Agent PAD"}
              </p>
              <p className="text-xs text-muted-foreground">Personal Assistant Device</p>
            </div>
          )}
          <HolographicButton
            onClick={handlePowerClick}
            className="ml-auto !p-1.5"
            aria-label={isPadUp ? "Close PAD" : "Open PAD"}
            explicitTheme={currentGlobalTheme}
          >
            <Power className={cn("w-5 h-5 icon-glow", isPadUp ? "text-green-400" : "text-red-400")} />
          </HolographicButton>
        </div>

        {/* PAD Screen Area Wrapper */}
        <div
          className={cn(
            "flex-grow min-h-0",
            "bg-black/70 rounded-b-lg", // Slightly darker background color
          )}
          style={screenWrapperInlineStyle} 
        >
          {/* Actual Screen Grid with inset margin */}
          {isPadUp ? (
              <ScrollArea className="h-full w-full pad-screen-grid bg-accent/10 border border-primary/20 rounded-md m-2 pad-gloss-effect">
                {renderPadScreenContent()}
              </ScrollArea>
            ) : (
              <div className={cn(
                "h-full w-full pad-screen-grid bg-accent/10 border border-primary/20 rounded-md m-2",
                `h-[${PEEK_AMOUNT}px]`
              )} > {/* Added closing parenthesis */}
                {/* Peek state, grid shows through, no content */}{/* Add pad-gloss-effect here if needed */}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
