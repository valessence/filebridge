import { useState, useRef, useCallback } from 'react';
import { ArrowUp, File, AlertCircle } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { formatFileSize, formatSpeed } from '@/utils/fileTransfer';

export default function SendPage() {
  const { devices, activeTransfers, sendFiles } = useAppState();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConnected = devices.some(d => d.connected);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    sendFiles(e.dataTransfer.files);
  }, [sendFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) sendFiles(files);
    e.target.value = '';
  }, [sendFiles]);

  const pendingTransfers = activeTransfers.filter(t => t.status === 'pending' || t.status === 'transferring');
  const completedTransfers = activeTransfers.filter(t => t.status === 'completed');

  if (!isConnected) {
    return (
      <div style={{ padding: '32px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A202C', margin: '0 0 24px 0' }}>Send Files</h1>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          padding: '48px 32px', borderRadius: 16, background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(12px)',
        }}>
          <AlertCircle size={32} style={{ color: '#F59E0B' }} />
          <p style={{ fontSize: 15, color: '#4A5568', margin: 0, fontWeight: 500 }}>No device linked</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Go to the Connect tab first</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A202C', margin: '0 0 24px 0' }}>Send Files</h1>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12,
        background: 'rgba(16, 185, 129, 0.08)', marginBottom: 16, fontSize: 13, fontWeight: 500, color: '#10B981',
      }}>
        <ArrowUp size={14} />
        Device linked — ready to transfer
      </div>

      <div
        className={`drop-zone${isDragging ? ' active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '56px 32px', cursor: 'pointer', marginBottom: 24,
          background: isDragging ? 'rgba(37, 99, 235, 0.06)' : 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <ArrowUp size={24} style={{ color: '#2563EB' }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1A202C', margin: '0 0 6px 0' }}>Drop files here</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>or click to browse</p>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleInputChange} />
      </div>

      {pendingTransfers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#4A5568', margin: '0 0 4px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Active</h3>
          {pendingTransfers.map(t => <TransferRow key={t.transferId} transfer={t} />)}
        </div>
      )}

      {completedTransfers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: pendingTransfers.length > 0 ? 16 : 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#4A5568', margin: '0 0 4px 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Completed</h3>
          {completedTransfers.map(t => <TransferRow key={t.transferId} transfer={t} />)}
        </div>
      )}
    </div>
  );
}

function TransferRow({ transfer }: { transfer: import('@/hooks/useSignalingP2P').TransferProgress }) {
  const isDone = transfer.status === 'completed';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <File size={16} style={{ color: isDone ? '#10B981' : '#2563EB' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A202C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transfer.fileName}</span>
          <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>{formatFileSize(transfer.fileSize)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${transfer.progress}%`, height: '100%', borderRadius: 2, background: isDone ? '#10B981' : '#2563EB', transition: 'width 0.3s ease' }} />
          </div>
          <span style={{ fontSize: 11, color: '#4A5568', fontWeight: 500, minWidth: 36, textAlign: 'right' }}>{isDone ? 'Done' : `${transfer.progress}%`}</span>
        </div>
        {transfer.status === 'transferring' && transfer.speed > 0 && (
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>{formatSpeed(transfer.speed)}</div>
        )}
      </div>
    </div>
  );
}
