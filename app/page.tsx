"use client";
import { useState } from "react";

const PUBLIC_SUBS = [
  { label: "💦 BPB Normal", url: "/api/sub" },
];

function xrayJsonToUris(jsonText: string): string[] {
  let configs: any[];
  try {
    configs = JSON.parse(jsonText);
    if (!Array.isArray(configs)) configs = [configs];
  } catch {
    throw new Error("Invalid JSON");
  }

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

export default function Home() {
  const [jsonInput, setJsonInput] = useState("");
  const [uriOutput, setUriOutput] = useState("");
  const [subUrl, setSubUrl] = useState("");
  const [autoSubUrl, setAutoSubUrl] = useState("");
  const [selectedSub, setSelectedSub] = useState(PUBLIC_SUBS[0].url);
  const [copied, setCopied] = useState("");
  const [fetchLoading, setFetchLoading] = useState(false);
  const [convertError, setConvertError] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleConvert = () => {
    setConvertError("");
    try {
      const uris = xrayJsonToUris(jsonInput);
      if (uris.length === 0) {
        setConvertError("No VLESS/Trojan configs found.");
        return;
      }
      setUriOutput(uris.join("\n"));
    } catch (e: any) {
      setConvertError(e.message);
    }
  };

  const handleFetchExport = async () => {
    if (!subUrl.trim()) return;
    setFetchLoading(true);
    try {
      const res = await fetch(`/api/convert?url=${encodeURIComponent(subUrl)}`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "converted-configs.txt";
      a.click();
    } catch {
      alert("Failed to fetch.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleAutoSub = () => {
    if (!subUrl.trim()) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setAutoSubUrl(`${base}/api/convert?url=${encodeURIComponent(subUrl)}`);
  };

  const previewUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${selectedSub}`
      : selectedSub;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0e1a; --surface: #111827; --surface2: #1a2235;
          --border: #1f2d45; --accent: #38bdf8; --accent2: #818cf8;
          --accent3: #34d399; --text: #e2e8f0; --muted: #64748b; --danger: #f87171;
        }
        body { font-family: 'Sora', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; line-height: 1.6; }
        .noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.4; }
        .glow-orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(120px); opacity: 0.12; }
        .orb1 { width: 600px; height: 600px; background: var(--accent); top: -200px; left: -100px; }
        .orb2 { width: 500px; height: 500px; background: var(--accent2); bottom: -100px; right: -100px; }
        .container { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
        header { text-align: center; padding: 3rem 0 2.5rem; border-bottom: 1px solid var(--border); margin-bottom: 2.5rem; }
        .logo { display: inline-flex; align-items: center; gap: 0.6rem; font-size: 1.8rem; font-weight: 700; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
        header p { color: var(--muted); font-size: 0.95rem; font-weight: 300; }
        .section { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.75rem; margin-bottom: 1.5rem; }
        .section-title { font-size: 1rem; font-weight: 600; color: var(--accent); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .tab-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .tab-btn { padding: 0.45rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2); color: var(--muted); font-family: 'Sora', sans-serif; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
        .tab-btn:hover { border-color: var(--accent); color: var(--accent); }
        .tab-btn.active { background: linear-gradient(135deg, #0ea5e920, #818cf820); border-color: var(--accent); color: var(--accent); }
        .url-row { display: flex; align-items: center; gap: 0.75rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
        .url-label { color: var(--muted); font-size: 0.8rem; white-space: nowrap; }
        .url-value { font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .btn { padding: 0.5rem 1.1rem; border-radius: 8px; border: none; cursor: pointer; font-family: 'Sora', sans-serif; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; white-space: nowrap; }
        .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #0a0e1a; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn-ghost { background: var(--surface2); color: var(--muted); border: 1px solid var(--border); }
        .btn-ghost:hover { color: var(--accent); border-color: var(--accent); }
        .btn-success { background: var(--accent3); color: #0a0e1a; }
        .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 640px) { .grid2 { grid-template-columns: 1fr; } }
        textarea { width: 100%; height: 220px; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; padding: 0.85rem 1rem; resize: vertical; transition: border-color 0.2s; outline: none; }
        textarea:focus { border-color: var(--accent); }
        textarea::placeholder { color: var(--muted); }
        .textarea-label { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.4rem; display: block; }
        .btn-row { display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin: 0.75rem 0; flex-wrap: wrap; }
        .error-msg { color: var(--danger); font-size: 0.82rem; background: #f871711a; border: 1px solid #f8717130; border-radius: 8px; padding: 0.6rem 0.9rem; margin-top: 0.5rem; }
        .input-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
        input[type="text"] { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; padding: 0.7rem 1rem; outline: none; transition: border-color 0.2s; }
        input[type="text"]:focus { border-color: var(--accent); }
        input[type="text"]::placeholder { color: var(--muted); font-family: 'Sora', sans-serif; }
        .auto-url-box { background: var(--surface2); border: 1px solid var(--accent3); border-radius: 10px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
        .auto-url-box .url-value { color: var(--accent3); }
        .how-to { background: var(--surface2); border-radius: 10px; padding: 1.1rem 1.25rem; margin-top: 1rem; }
        .how-to h4 { font-size: 0.85rem; color: var(--accent2); margin-bottom: 0.6rem; }
        .how-to ol { padding-left: 1.2rem; color: var(--muted); font-size: 0.82rem; line-height: 2; }
        .badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 6px; font-size: 0.7rem; font-weight: 600; background: linear-gradient(135deg, #38bdf820, #818cf820); border: 1px solid var(--accent); color: var(--accent); margin-left: 0.4rem; }
      `}</style>

      <div className="glow-orb orb1" />
      <div className="glow-orb orb2" />

      <div className="container">
        <header>
          <div className="logo">🌊 V2Ray JSON Converter</div>
          <p>Convert xray/V2Ray JSON configs to standard VLESS &amp; Trojan URI format</p>
        </header>

        <div className="section">
          <div className="section-title">✨ Public Subscriptions</div>
          <div className="tab-row">
            {PUBLIC_SUBS.map((s) => (
              <button
                key={s.url}
                className={"tab-btn" + (selectedSub === s.url ? " active" : "")}
                onClick={() => setSelectedSub(s.url)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="url-row">
            <span className="url-label">Preview URL:</span>
            <span className="url-value">{previewUrl}</span>
            <button
              className={"btn " + (copied === "pub" ? "btn-success" : "btn-ghost")}
              onClick={() => copy(previewUrl, "pub")}
            >
              {copied === "pub" ? "✓ Copied" : "📋 Copy Link"}
            </button>
          </div>
        </div>

        <div className="section">
          <div className="section-title">⚡ JSON Input</div>
          <div className="grid2">
            <div>
              <span className="textarea-label">Paste V2Ray JSON (array format)</span>
              <textarea
                placeholder='[{"remarks":"proxy","outbounds":[...]}]'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
              />
            </div>
            <div>
              <span className="textarea-label">URI Output</span>
              <textarea
                readOnly
                placeholder="vless://... or trojan://... will appear here"
                value={uriOutput}
              />
            </div>
          </div>
          {convertError && <div className="error-msg">⚠️ {convertError}</div>}
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setJsonInput(""); setUriOutput(""); setConvertError(""); }}>
              Clear
            </button>
            <button className="btn btn-primary" onClick={handleConvert}>
              ⚡ Convert to URI
            </button>
            {uriOutput && (
              <button
                className={"btn " + (copied === "uri" ? "btn-success" : "btn-ghost")}
                onClick={() => copy(uriOutput, "uri")}
              >
                {copied === "uri" ? "✓ Copied" : "📋 Copy URIs"}
              </button>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            🚀 Auto-Convert Subscription URL
            <span className="badge">Recommended</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
            Paste your original JSON subscription URL — get a live-converting URL for your V2Ray client.
          </p>
          <div className="input-row">
            <input
              type="text"
              placeholder="https://your-sub-url.example.com/sub/..."
              value={subUrl}
              onChange={(e) => { setSubUrl(e.target.value); setAutoSubUrl(""); }}
            />
            <button className="btn btn-primary" onClick={handleAutoSub}>
              ✨ Generate
            </button>
          </div>
          {autoSubUrl && (
            <div className="auto-url-box">
              <span className="url-value">{autoSubUrl}</span>
              <button
                className={"btn " + (copied === "auto" ? "btn-success" : "btn-ghost")}
                onClick={() => copy(autoSubUrl, "auto")}
              >
                {copied === "auto" ? "✓ Copied" : "📋 Copy URL"}
              </button>
            </div>
          )}
          <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              className="btn btn-ghost"
              onClick={handleFetchExport}
              disabled={fetchLoading || !subUrl.trim()}
              style={{ opacity: !subUrl.trim() ? 0.5 : 1 }}
            >
              {fetchLoading ? "⏳ Fetching..." : "⬇️ Fetch & Export"}
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Downloads a .txt file with all converted URIs</span>
          </div>
          <div className="how-to">
            <h4>📱 How to use in your V2Ray client:</h4>
            <ol>
              <li>Enter your original JSON subscription URL above</li>
              <li>Click Generate to get the auto-converting URL</li>
              <li>Copy and add it to your V2Ray client (v2rayNG, Nekoray, Hiddify, etc.)</li>
              <li>Configs auto-convert on every subscription update!</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
