import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";

type IceCandidateInit = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
};

type PeerIdentity = {
  peerId: string;
  deviceName: string;
  os: string;
};

type SignalingMessage =
  | { kind: "presence"; peerId: string; deviceName: string; os: string }
  | { kind: "presence-ack"; peerId: string; deviceName: string; os: string }
  | { kind: "peer-list"; peers: PeerIdentity[] }
  | { kind: "peer-gone"; peerId: string }
  | { kind: "offer"; peerId: string; targetPeerId: string; sdp: string; type: "offer"; deviceName: string; os: string }
  | { kind: "answer"; peerId: string; targetPeerId: string; sdp: string; type: "answer"; deviceName: string; os: string }
  | { kind: "ice-candidate"; peerId: string; targetPeerId: string; candidate: IceCandidateInit; deviceName: string; os: string };

type PeerConnection = {
  ws: WebSocket;
  info: PeerIdentity;
};

export class SignalingServer {
  private peers = new Map<string, PeerConnection>();
  private wss: WebSocketServer | null = null;

  attach(server: Server, path: string = "/ws") {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
      let peerId: string | null = null;
      let pingTimer: ReturnType<typeof setInterval> | null = null;

      ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as SignalingMessage;

          switch (msg.kind) {
            case "presence": {
              peerId = msg.peerId;
              const existing = this.peers.get(peerId);
              if (existing) {
                try { existing.ws.close(); } catch { /* ignore */ }
              }
              this.peers.set(peerId, {
                ws,
                info: { peerId: msg.peerId, deviceName: msg.deviceName, os: msg.os },
              });

              ws.send(JSON.stringify({ kind: "peer-list", peers: this.getPeerList() }));
              this.broadcast(
                { kind: "presence-ack", peerId: msg.peerId, deviceName: msg.deviceName, os: msg.os },
                peerId,
              );
              break;
            }

            case "offer": {
              this.sendToPeer(msg.targetPeerId, {
                kind: "offer",
                peerId: msg.peerId,
                deviceName: msg.deviceName,
                os: msg.os,
                targetPeerId: msg.targetPeerId,
                sdp: msg.sdp,
                type: msg.type,
              });
              break;
            }

            case "answer": {
              this.sendToPeer(msg.targetPeerId, {
                kind: "answer",
                peerId: msg.peerId,
                deviceName: msg.deviceName,
                os: msg.os,
                targetPeerId: msg.targetPeerId,
                sdp: msg.sdp,
                type: msg.type,
              });
              break;
            }

            case "ice-candidate": {
              this.sendToPeer(msg.targetPeerId, {
                kind: "ice-candidate",
                peerId: msg.peerId,
                deviceName: msg.deviceName,
                os: msg.os,
                targetPeerId: msg.targetPeerId,
                candidate: msg.candidate,
              });
              break;
            }
          }
        } catch {
          // ignore
        }
      });

      ws.on("close", () => {
        if (pingTimer) clearInterval(pingTimer);
        if (peerId) this.removePeer(peerId);
      });

      ws.on("error", () => {
        if (pingTimer) clearInterval(pingTimer);
        if (peerId) this.removePeer(peerId);
      });

      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else if (pingTimer) {
          clearInterval(pingTimer);
        }
      }, 30000);
    });
  }

  private broadcast(msg: SignalingMessage, excludePeerId?: string) {
    const payload = JSON.stringify(msg);
    for (const [id, conn] of this.peers) {
      if (id !== excludePeerId && conn.ws.readyState === WebSocket.OPEN) {
        try { conn.ws.send(payload); } catch { /* */ }
      }
    }
  }

  private sendToPeer(peerId: string, msg: SignalingMessage) {
    const conn = this.peers.get(peerId);
    if (conn && conn.ws.readyState === WebSocket.OPEN) {
      try { conn.ws.send(JSON.stringify(msg)); } catch { /* */ }
    }
  }

  private getPeerList(): PeerIdentity[] {
    return Array.from(this.peers.values()).map(c => c.info);
  }

  private removePeer(peerId: string) {
    this.peers.delete(peerId);
    this.broadcast({ kind: "peer-gone", peerId });
  }
}
