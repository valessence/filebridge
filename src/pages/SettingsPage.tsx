import { UserCircle, Monitor } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppState();

  return (
    <div style={{ padding: '32px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A202C', margin: '0 0 24px 0', lineHeight: 1.2 }}>
        Settings
      </h1>

      {/* Device Name — the only real setting */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          borderRadius: 14,
          background: 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(8px)',
          marginBottom: 24,
        }}
      >
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'rgba(37, 99, 235, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <UserCircle size={17} style={{ color: '#2563EB' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A202C', marginBottom: 2 }}>
            Device Name
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 8 }}>
            How others see your device on the network
          </div>
          <input
            type="text"
            value={settings.deviceName}
            onChange={(e) => updateSettings({ deviceName: e.target.value })}
            style={{
              width: '100%',
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(255, 255, 255, 0.8)',
              fontSize: 13,
              fontWeight: 500,
              color: '#1A202C',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'; }}
          />
        </div>
      </div>

      {/* App info */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(37, 99, 235, 0.05)',
        border: '1px solid rgba(37, 99, 235, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Monitor size={14} style={{ color: '#2563EB' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>FileBridge v2.0</span>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, lineHeight: 1.6 }}>
          Hosted online — visitors just open the page, no setup required.
          Devices on the same Wi‑Fi discover each other via a shared room code.
          Files transfer directly between devices — the server never sees your files.
        </div>
      </div>
    </div>
  );
}
