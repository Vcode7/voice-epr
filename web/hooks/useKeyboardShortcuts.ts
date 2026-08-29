'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShortcutAction, KeyboardShortcutsConfig } from '@/types';
import {
  matchesShortcut,
  loadShortcutsConfig,
  formatDisplayKeyCombo,
  SHORTCUTS_STORAGE_KEY,
} from '@/lib/utils/shortcutManager';

export interface ShortcutHandlers {
  onToggleRecording?: () => void;
  onNewTemplate?: () => void;
  onAddField?: () => void;
  onSaveAll?: () => void;
  onEditEntry?: () => void;
  onCancelAction?: () => void;
  onUndo?: () => void;
  onPrintReport?: () => void;
  onExportExcel?: () => void;
  onClearAll?: () => void;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  options: {
    enabled?: boolean;
    userSettingsConfig?: KeyboardShortcutsConfig;
  } = { enabled: true }
) {
  const { enabled = true, userSettingsConfig } = options;
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>(() =>
    loadShortcutsConfig(userSettingsConfig)
  );

  // Reload shortcuts if userSettingsConfig changes or on custom event
  const reloadShortcuts = useCallback(() => {
    setShortcuts(loadShortcutsConfig(userSettingsConfig));
  }, [userSettingsConfig]);

  useEffect(() => {
    reloadShortcuts();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SHORTCUTS_STORAGE_KEY) {
        reloadShortcuts();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('voice-epr-shortcuts-updated', reloadShortcuts);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('voice-epr-shortcuts-updated', reloadShortcuts);
    };
  }, [reloadShortcuts]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      for (const action of shortcuts) {
        if (!action.key) continue;

        if (matchesShortcut(e, action.key)) {
          // If the shortcut is a single character (no Ctrl/Alt/Meta) and user is typing in an input, don't hijack typing
          const isModifierCombo =
            action.key.includes('+') ||
            action.key === 'escape' ||
            action.key === 'esc' ||
            e.ctrlKey ||
            e.metaKey ||
            e.altKey;

          if (isInput && !isModifierCombo) {
            continue;
          }

          // Matched action handler
          switch (action.id) {
            case 'toggle_recording':
              if (handlers.onToggleRecording) {
                e.preventDefault();
                handlers.onToggleRecording();
              }
              break;

            case 'new_template':
              if (handlers.onNewTemplate) {
                e.preventDefault();
                handlers.onNewTemplate();
              }
              break;

            case 'add_field':
              if (handlers.onAddField) {
                e.preventDefault();
                handlers.onAddField();
              }
              break;

            case 'save_all':
              if (handlers.onSaveAll) {
                e.preventDefault();
                handlers.onSaveAll();
              }
              break;

            case 'edit_entry':
              if (handlers.onEditEntry) {
                e.preventDefault();
                handlers.onEditEntry();
              }
              break;

            case 'cancel_action':
              if (handlers.onCancelAction) {
                e.preventDefault();
                handlers.onCancelAction();
              }
              break;

            case 'undo':
              if (handlers.onUndo) {
                // If in normal text input, allow native text undo unless prevented
                if (!isInput) {
                  e.preventDefault();
                  handlers.onUndo();
                }
              }
              break;

            case 'print_report':
              if (handlers.onPrintReport) {
                e.preventDefault();
                handlers.onPrintReport();
              }
              break;

            case 'export_excel':
              if (handlers.onExportExcel) {
                e.preventDefault();
                handlers.onExportExcel();
              }
              break;

            case 'clear_all':
              if (handlers.onClearAll) {
                e.preventDefault();
                handlers.onClearAll();
              }
              break;

            default:
              break;
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, shortcuts, handlers]);

  const getShortcutDisplay = useCallback(
    (actionId: string): string => {
      const match = shortcuts.find((s) => s.id === actionId);
      return match ? formatDisplayKeyCombo(match.key) : '';
    },
    [shortcuts]
  );

  const getShortcutKey = useCallback(
    (actionId: string): string => {
      const match = shortcuts.find((s) => s.id === actionId);
      return match ? match.key : '';
    },
    [shortcuts]
  );

  return {
    shortcuts,
    getShortcutDisplay,
    getShortcutKey,
    reloadShortcuts,
  };
}
