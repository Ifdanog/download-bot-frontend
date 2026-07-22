import { useState, useRef } from "react";
import { Download, Image as ImageIcon, Loader2 } from "lucide-react";

// Point this at your deployed backend URL when the frontend is hosted
// separately (e.g. on Netlify). Leave empty for local dev (same origin).
const API_BASE = "https://download-bot-backend.onrender.com/";

export default function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState(null); // { title, thumbnail, qualities }
  const [selectedHeight, setSelectedHeight] = useState("");
  const [error, setError] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState(null); // { filename, url }
  const [savingThumb, setSavingThumb] = useState(false);

  const esRef = useRef(null);

  const selectedQuality = info?.qualities?.find(
    (q) => String(q.height) === String(selectedHeight)
  );

  async function handleCheck(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setInfo(null);
    setResult(null);
    setChecking(true);

    try {
      const res = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not fetch video info.");

      setInfo(data);
      const qualities = data.qualities || [];
      setSelectedHeight(qualities.length ? String(qualities[0].height) : "");
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleSaveThumbnail() {
    if (!info) return;
    setSavingThumb(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/thumbnail?url=${encodeURIComponent(url.trim())}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not fetch thumbnail.");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = (info.title || "thumbnail").replace(/[\\/:*?"<>|]/g, "_");
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingThumb(false);
    }
  }

  function handleDownloadVideo() {
    if (!info) return;
    setError("");
    setResult(null);
    setProgress(0);
    setStatusMsg("Connecting…");
    setDownloading(true);

    const query = selectedHeight
      ? `url=${encodeURIComponent(url.trim())}&height=${encodeURIComponent(selectedHeight)}`
      : `url=${encodeURIComponent(url.trim())}`;

    const es = new EventSource(`${API_BASE}/api/download?${query}`);
    esRef.current = es;

    es.addEventListener("status", (e) => {
      setStatusMsg(JSON.parse(e.data).message);
    });

    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.percent);
      setStatusMsg(`Downloading… ${data.percent.toFixed(1)}%`);
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      setProgress(100);
      setStatusMsg("Done.");
      setResult(data);
      es.close();
      setDownloading(false);
    });

    es.addEventListener("error", (e) => {
      let message = "Something went wrong. Check the link and try again.";
      try {
        if (e.data) message = JSON.parse(e.data).message;
      } catch (_) {}
      setError(message);
      es.close();
      setDownloading(false);
    });
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-[#e8eaed] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-[#14171b] border border-[#23272d] rounded-xl p-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3d8bff] shadow-[0_0_8px_#3d8bff]" />
          <span className="font-mono text-xs tracking-widest uppercase text-[#3d8bff]">
            local · not uploaded anywhere
          </span>
        </div>

        <h1 className="text-xl font-semibold mb-1">Paste a link, get the file</h1>
        <p className="text-sm text-[#7a8188] mb-7 leading-relaxed">
          Highest available quality, video + audio merged automatically.
        </p>

        <form onSubmit={handleCheck} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            autoComplete="off"
            className="flex-1 bg-[#0e1114] border border-[#23272d] focus:border-[#3d8bff] rounded-md px-3.5 py-3 text-sm font-mono outline-none placeholder-[#4a5158] transition-colors"
          />
          <button
            type="submit"
            disabled={checking}
            className="bg-[#3d8bff] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 rounded-md px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2"
          >
            {checking && <Loader2 className="w-4 h-4 animate-spin" />}
            {checking ? "Checking…" : "Check"}
          </button>
        </form>

        {info && (
          <div className="mt-6 border border-[#23272d] rounded-lg overflow-hidden bg-[#0e1114]">
            {info.thumbnail && (
              <img
                src={info.thumbnail}
                alt="Video thumbnail"
                className="w-full aspect-video object-cover bg-black block"
              />
            )}
            <div className="p-4">
              <p className="text-sm font-semibold mb-3 line-clamp-2">{info.title}</p>

              <div className="flex gap-2 flex-wrap mb-4">
                <select
                  value={selectedHeight}
                  onChange={(e) => setSelectedHeight(e.target.value)}
                  className="font-mono text-[11px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-[#1d3a63] bg-[#0e1114] text-[#3d8bff] outline-none cursor-pointer"
                >
                  {(info.qualities || []).length === 0 && (
                    <option value="">Best available</option>
                  )}
                  {(info.qualities || []).map((q) => (
                    <option key={q.height} value={q.height}>
                      {q.label}
                    </option>
                  ))}
                </select>
                {selectedQuality && (
                  <span className="font-mono text-[11px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-[#35c98f]/30 text-[#35c98f]">
                    {selectedQuality.filesizeHuman}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDownloadVideo}
                  disabled={downloading}
                  className="flex-1 bg-[#3d8bff] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 rounded-md px-4 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? "Working…" : "Download video"}
                </button>
                <button
                  onClick={handleSaveThumbnail}
                  disabled={savingThumb}
                  className="flex-1 bg-transparent border border-[#23272d] hover:border-[#3d8bff] disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {savingThumb ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  {savingThumb ? "Saving…" : "Save thumbnail"}
                </button>
              </div>
            </div>
          </div>
        )}

        {downloading || (result && progress > 0) ? (
          <div className="mt-6">
            <div className="h-1.5 bg-[#0e1114] border border-[#23272d] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3d8bff] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 font-mono text-xs text-[#7a8188] truncate">{statusMsg}</div>
          </div>
        ) : null}

        {result && (
          <div className="mt-5 p-4 border border-[#35c98f] bg-[#35c98f]/[0.08] rounded-lg flex items-center justify-between gap-3">
            <div className="font-mono text-[13px] truncate">{result.filename}</div>
            <a
              href={`${API_BASE}${result.url}`}
              download={result.filename}
              className="bg-[#35c98f] text-[#05130d] font-bold text-[13px] no-underline px-3.5 py-2 rounded-md whitespace-nowrap"
            >
              Save file
            </a>
          </div>
        )}

        {error && (
          <div className="mt-5 px-4 py-3.5 border border-[#ff5c5c] bg-[#ff5c5c]/[0.08] rounded-lg text-[#ff9d9d] font-mono text-[13px]">
            {error}
          </div>
        )}

        <p className="mt-6 text-xs text-[#4a5158] leading-relaxed">
          Only for content you own, have permission to download, or that's licensed for it
          (Creative Commons, your own uploads). Respect YouTube's terms and copyright law.
        </p>
      </div>
    </div>
  );
}