import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

type PeerInfo = {
  deviceName: string;
  os: string;
  roomCode: string;
  lastSeen: number;
};

const peers = new Map<string, PeerInfo>();
const messages = new Map<string, Array<{
  kind: string;
  fromPeerId: string;
  fromDeviceName: string;
  fromOs: string;
  data: unknown;
  timestamp: number;
}>>();

const PEER_TIMEOUT_MS = 20000;
const MSG_EXPIRY_MS = 60000;
const MAX_ROOM_CODE_LEN = 64;

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toLowerCase().slice(0, MAX_ROOM_CODE_LEN);
}

function cleanup() {
  const now = Date.now();
  for (const [peerId, peer] of peers) {
    if (now - peer.lastSeen > PEER_TIMEOUT_MS) {
      peers.delete(peerId);
      messages.delete(peerId);
    }
  }
  for (const [peerId, msgs] of messages) {
    messages.set(peerId, msgs.filter(m => now - m.timestamp < MSG_EXPIRY_MS));
  }
}

function getPeerRoom(peerId: string): string | null {
  return peers.get(peerId)?.roomCode ?? null;
}

function peersInRoom(roomCode: string, excludePeerId?: string) {
  return Array.from(peers.entries())
    .filter(([id, peer]) => id !== excludePeerId && peer.roomCode === roomCode)
    .map(([peerId, peer]) => ({
      peerId,
      deviceName: peer.deviceName,
      os: peer.os,
    }));
}

function canRelay(fromPeerId: string, targetPeerId: string, roomCode: string): boolean {
  const fromRoom = getPeerRoom(fromPeerId) ?? normalizeRoomCode(roomCode);
  const targetRoom = getPeerRoom(targetPeerId);
  return fromRoom === normalizeRoomCode(roomCode) && targetRoom === fromRoom;
}

const presenceInput = z.object({
  peerId: z.string().min(1).max(128),
  roomCode: z.string().min(1).max(MAX_ROOM_CODE_LEN),
  deviceName: z.string().min(1).max(128),
  os: z.string().min(1).max(64),
});

export const signalingRouter = createRouter({
  presence: publicQuery
    .input(presenceInput)
    .query(({ input }) => {
      cleanup();
      const roomCode = normalizeRoomCode(input.roomCode);
      peers.set(input.peerId, {
        deviceName: input.deviceName,
        os: input.os,
        roomCode,
        lastSeen: Date.now(),
      });

      return { peers: peersInRoom(roomCode, input.peerId) };
    }),

  getMessages: publicQuery
    .input(z.object({ peerId: z.string().min(1).max(128) }))
    .query(({ input }) => {
      const msgs = messages.get(input.peerId) || [];
      messages.set(input.peerId, []);
      if (msgs.length > 0) {
        console.log("[SIG] Delivering", msgs.length, "messages to", input.peerId.slice(0, 8));
      }
      return { messages: msgs };
    }),

  sendOffer: publicQuery
    .input(z.object({
      fromPeerId: z.string().min(1).max(128),
      roomCode: z.string().min(1).max(MAX_ROOM_CODE_LEN),
      fromDeviceName: z.string().min(1).max(128),
      fromOs: z.string().min(1).max(64),
      targetPeerId: z.string().min(1).max(128),
      sdp: z.string().min(1),
    }))
    .query(({ input }) => {
      if (!canRelay(input.fromPeerId, input.targetPeerId, input.roomCode)) {
        return { ok: false };
      }
      const queue = messages.get(input.targetPeerId) || [];
      queue.push({
        kind: "offer",
        fromPeerId: input.fromPeerId,
        fromDeviceName: input.fromDeviceName,
        fromOs: input.fromOs,
        data: { sdp: input.sdp },
        timestamp: Date.now(),
      });
      messages.set(input.targetPeerId, queue);
      console.log("[SIG] Offer queued from", input.fromPeerId.slice(0, 8), "to", input.targetPeerId.slice(0, 8));
      return { ok: true };
    }),

  sendAnswer: publicQuery
    .input(z.object({
      fromPeerId: z.string().min(1).max(128),
      roomCode: z.string().min(1).max(MAX_ROOM_CODE_LEN),
      fromDeviceName: z.string().min(1).max(128),
      fromOs: z.string().min(1).max(64),
      targetPeerId: z.string().min(1).max(128),
      sdp: z.string().min(1),
    }))
    .query(({ input }) => {
      if (!canRelay(input.fromPeerId, input.targetPeerId, input.roomCode)) {
        return { ok: false };
      }
      const queue = messages.get(input.targetPeerId) || [];
      queue.push({
        kind: "answer",
        fromPeerId: input.fromPeerId,
        fromDeviceName: input.fromDeviceName,
        fromOs: input.fromOs,
        data: { sdp: input.sdp },
        timestamp: Date.now(),
      });
      messages.set(input.targetPeerId, queue);
      console.log("[SIG] Answer queued from", input.fromPeerId.slice(0, 8), "to", input.targetPeerId.slice(0, 8));
      return { ok: true };
    }),

  sendIceCandidate: publicQuery
    .input(z.object({
      fromPeerId: z.string().min(1).max(128),
      roomCode: z.string().min(1).max(MAX_ROOM_CODE_LEN),
      fromDeviceName: z.string().min(1).max(128),
      fromOs: z.string().min(1).max(64),
      targetPeerId: z.string().min(1).max(128),
      candidate: z.string().min(1),
      sdpMid: z.string().nullable(),
      sdpMLineIndex: z.number().nullable(),
    }))
    .query(({ input }) => {
      if (!canRelay(input.fromPeerId, input.targetPeerId, input.roomCode)) {
        return { ok: false };
      }
      const queue = messages.get(input.targetPeerId) || [];
      queue.push({
        kind: "ice-candidate",
        fromPeerId: input.fromPeerId,
        fromDeviceName: input.fromDeviceName,
        fromOs: input.fromOs,
        data: {
          candidate: input.candidate,
          sdpMid: input.sdpMid,
          sdpMLineIndex: input.sdpMLineIndex,
        },
        timestamp: Date.now(),
      });
      messages.set(input.targetPeerId, queue);
      return { ok: true };
    }),
});