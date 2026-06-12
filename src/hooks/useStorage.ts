import { useState, useEffect, useCallback } from 'react';
import type { TransferProgress } from '@/hooks/useSignalingP2P';

const STORAGE_KEY_HISTORY = 'filebridge_history';
const STORAGE_KEY_SETTINGS = 'filebridge_settings';

export type PersistedSettings = {
  deviceName: string;
};

const defaultSettings: PersistedSettings = {
  deviceName: typeof navigator !== 'undefined'
    ? `${navigator.platform?.split(' ')[0] || 'Device'}-${Math.floor(Math.random() * 9999)}`
    : `Device-${Math.floor(Math.random() * 9999)}`,
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore
  }
  return fallback;
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useStorage() {
  const [history, setHistory] = useState<TransferProgress[]>(() =>
    load<TransferProgress[]>(STORAGE_KEY_HISTORY, []),
  );
  const [settings, setSettingsState] = useState<PersistedSettings>(() =>
    load<PersistedSettings>(STORAGE_KEY_SETTINGS, defaultSettings),
  );

  useEffect(() => {
    save(STORAGE_KEY_HISTORY, history);
  }, [history]);

  useEffect(() => {
    save(STORAGE_KEY_SETTINGS, settings);
  }, [settings]);

  const addHistoryEntry = useCallback((entry: TransferProgress) => {
    setHistory(prev => {
      const exists = prev.findIndex(h => h.transferId === entry.transferId);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = entry;
        return updated;
      }
      return [entry, ...prev].slice(0, 200); // Keep last 200
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<PersistedSettings>) => {
    setSettingsState(prev => ({ ...prev, ...updates }));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    settings,
    addHistoryEntry,
    updateSettings,
    clearHistory,
  };
}
