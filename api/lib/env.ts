import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

function parseIceServers(): IceServerConfig[] {
  const servers: IceServerConfig[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrl = process.env.TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME || undefined,
      credential: process.env.TURN_CREDENTIAL || undefined,
    });
  }

  const extra = process.env.ICE_SERVERS_JSON?.trim();
  if (extra) {
    try {
      const parsed = JSON.parse(extra) as IceServerConfig[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn("[env] ICE_SERVERS_JSON is invalid JSON; using defaults.");
    }
  }

  return servers;
}

export const env = {
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  hasDatabase: Boolean(process.env.DATABASE_URL?.trim()),
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  iceServers: parseIceServers(),
};