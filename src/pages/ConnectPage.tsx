import { useState } from 'react';
import { Monitor, Wifi, Loader2, AlertCircle, Zap, Link2, Check } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

const osColor: Record<string, string> = {
  macOS: '#2563EB',
  Windows: '#10B981',
  Linux: '#F59E0B',
  Unknown: '#6B7280',
};

export default function ConnectPage() {
  const { roomCode, setRoomCode, peerOpen, devices, error, selectedDeviceId, setSelectedDeviceId } = useAppState();
  const [inputCode, setInputCode] = useState(roomCode === 'default' ? '' : roomCode);
  const [joined, setJoined] = useState(roomCode !== 'default');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = joined && roomCode !== 'default'
    ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}`
    : '';

  const handleJoin = () => {
    const trimmed = inputCode.trim().toLowerCase();
    if (trimmed) {
      setRoomCode(trimmed);
      setJoined(true);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '32px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A202C', margin: '0 0 8px 0' }}>
        Connect Devices
      </h1>
      <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px 0', lineHeight: 1.5 }}>
        No install needed — just open this page on each device. Connect on the same Wi‑Fi with a shared room code. Files transfer directly between devices, not through the server.
      </p>

      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, padding: '16px 20px', borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            Room Code
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="e.g. livingroom"
              disabled={joined && peerOpen}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(0, 0, 0, 0.08)',
                background: joined && peerOpen ? 'rgba(0,0,0,0.04)' : 'rgba(255, 255, 255, 0.8)',
                fontSize: 14, fontWeight: 500, color: '#1A202C', fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button
              onClick={handleJoin}
              disabled={joined && peerOpen}
              style={{
                padding: '8px 20px', borderRadius: 10, border: 'none', background: '#2563EB',
                color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                opacity: joined && peerOpen ? 0.7 : 1,
              }}
            >
              {joined && peerOpen ? 'Joined' : 'Join'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
            Share the room link with others on your Wi‑Fi — they just open it in a browser
          </div>
        </div>
      </div>

      {shareUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px',
          borderRadius: 12, background: 'rgba(37, 99, 235, 0.06)', border: '1px solid rgba(37, 99, 235, 0.12)',
        }}>
          <Link2 size={14} style={{ color: '#2563EB', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12, color: '#4A5568', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shareUrl}
          </span>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563EB',
              color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}
          >
            {copied ? <><Check size={12} /> Copied</> : 'Copy room link'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, fontWeight: 500 }}>
        {error ? (
          <><AlertCircle size={14} style={{ color: '#EF4444' }} /><span style={{ color: '#EF4444' }}>{error}</span></>
        ) : peerOpen ? (
          <><Wifi size={14} style={{ color: '#10B981' }} /><span style={{ color: '#10B981' }}>Ready — room &quot;{roomCode}&quot;</span></>
        ) : joined ? (
          <><Loader2 size={14} style={{ color: '#F59E0B', animation: 'spin 1s linear infinite' }} /><span style={{ color: '#F59E0B' }}>Connecting to signaling...</span></>
        ) : (
          <><Zap size={14} style={{ color: '#9CA3AF' }} /><span style={{ color: '#9CA3AF' }}>Enter a room code to start</span></>
        )}
      </div>

      {!joined ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 16, background: 'rgba(255, 255, 255, 0.3)', color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
          Enter a room code and click Join to discover devices
        </div>
      ) : devices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 16, background: 'rgba(255, 255, 255, 0.3)', color: '#9CA3AF', fontSize: 14, fontWeight: 500 }}>
          {peerOpen ? (
            <>
              <Loader2 size={20} style={{ marginBottom: 8, animation: 'spin 1s linear infinite' }} />
              <div>Scanning for devices in room &quot;{roomCode}&quot;...</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Have someone on the same Wi‑Fi open this site with the same room code</div>
            </>
          ) : (
            <>
              <Loader2 size={20} style={{ marginBottom: 8, animation: 'spin 1s linear infinite' }} />
              <div>Connecting...</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {devices.map((device) => {
            const isSelected = selectedDeviceId === device.peerId;
            return (
              <button
                key={device.peerId}
                onClick={() => setSelectedDeviceId(isSelected ? null : device.peerId)}
                onMouseEnter={() => setHoveredId(device.peerId)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                  padding: 20, borderRadius: 16,
                  border: `2px solid ${isSelected ? '#2563EB' : 'rgba(255, 255, 255, 0.3)'}`,
                  background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(12px)', cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', textAlign: 'left',
                  boxShadow: isSelected ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none',
                  transform: hoveredId === device.peerId ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${osColor[device.os] || '#6B7280'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Monitor size={20} style={{ color: osColor[device.os] || '#6B7280' }} />
                  </div>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: device.connected ? '#2563EB' : '#10B981',
                    boxShadow: device.connected ? '0 0 0 3px rgba(37, 99, 235, 0.3)' : '0 0 0 3px rgba(16, 185, 129, 0.3)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {device.deviceName}
                  </div>
                  <div style={{ fontSize: 12, color: '#4A5568', marginTop: 2, fontWeight: 500 }}>
                    {device.os} {device.connected && '• Linked'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}