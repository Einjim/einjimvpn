import { NextRequest, NextResponse } from "next/server";

function xrayJsonToUris(configs: any[]): string[] {
  const uris: string[] = [];

  for (const config of configs) {
    const remarks = config.remarks || "proxy";
    const outbounds: any[] = config.outbounds || [];

    const proxyOutbounds = outbounds.filter(
      (o: any) =>
        (o.protocol === "vless" || o.protocol === "trojan") &&
        o.tag?.startsWith("proxy")
    );

    for (const outbound of proxyOutbounds) {
      const ss = outbound.streamSettings || {};
      const ws = ss.wsSettings || {};
      const tls = ss.tlsSettings || {};
      const params = new URLSearchParams();
      params.set("type", ss.network || "tcp");
      params.set("security", ss.security || "none");
      if (ws.host) params.set("host", ws.host);
      if (ws.path) params.set("path", ws.path);
      if (tls.serverName) params.set("sni", tls.serverName);
      if (tls.fingerprint) params.set("fp", tls.fingerprint);
      if (tls.alpn?.length) params.set("alpn", tls.alpn.join(","));

      let uri = "";
      if (outbound.protocol === "vless") {
        const vnext = outbound.settings?.vnext?.[0];
        if (!vnext) continue;
        const user = vnext.users[0];
        if (user.encryption) params.set("encryption", user.encryption);
        uri = `vless://${user.id}@${vnext.address}:${vnext.port}?${params}#${encodeURIComponent(remarks)}`;
      } else if (outbound.protocol === "trojan") {
        const server = outbound.settings?.servers?.[0];
        if (!server) continue;
        uri = `trojan://${encodeURIComponent(server.password)}@${server.address}:${server.port}?${params}#${encodeURIComponent(remarks)}`;
      }

      if (uri && !uris.includes(uri)) uris.push(uri);
    }
  }

  return uris;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return new NextResponse("Missing ?url= parameter", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "v2rayN/6.0" },
    });

    if (!res.ok) {
      return new NextResponse("Failed to fetch source URL", { status: 502 });
    }

    let configs: any[];
    try {
      const data = await res.json();
      configs = Array.isArray(data) ? data : [data];
    } catch {
      return new NextResponse("Source URL did not return valid JSON", { status: 422 });
    }

    const uris = xrayJsonToUris(configs);
    const subscription = Buffer.from(uris.join("\n")).toString("base64");

    return new NextResponse(subscription, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
