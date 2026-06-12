import { Wifi, WifiOff } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

export default function NetworkBadge() {
  const { peerOpen, devices } = useAppState();
  const connected = peerOpen && devices.some(d => d.connected);

  return (
    <div className="glass-badge" style={{
      position: 'fixed', top: 20, left: 20, zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', pointerEvents: 'auto',
    }}>
      {connected ? <Wifi size={14} style={{ color: '#10B981' }} /> : <WifiOff size={14} style={{ color: '#9CA3AF' }} />}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1A202C' }}>FileBridge</span>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        backgroundColor: connected ? '#10B981' : '#9CA3AF',
        display: 'inline-block',
      }} />
      <span style={{ fontSize: 11, color: connected ? '#10B981' : '#9CA3AF', fontWeight: 500 }}>
        {connected ? 'Linked' : 'Unlinked'}
      </span>
    </div>
  );
}
