import { useState } from 'react';
import { File, ArrowUp, ArrowDown, CheckCircle2, XCircle, Download, Trash2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { formatFileSize } from '@/utils/fileTransfer';

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type FilterType = 'all' | 'sent' | 'received';

export default function HistoryPage() {
  const { history, downloadFile, clearHistory } = useAppState();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = history.filter(t => {
    if (filter === 'sent') return t.direction === 'send';
    if (filter === 'received') return t.direction === 'receive';
    return true;
  });

  return (
    <div style={{ padding: '32px', maxWidth: 720, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1A202C', margin: 0, lineHeight: 1.2 }}>
          Transfer History
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255, 255, 255, 0.4)', borderRadius: 10, padding: 3 }}>
            {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: filter === f ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
                  fontSize: 12,
                  fontWeight: 600,
                  color: filter === f ? '#1A202C' : '#9CA3AF',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize' as const,
                  transition: 'all 0.2s',
                  boxShadow: filter === f ? '0 1px 4px rgba(0, 0, 0, 0.06)' : 'none',
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 10px',
                borderRadius: 8,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#EF4444',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
            >
              <Trash2 size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 32px',
            color: '#9CA3AF',
            fontSize: 14,
            fontWeight: 500,
          }}>
            {history.length === 0 ? 'No transfers yet — send a file to get started' : 'No transfers match this filter'}
          </div>
        ) : (
          filtered.map((transfer) => (
            <div
              key={transfer.transferId}
              onMouseEnter={() => setHoveredId(transfer.transferId)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                borderRadius: 14,
                background: hoveredId === transfer.transferId
                  ? 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: transfer.status === 'completed'
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <File size={15} style={{
                  color: transfer.status === 'completed' ? '#10B981' : '#EF4444',
                }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 3,
                }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1A202C',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {transfer.fileName}
                  </span>
                  {transfer.direction === 'send' ? (
                    <ArrowUp size={11} style={{ color: '#2563EB', flexShrink: 0 }} />
                  ) : (
                    <ArrowDown size={11} style={{ color: '#10B981', flexShrink: 0 }} />
                  )}
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {transfer.direction === 'send' ? 'Sent' : 'Received'}
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E0' }} />
                  {formatFileSize(transfer.fileSize)}
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E0' }} />
                  {timeAgo(transfer.timestamp)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {hoveredId === transfer.transferId && transfer.direction === 'receive' && transfer.blob && (
                  <button
                    onClick={() => downloadFile(transfer.transferId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      background: 'rgba(37, 99, 235, 0.08)',
                      color: '#2563EB',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)'; }}
                  >
                    <Download size={12} />
                    Download
                  </button>
                )}

                {transfer.status === 'completed' ? (
                  <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                ) : (
                  <XCircle size={16} style={{ color: '#EF4444' }} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
