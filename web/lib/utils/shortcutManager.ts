import { ShortcutAction, KeyboardShortcutsConfig } from '@/types';
import { DEFAULT_KEYBOARD_SHORTCUTS } from '../constants';

export const SHORTCUTS_STORAGE_KEY = 'voice_epr_keyboard_shortcuts';

/**
 * Normalizes a key combo string into a standard lowercase representation
 * e.g. "Ctrl + Shift + E" -> "ctrl+shift+e"
 */
export function normalizeKeyCombo(combo: string): string {
  if (!combo) return '';
  return combo
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort((a, b) => {
      // Keep modifier order consistent: ctrl/cmd, alt, shift, key
      const order = ['ctrl', 'meta', 'cmd', 'alt', 'shift'];
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    })
    .join('+');
}

/**
 * Extracts a normalized key combo string from a KeyboardEvent
 */
export function formatKeyComboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];

  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');

  // Key normalization
  let keyName = e.key.toLowerCase();

  // Normalize special key names
  if (keyName === ' ' || keyName === 'spacebar') {
    keyName = 'space';
  } else if (keyName === 'esc') {
    keyName = 'escape';
  } else if (keyName === 'del') {
    keyName = 'delete';
  } else if (keyName === 'control' || keyName === 'alt' || keyName === 'shift' || keyName === 'meta') {
    // Only modifier pressed
    return parts.join('+');
  }

  // Avoid adding duplicate modifier name as key
  if (!['ctrl', 'alt', 'shift', 'meta'].includes(keyName)) {
    parts.push(keyName);
  }

  return parts.join('+');
}

/**
 * Pretty-formats a normalized key combo string for human-readable display
 * e.g. "ctrl+shift+e" -> "Ctrl + Shift + E"
 * e.g. "r" -> "R"
 * e.g. "escape" -> "Esc"
 */
export function formatDisplayKeyCombo(combo: string): string {
  if (!combo) return '';
  return combo
    .split('+')
    .map((part) => {
      const p = part.trim().toLowerCase();
      if (p === 'ctrl' || p === 'cmd' || p === 'meta') return 'Ctrl';
      if (p === 'alt') return 'Alt';
      if (p === 'shift') return 'Shift';
      if (p === 'enter' || p === 'return') return 'Enter';
      if (p === 'escape' || p === 'esc') return 'Esc';
      if (p === 'space') return 'Space';
      if (p === 'backspace') return 'Backspace';
      if (p === 'delete' || p === 'del') return 'Del';
      if (p === 'tab') return 'Tab';
      if (p.length === 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' + ');
}

/**
 * Checks if a KeyboardEvent matches a configured shortcut key combo
 */
export function matchesShortcut(e: KeyboardEvent, shortcutKey: string): boolean {
  if (!shortcutKey) return false;

  const eventCombo = formatKeyComboFromEvent(e);
  const targetCombo = normalizeKeyCombo(shortcutKey);

  if (eventCombo === targetCombo) return true;

  // Check simple single-key match without modifiers
  if (!shortcutKey.includes('+')) {
    const key = e.key.toLowerCase();
    const target = shortcutKey.toLowerCase();
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      if (key === target) return true;
      if (target === 'escape' && (key === 'escape' || key === 'esc')) return true;
      if (target === 'space' && key === ' ') return true;
    }
  }

  return false;
}

/**
 * Detects if a new key assignment conflicts with any existing shortcut
 */
export function detectShortcutConflict(
  actionId: string,
  newKeyCombo: string,
  allShortcuts: ShortcutAction[]
): ShortcutAction | null {
  const normalizedNew = normalizeKeyCombo(newKeyCombo);
  if (!normalizedNew) return null;

  for (const item of allShortcuts) {
    if (item.id === actionId) continue;
    if (normalizeKeyCombo(item.key) === normalizedNew) {
      return item;
    }
  }
  return null;
}

/**
 * Loads customized shortcuts from localStorage and merges with defaults
 */
export function loadShortcutsConfig(userSettingsConfig?: KeyboardShortcutsConfig): ShortcutAction[] {
  let storedConfig: KeyboardShortcutsConfig = {};

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (raw) {
        storedConfig = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse shortcuts from localStorage:', err);
    }
  }

  // Merge order: userSettingsConfig -> storedConfig in localStorage -> DEFAULT_KEYBOARD_SHORTCUTS
  const mergedConfig = {
    ...userSettingsConfig,
    ...storedConfig,
  };

  return DEFAULT_KEYBOARD_SHORTCUTS.map((action) => ({
    ...action,
    key: mergedConfig[action.id] ? normalizeKeyCombo(mergedConfig[action.id]) : action.defaultKey,
  }));
}

/**
 * Saves customized shortcuts to localStorage
 */
export function saveShortcutsToStorage(shortcuts: ShortcutAction[] | KeyboardShortcutsConfig): KeyboardShortcutsConfig {
  let configToSave: KeyboardShortcutsConfig = {};

  if (Array.isArray(shortcuts)) {
    shortcuts.forEach((s) => {
      configToSave[s.id] = normalizeKeyCombo(s.key);
    });
  } else {
    configToSave = { ...shortcuts };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(configToSave));
    } catch (err) {
      console.warn('Failed to save shortcuts to localStorage:', err);
    }
  }

  return configToSave;
}

/**
 * Resets all shortcuts to defaults in localStorage
 */
export function resetShortcutsInStorage(): ShortcutAction[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear shortcuts from localStorage:', err);
    }
  }
  return DEFAULT_KEYBOARD_SHORTCUTS.map((a) => ({ ...a, key: a.defaultKey }));
}
