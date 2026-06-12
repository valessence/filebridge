import { AppProvider, useAppState } from '@/hooks/useAppState';
import FluidBackground from '@/components/FluidBackground';
import GrainOverlay from '@/components/GrainOverlay';
import NetworkBadge from '@/components/NetworkBadge';
import AppToolbar from '@/components/AppToolbar';
import ConnectPage from '@/pages/ConnectPage';
import SendPage from '@/pages/SendPage';
import HistoryPage from '@/pages/HistoryPage';
import SettingsPage from '@/pages/SettingsPage';

function AppContent() {
  const { activePage, isTransferring } = useAppState();

  const renderPage = () => {
    switch (activePage) {
      case 'connect': return <ConnectPage />;
      case 'send': return <SendPage />;
      case 'history': return <HistoryPage />;
      case 'settings': return <SettingsPage />;
      default: return <ConnectPage />;
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', pointerEvents: 'none' }}>
      <FluidBackground isTransferring={isTransferring} />
      <GrainOverlay />
      <NetworkBadge />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10, width: '90vw', maxWidth: 800, maxHeight: '78vh', overflow: 'auto', pointerEvents: 'auto',
      }} className="glass-panel">
        {renderPage()}
      </div>
      <AppToolbar />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
