import React, { createContext, useContext, useState, useCallback } from 'react';
import { useSignalingP2P, type TransferProgress } from '@/hooks/useSignalingP2P';
import { useStorage } from '@/hooks/useStorage';

export type AppPage = 'connect' | 'send' | 'history' | 'settings';

type AppState = {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  peerOpen: boolean;
  devices: Array<{ peerId: string; deviceName: string; os: string; connected: boolean }>;
  error: string;
  selectedDeviceId: string | null;
  setSelectedDeviceId: (id: string | null) => void;
  connectToPeer: (peerId: string) => Promise<void>;
  activeTransfers: TransferProgress[];
  history: TransferProgress[];
  sendFiles: (files: FileList | File[] | null) => void;
  downloadFile: (transferId: string) => void;
  clearHistory: () => void;
  settings: {
    deviceName: string;
  };
  updateSettings: (updates: Partial<{ deviceName: string }>) => void;
  isTransferring: boolean;
};

const AppContext = createContext<AppState | null>(null);

function getInitialRoomCode(): string {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room')?.trim().toLowerCase();
  return room || 'default';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activePage, setActivePage] = useState<AppPage>('connect');
  const [roomCode, setRoomCodeState] = useState(getInitialRoomCode);

  const setRoomCode = useCallback((code: string) => {
    const normalized = code.trim().toLowerCase();
    setRoomCodeState(normalized);
    const url = new URL(window.location.href);
    if (normalized && normalized !== 'default') {
      url.searchParams.set('room', normalized);
    } else {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url);
  }, []);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeTransfers, setActiveTransfers] = useState<TransferProgress[]>([]);

  const { history, settings, addHistoryEntry, updateSettings: updateStoredSettings, clearHistory } = useStorage();

  const onTransferProgress = useCallback((progress: TransferProgress) => {
    setActiveTransfers(prev => {
      const idx = prev.findIndex(p => p.transferId === progress.transferId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = progress;
        return updated;
      }
      return [...prev, progress];
    });
    if (progress.status === 'completed') {
      addHistoryEntry(progress);
    }
  }, [addHistoryEntry]);

  const onFileReceived = useCallback((progress: TransferProgress) => {
    addHistoryEntry(progress);
  }, [addHistoryEntry]);

  const p2p = useSignalingP2P(settings.deviceName, roomCode, onTransferProgress, onFileReceived);

  const handleSetSelectedDeviceId = useCallback((id: string | null) => {
    setSelectedDeviceId(id);
    if (id) {
      p2p.connectToPeer(id);
    }
  }, [p2p]);

  const sendFiles = useCallback((files: FileList | File[] | null) => {
    if (!files || files.length === 0 || !selectedDeviceId) return;
    p2p.sendFiles(Array.from(files), selectedDeviceId);
  }, [selectedDeviceId, p2p]);

  const downloadFile = useCallback((transferId: string) => {
    const entry = history.find(h => h.transferId === transferId);
    if (entry?.blob) {
      const url = URL.createObjectURL(entry.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = entry.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [history]);

  const updateSettings = useCallback((updates: Partial<AppState['settings']>) => {
    updateStoredSettings(updates);
  }, [updateStoredSettings]);

  const isTransferring = activeTransfers.some(
    t => t.status === 'transferring' || t.status === 'pending',
  );

  return (
    <AppContext.Provider value={{
      activePage,
      setActivePage,
      roomCode,
      setRoomCode,
      peerOpen: p2p.peerOpen,
      devices: p2p.devices,
      error: p2p.error,
      selectedDeviceId,
      setSelectedDeviceId: handleSetSelectedDeviceId,
      connectToPeer: p2p.connectToPeer,
      activeTransfers,
      history,
      sendFiles,
      downloadFile,
      clearHistory,
      settings,
      updateSettings,
      isTransferring,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
