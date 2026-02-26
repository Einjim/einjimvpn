import { NextResponse } from "next/server";

const SOURCE_URL =
  "https://silent-bush-1523.alirezaa-jafari-98.workers.dev/sub/normal/rKNcg_%40x_F_p_xHP?app=xray";

interface XrayConfig {
  remarks?: string;
  outbounds?: Outbound[];
}

interface Outbound {
  protocol: string;
  tag?: string;
  settings?: {
    vnext?: VnextServer[];
    servers?: TrojanServer[];
  };
  streamSettings?: StreamSettings;
}

interface VnextServer {
  address: string;
  port: number;
  users: { id: string; encryption?: string }[];
}

interface TrojanServer {
  address: string;
  port: number;
  password: string;
}

interface StreamSettings {
  network?: string;
  security?: string;
  wsSettings?: {
    host?: string;
    path?: string;
  };
  tlsSettings?: {
    serverName?: string;
    fingerprint?: string;
    alpn?: string[];
    allowInsecure?: boolean;
  };
}

function convertVlessOutbound(
  outbound: Outbound,
  remarks: string
): string | null {
  const vnext = outbound.settings?.vnext?.[0];
  if (!vnext) return null;

  const user = vnext.users[0];
  const ss = outbound.streamSettings;
  const ws = ss?.wsSettings;
  const tls = ss?.tlsSettings;

  const params = new URLSearchParams();
  params.set("type", ss?.network || "tcp");
  params.set("security", ss?.security || "none");

  if (ws?.host) params.set("host", ws.host);
  if (ws?.path) params.set("path", ws.path);
  if (tls?.serverName) params.set("sni", tls.serverName);
  if (tls?.fingerprint) params.set("fp", tls.fingerprint);
  if (tls?.alpn?.length) params.set("alpn", tls.alpn.join(","));
  if (user.encryption) params.set("encryption", user.encryption);

  const address = vnext.address;
  const port = vnext.port;
  const uuid = user.id;
  const tag = encodeURIComponent(remarks);

  return `vless://${uuid}@${address}:${port}?${params.toString()}#${tag}`;
}

function convertTrojanOutbound(
  outbound: Outbound,
  remarks: string
): string | null {
  const server = outbound.settings?.servers?.[0];
  if (!server) return null;

  const ss = outbound.streamSettings;
  const ws = ss?.wsSettings;
  const tls = ss?.tlsSettings;

  const params = new URLSearchParams();
  params.set("type", ss?.network || "tcp");
  params.set("security", ss?.security || "tls");

  if (ws?.host) params.set("host", ws.host);
  if (ws?.path) params.set("path", ws.path);
  if (tls?.serverName) params.set("sni", tls.serverName);
  if (tls?.fingerprint) params.set("fp", tls.fingerprint);
  if (tls?.alpn?.length) params.set("alpn", tls.alpn.join(","));

  const address = server.address;
  const port = server.port;
  const password = encodeURIComponent(server.password);
  const tag = encodeURIComponent(remarks);

  return `trojan://${password}@${address}:${port}?${params.toString()}#${tag}`;
}

export async function GET() {
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { "User-Agent": "v2rayN/6.0" },
      next: { revalidate: 300 }, // cache 5 minutes
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch source", { status: 502 });
    }

    const configs: XrayConfig[] = await res.json();
    const uris: string[] = [];

    for (const config of configs) {
      const remarks = config.remarks || "proxy";
      const outbounds = config.outbounds || [];

      // Only pick the main proxy outbound (tag === "proxy" or first vless/trojan)
      const proxyOutbounds = outbounds.filter(
        (o) =>
          (o.protocol === "vless" || o.protocol === "trojan") &&
          (o.tag === "proxy" || o.tag?.startsWith("proxy-"))
      );

      // For multi-proxy configs (Best Ping), take all. For single, take first.
      const targets =
        proxyOutbounds.length > 1 ? proxyOutbounds : proxyOutbounds.slice(0, 1);

      for (const outbound of targets) {
        let uri: string | null = null;

        if (outbound.protocol === "vless") {
          uri = convertVlessOutbound(outbound, remarks);
        } else if (outbound.protocol === "trojan") {
          uri = convertTrojanOutbound(outbound, remarks);
        }

        if (uri && !uris.includes(uri)) {
          uris.push(uri);
        }
      }
    }

    // Return as base64-encoded subscription (standard V2Ray/Xray sub format)
    const subscription = Buffer.from(uris.join("\n")).toString("base64");

    return new NextResponse(subscription, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Profile-Update-Interval": "1",
        "Subscription-Userinfo": `upload=0; download=0; total=0; expire=0`,
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
