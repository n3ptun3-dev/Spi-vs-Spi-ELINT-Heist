"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HolographicPanel, HolographicButton } from './HolographicPanel';
import { useTheme } from '@/contexts/ThemeContext';

export interface ConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationPopup: React.FC<ConfirmationPopupProps> = ({
  isOpen,
  onClose,
  title,
  content,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
  const { theme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <HolographicPanel explicitTheme={theme} className="w-[90vw] max-w-md flex flex-col gap-4">
              <h2 className="text-xl font-orbitron holographic-text">{title}</h2>
              <div className="text-sm text-muted-foreground font-rajdhani">{content}</div>
              <div className="flex justify-end gap-3 mt-4">
                <HolographicButton onClick={onClose} className="bg-muted/20 hover:bg-muted/40">
                  {cancelText}
                </HolographicButton>
                <HolographicButton onClick={onConfirm}>
                  {confirmText}
                </HolographicButton>
              </div>
            </HolographicPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};