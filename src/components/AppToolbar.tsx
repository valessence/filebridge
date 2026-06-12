import { Link2, ArrowUp, Clock, Settings } from 'lucide-react';
import { useAppState, type AppPage } from '@/hooks/useAppState';

const tabs: { id: AppPage; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'connect', label: 'Connect', icon: Link2 },
  { id: 'send', label: 'Send', icon: ArrowUp },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AppToolbar() {
  const { activePage, setActivePage } = useAppState();

  return (
    <div className="glass-toolbar" style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 30, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', pointerEvents: 'auto',
    }}>
      {tabs.map((tab) => {
        const isActive = activePage === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 12,
              border: 'none', cursor: 'pointer', background: isActive ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
              boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: 13, fontWeight: 500, color: isActive ? '#1A202C' : '#4A5568',
              letterSpacing: '0.5px', textTransform: 'uppercase' as const, fontFamily: 'inherit',
            }}
          >
            <Icon size={15} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
