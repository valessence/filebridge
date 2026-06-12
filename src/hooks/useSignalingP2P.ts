import { useRef, useCallback, useState, useEffect } from 'react';
import { FileReassembler, type FileMetadata, type FileDone, fileChunks, generateTransferId, downloadBlob } from '@/utils/fileTransfer';
import { trpc } from '@/providers/trpc';

export type TransferProgress = {
  transferId: string;
  fileName: string;
  fileSize: number;
  direction: 'send' | 'receive';
  progress: number;
  speed: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  peerId: string;
  peerName: string;
  timestamp: number;
  blob?: Blob;
};

export type PeerDevice = {
  peerId: string;
  deviceName: string;
  os: string;
  connected: boolean;
};

type TransferCallback = (progress: TransferProgress) => void;

const CHUNK_SIZE = 16384;
const POLL_INTERVAL = 2000;
const DEFAULT_ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown';
}

function waitForIce(pc: RTCPeerConnection, timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    const check = () => { if (pc.iceGatheringState === 'complete') resolve(); };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, timeout);
  });
}

async function trpcCall(procedure: string, input: Record<string, unknown>) {
  const params = new URLSearchParams();
  params.set('input', JSON.stringify({ json: input }));
  await fetch(`/api/trpc/${procedure}?${params.toString()}`);
}

export function useSignalingP2P(
  deviceName: string,
  roomCode: string,
  onTransferProgress: TransferCallback,
  onFileReceived: (progress: TransferProgress) => void,
) {
  const [myId, setMyId] = useState(() => `${roomCode}-${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    if (roomCode !== 'default') {
      setMyId(`${roomCode}-${Math.random().toString(36).slice(2, 8)}`);
    }
  }, [roomCode]);

  const [peerOpen, setPeerOpen] = useState(false);
  const [devices, setDevices] = useState<PeerDevice[]>([]);
  const [error, setError] = useState('');
  const [iceConfig, setIceConfig] = useState<RTCConfiguration>(DEFAULT_ICE_SERVERS);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const reassemblersRef = useRef<Map<string, FileReassembler>>(new Map());
  const speedTrackerRef = useRef<Map<string, { lastBytes: number; lastTime: number }>>(new Map());
  const onTransferRef = useRef(onTransferProgress);
  const onReceivedRef = useRef(onFileReceived);
  const connectedPeerRef = useRef<string>('');

  onTransferRef.current = onTransferProgress;
  onReceivedRef.current = onFileReceived;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('input', JSON.stringify({ json: null }));
        const res = await fetch(`/api/trpc/config.public?${params.toString()}`);
        const body = await res.json();
        const servers = body?.result?.data?.json?.iceServers;
        if (!cancelled && Array.isArray(servers) && servers.length > 0) {
          setIceConfig({ iceServers: servers });
        }
      } catch {
        // Fall back to default STUN servers.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const presenceQuery = trpc.signaling.presence.useQuery(
    { peerId: myId, roomCode, deviceName, os: getOS() },
    { refetchInterval: POLL_INTERVAL, retry: true, enabled: roomCode !== 'default' },
  );

  const getMessagesQuery = trpc.signaling.getMessages.useQuery(
    { peerId: myId },
    { refetchInterval: POLL_INTERVAL, retry: true, enabled: roomCode !== 'default' },
  );

  useEffect(() => {
    if (roomCode === 'default') {
      setPeerOpen(false);
      setDevices([]);
      return;
    }
    if (presenceQuery.data) {
      setPeerOpen(true);
      setError('');
      const serverPeers = presenceQuery.data.peers;
      setDevices(prev => {
        const next = new Map(prev.map(d => [d.peerId, d]));
        for (const p of serverPeers) {
          if (!next.has(p.peerId)) {
            next.set(p.peerId, { peerId: p.peerId, deviceName: p.deviceName, os: p.os, connected: false });
          }
        }
        for (const id of next.keys()) {
          if (!serverPeers.some(p => p.peerId === id)) next.delete(id);
        }
        return Array.from(next.values());
      });
    } else if (presenceQuery.isError) {
      setError('Signaling unavailable');
    }
  }, [presenceQuery.data, presenceQuery.isError, roomCode]);

  const setupDC = useCallback((dc: RTCDataChannel, peerName: string) => {
    dc.onopen = () => {
      setDevices(prev => prev.map(d => d.peerId === connectedPeerRef.current ? { ...d, connected: true } : d));
    };
    dc.onmessage = (e) => {
      const data = e.data;
      if (typeof data === 'string') {
        try {
          const msg = JSON.parse(data) as FileMetadata | FileDone;
          if (msg.type === 'file-start') {
            const reassembler = new FileReassembler();
            reassembler.start(msg);
            reassemblersRef.current.set(msg.transferId, reassembler);
            onTransferRef.current({
              transferId: msg.transferId, fileName: msg.fileName, fileSize: msg.fileSize,
              direction: 'receive', progress: 0, speed: 0, status: 'transferring',
              peerId: connectedPeerRef.current, peerName, timestamp: Date.now(),
            });
          } else if (msg.type === 'file-done') {
            const reassembler = reassemblersRef.current.get(msg.transferId);
            if (reassembler && reassembler.isComplete()) {
              const blob = reassembler.assemble();
              const meta = reassembler.getMetadata();
              if (meta) {
                const p: TransferProgress = {
                  transferId: msg.transferId, fileName: meta.fileName, fileSize: meta.fileSize,
                  direction: 'receive', progress: 100, speed: 0, status: 'completed',
                  peerId: connectedPeerRef.current, peerName, timestamp: Date.now(), blob,
                };
                onTransferRef.current(p);
                onReceivedRef.current(p);
                downloadBlob(blob, meta.fileName);
              }
              reassemblersRef.current.delete(msg.transferId);
            }
          }
        } catch { /* */ }
      } else if (data instanceof ArrayBuffer) {
        for (const [transferId, reassembler] of reassemblersRef.current) {
          const meta = reassembler.getMetadata();
          if (meta && !reassembler.isComplete()) {
            reassembler.addChunk(data);
            const pct = reassembler.getProgress();
            const now = Date.now();
            const tracker = speedTrackerRef.current.get(transferId);
            let speed = 0;
            if (tracker) { const dt = (now - tracker.lastTime) / 1000; if (dt > 0) speed = data.byteLength / dt; }
            speedTrackerRef.current.set(transferId, { lastBytes: (tracker?.lastBytes || 0) + data.byteLength, lastTime: now });
            onTransferRef.current({
              transferId, fileName: meta.fileName, fileSize: meta.fileSize,
              direction: 'receive', progress: pct, speed,
              status: pct >= 100 ? 'completed' : 'transferring',
              peerId: connectedPeerRef.current, peerName, timestamp: Date.now(),
            });
            break;
          }
        }
      }
    };
  }, []);

  const handleSignalingMessage = useCallback(async (kind: string, fromPeerId: string, fromDeviceName: string, data: unknown) => {
    connectedPeerRef.current = fromPeerId;

    if (kind === 'offer') {
      const { sdp } = data as { sdp: string };
      const pc = new RTCPeerConnection(iceConfig);
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          trpcCall('signaling.sendIceCandidate', {
            fromPeerId: myId, roomCode, fromDeviceName: deviceName, fromOs: getOS(),
            targetPeerId: fromPeerId,
            candidate: JSON.stringify(e.candidate.toJSON()),
            sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.ondatachannel = (e) => {
        dcRef.current = e.channel;
        setupDC(e.channel, fromDeviceName);
      };

      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);

      trpcCall('signaling.sendAnswer', {
        fromPeerId: myId, roomCode, fromDeviceName: deviceName, fromOs: getOS(),
        targetPeerId: fromPeerId, sdp: pc.localDescription!.sdp,
      });

      setDevices(prev => prev.map(d => d.peerId === fromPeerId ? { ...d, connected: true } : d));
    }

    if (kind === 'answer') {
      const { sdp } = data as { sdp: string };
      const pc = pcRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
        setDevices(prev => prev.map(d => d.peerId === fromPeerId ? { ...d, connected: true } : d));
      }
    }

    if (kind === 'ice-candidate') {
      const { candidate: candStr } = data as { candidate: string };
      const pc = pcRef.current;
      if (pc) {
        try {
          const cand = JSON.parse(candStr);
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch { /* */ }
      }
    }
  }, [myId, deviceName, roomCode, iceConfig, setupDC]);

  useEffect(() => {
    if (!getMessagesQuery.data?.messages) return;
    for (const msg of getMessagesQuery.data.messages) {
      handleSignalingMessage(msg.kind, msg.fromPeerId, msg.fromDeviceName, msg.data);
    }
  }, [getMessagesQuery.data, handleSignalingMessage]);

  const connectToPeer = useCallback(async (targetPeerId: string) => {
    const pc = new RTCPeerConnection(iceConfig);
    pcRef.current = pc;
    connectedPeerRef.current = targetPeerId;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        trpcCall('signaling.sendIceCandidate', {
          fromPeerId: myId, roomCode, fromDeviceName: deviceName, fromOs: getOS(),
          targetPeerId,
          candidate: JSON.stringify(e.candidate.toJSON()),
          sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex,
        });
      }
    };

    const dc = pc.createDataChannel('files', { ordered: true });
    dcRef.current = dc;
    setupDC(dc, targetPeerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);

    trpcCall('signaling.sendOffer', {
      fromPeerId: myId, roomCode, fromDeviceName: deviceName, fromOs: getOS(),
      targetPeerId, sdp: pc.localDescription!.sdp,
    });
  }, [myId, deviceName, roomCode, iceConfig, setupDC]);

  const sendFiles = useCallback(async (files: File[], _targetPeerId: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== 'open') return;

    for (const file of files) {
      const transferId = generateTransferId();
      const metadata: FileMetadata = {
        type: 'file-start', transferId,
        fileName: file.name, fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      };

      onTransferRef.current({
        transferId, fileName: file.name, fileSize: file.size,
        direction: 'send', progress: 0, speed: 0, status: 'pending', timestamp: Date.now(),
        peerId: connectedPeerRef.current, peerName: 'Linked Device',
      });

      dc.send(JSON.stringify(metadata));

      let totalSent = 0;
      const startTime = Date.now();
      speedTrackerRef.current.set(transferId, { lastBytes: 0, lastTime: startTime });

      for await (const chunk of fileChunks(file)) {
        if (dc.readyState !== 'open') break;
        dc.send(chunk);
        totalSent += chunk.byteLength;

        const now = Date.now();
        const tracker = speedTrackerRef.current.get(transferId);
        let speed = 0;
        if (tracker) {
          const dt = (now - tracker.lastTime) / 1000;
          if (dt > 0.1) {
            speed = (totalSent - tracker.lastBytes) / dt;
            speedTrackerRef.current.set(transferId, { lastBytes: totalSent, lastTime: now });
          }
        }

        const pct = Math.round((totalSent / file.size) * 100);
        onTransferRef.current({
          transferId, fileName: file.name, fileSize: file.size,
          direction: 'send', progress: pct, speed,
          status: pct >= 100 ? 'completed' : 'transferring', timestamp: Date.now(),
          peerId: connectedPeerRef.current, peerName: 'Linked Device',
        });

        if (totalSent % (CHUNK_SIZE * 10) === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
      }

      dc.send(JSON.stringify({ type: 'file-done', transferId } as FileDone));
    }
  }, []);

  return {
    peerOpen,
    devices,
    error,
    connectToPeer,
    sendFiles,
  };
}