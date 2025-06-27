
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HolographicPanel } from '@/components/game/shared/HolographicPanel';
import { useTheme } from '@/contexts/ThemeContext';

export function FingerprintScannerScreen() {
  const { setOnboardingStep, faction, playerSpyName } = useAppContext();
  const { theme: currentGlobalTheme, themeVersion } = useTheme();
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [accessGranted, setAccessGranted] = useState(false);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const SCAN_DURATION = 1000; // ms

  const startScan = () => {
    if (accessGranted || isScanning) return;
    setIsScanning(true);
    setScanProgress(0);

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 100 / (SCAN_DURATION / 50);
        if (next >= 100) {
          clearInterval(progressIntervalRef.current!);
          return 100;
        }
        return next;
      });
    }, 50);

    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      handleScanSuccess();
    }, SCAN_DURATION);
  };

  const cancelScan = () => {
    if (accessGranted || !isScanning) return;
    setIsScanning(false);
    setScanProgress(0);
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  };

  const handleScanSuccess = () => {
    setIsScanning(false);
    setAccessGranted(true);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setTimeout(() => {
      setOnboardingStep('tod');
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only call preventDefault if the event is cancelable, to avoid console warning
    if (e.cancelable) {
      e.preventDefault();
    }
    startScan();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) { // Check if cancelable before preventing default
      e.preventDefault();
    }
    cancelScan();
  };


  return (
    <HolographicPanel
      className="w-full max-w-md text-center p-6 flex flex-col items-center flex-grow h-0 overflow-hidden"
      explicitTheme={currentGlobalTheme}
      key={`fingerprint-panel-${currentGlobalTheme}-${themeVersion}-${accessGranted}`}
    >
      {/* Inner wrapper to manage flex distribution and ensure consistent height */}
      <div className="flex flex-col items-center w-full flex-grow">
        {accessGranted ? (
          <>
            {/* Top content block for "Access Granted" */}
            <div className="flex-shrink-0"> 
              <h2 className="text-3xl font-orbitron holographic-text text-green-400">Access Granted</h2>
              <p className="text-lg text-muted-foreground mt-2">Welcome<br></br>Agent {playerSpyName}</p>
            </div>
            <div className="flex-grow" /> {/* Spacer */}
            {/* Bottom graphic block for "Access Granted" - matches scanning state structure */}
            <div className="flex-shrink-0"> 
              <div
                className="relative w-48 h-48 mx-auto rounded-full border-2 border-green-500 flex items-center justify-center"
                // Using border-green-500 for a solid green border
              >
                <Fingerprint
                  className="w-24 h-24 text-green-400 icon-glow"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Top content block for "Scanning" */}
            <div className="flex-shrink-0"> 
              <h2 className="text-2xl font-orbitron mb-6 holographic-text">Spi Vs Spi:<br />Biometric Authentication</h2>
              <p className="text-muted-foreground mb-8">Press and Hold to Authenticate.</p>
            </div>
            <div className="flex-grow" /> {/* Spacer */}
            {/* Bottom graphic block for "Scanning" */}
            <div className="flex-shrink-0"> 
              <div
                className="relative w-48 h-48 mx-auto rounded-full border-2 border-primary flex items-center justify-center cursor-pointer select-none touch-none"
                onMouseDown={startScan}
                onTouchStart={handleTouchStart} 
                onMouseUp={cancelScan}
                onTouchEnd={handleTouchEnd}
                onMouseLeave={cancelScan}
              >
                <Fingerprint
                  className={cn(
                    "w-24 h-24 text-primary transition-colors duration-300 icon-glow",
                    isScanning && "text-accent animate-pulse"
                  )}
                />
                {isScanning && (
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <div
                      className="absolute top-0 left-0 h-full w-full bg-primary opacity-30 animate-holographic-scan"
                      style={{ transform: `translateY(${-100 + scanProgress}%)` }}
                    />
                  </div>
                )}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 36 36">
                  <path
                    className="text-transparent" // Background track for the progress
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2"
                    stroke="hsl(var(--border-hsl))" // Use a subtle border color for the track
                    strokeOpacity="0.3"
                  />
                  <path
                    className={cn("transition-all duration-150", isScanning ? "text-accent" : "text-primary", "icon-glow")}
                    strokeDasharray={`${scanProgress}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '18px 18px' }}
                  />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </HolographicPanel>
  );
}
