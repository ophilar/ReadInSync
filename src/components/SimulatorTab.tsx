import React, { useRef, useEffect } from "react";
import { RefreshCw, Shuffle, Monitor, Smartphone, ExternalLink, Trash2, Plus, Lock } from "lucide-react";

export interface SyncSession {
  id: string;
  url: string;
  percent: number;
  updatedAt: string;
  title: string;
}

interface SimulatorTabProps {
  syncId: string;
  setSyncId: (id: string) => void;
  syncPassword: string;
  setSyncPassword: (pwd: string) => void;
  syncSessions: SyncSession[];
  selectedSessionId: string;
  setSelectedSessionId: (id: string) => void;
  customUrl: string;
  setCustomUrl: (url: string) => void;
  customTitle: string;
  setCustomTitle: (title: string) => void;
  customPercent: number;
  setCustomPercent: (pct: number) => void;
  activeSession: SyncSession | undefined;
  currentSelectionPercent: number;
  updateSelectedPercent: (val: number) => void;
  addNewSession: (e: React.FormEvent) => void;
  deleteSession: (id: string, e: React.MouseEvent) => void;
  simulatedIv: string;
  simulatedCiphertext: string;
}

export default function SimulatorTab({
  syncId,
  setSyncId,
  syncPassword,
  setSyncPassword,
  syncSessions,
  selectedSessionId,
  setSelectedSessionId,
  customUrl,
  setCustomUrl,
  customTitle,
  setCustomTitle,
  customPercent,
  setCustomPercent,
  activeSession,
  currentSelectionPercent,
  updateSelectedPercent,
  addNewSession,
  deleteSession,
  simulatedIv,
  simulatedCiphertext
}: SimulatorTabProps) {
  
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Synchronize DOM elements scroll position to keep visual sync matching slider ratio
  useEffect(() => {
    if (desktopRef.current) {
      const el = desktopRef.current;
      el.scrollTop = currentSelectionPercent * (el.scrollHeight - el.clientHeight);
    }
  }, [currentSelectionPercent]);

  useEffect(() => {
    if (mobileRef.current) {
      const el = mobileRef.current;
      el.scrollTop = currentSelectionPercent * (el.scrollHeight - el.clientHeight);
    }
  }, [currentSelectionPercent]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* Left Column: Device Alignment Coordinator */}
      <div className="lg:col-span-8 space-y-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-md font-semibold text-slate-900">Side-By-Side Reading Coordinator</h3>
              <p className="text-xs text-slate-500 mt-0.5">Calculates and aligns vertical scroll positions relative to viewport heights.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-mono">
              <RefreshCw size={12} className="animate-spin" />
              <span>Secure Channel Active</span>
            </div>
          </div>

          {/* Profile Pairing Settings in Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-6">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Simulated Sync Profile ID</label>
              <input
                type="text"
                value={syncId}
                onChange={(e) => setSyncId(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Simulated E2EE Sync Password</label>
              <input
                type="password"
                value={syncPassword}
                onChange={(e) => setSyncPassword(e.target.value)}
                className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Simulated Article Box */}
          {activeSession ? (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">Active Simulated Tab</span>
                  <h4 className="text-sm font-medium text-slate-800 mt-1">{activeSession.title}</h4>
                  <a href={activeSession.url} target="_blank" rel="noreferrer" className="text-xs text-[#2563eb] hover:underline inline-flex items-center gap-1 mt-1 font-mono break-all">
                    {activeSession.url}
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-mono">URL Hash</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono">{activeSession.id}</span>
                </div>
              </div>

              {/* Math engine block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-mono">SCROLL PERCENT</p>
                  <p className="text-lg font-bold text-slate-900 font-mono">{(currentSelectionPercent * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-mono">DESKTOP PIXEL Y</p>
                  <p className="text-lg font-semibold text-slate-800 font-mono">{~~(currentSelectionPercent * 3400)}px</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-400 font-mono">MOBILE PIXEL Y</p>
                  <p className="text-lg font-semibold text-slate-800 font-mono">{~~(currentSelectionPercent * 5800)}px</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No synchronized link selected.</div>
          )}

          {/* Simulated Firestore Document State (Zero Knowledge) */}
          <div className="bg-slate-950 rounded-xl p-4.5 mb-6 border border-slate-800 text-slate-300 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <span className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1.5">
                <Lock size={12} />
                Firestore Node Representation (Zero-Knowledge)
              </span>
              <span className="text-[9px] text-slate-500">Path: /users/{syncId}/scroll_states/{activeSession?.id}</span>
            </div>
            <pre className="text-[10px] text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`{
  "ciphertext": "${simulatedCiphertext}",
  "iv": "${simulatedIv}",
  "updatedAt": "${activeSession ? activeSession.updatedAt : new Date().toISOString()}"
}`}
            </pre>
          </div>

          {/* Scroll Coordinator Control Slider */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Shuffle size={13} className="text-slate-500" />
                Simulated Scroll Controller (Slide to test updates)
              </label>
              <span className="text-xs font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                Ratio: {currentSelectionPercent.toFixed(4)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={currentSelectionPercent}
              onChange={(e) => updateSelectedPercent(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
              <span>TOP OF PAGE (0%)</span>
              <span>CENTER VIEWPORT (50%)</span>
              <span>BOTTOM (100%)</span>
            </div>
          </div>

          {/* Mock Phone and Desktop Devices Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Simulated Desktop Visualizer */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-100">
              <div className="bg-slate-800 px-4 py-2 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor size={14} className="text-slate-300" />
                  <span className="text-xs font-mono font-semibold">Firefox Desktop View</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">1920x1080</span>
              </div>
              <div className="p-4 bg-slate-50 h-[320px] relative overflow-hidden flex flex-col">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs font-mono text-slate-500 mb-3 border border-slate-200">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                  <div className="bg-white px-2 py-0.5 text-[10px] rounded border border-slate-300 overflow-hidden text-ellipsis whitespace-nowrap flex-grow">
                    {activeSession ? activeSession.url : "https://example.com"}
                  </div>
                </div>

                <div 
                  className="flex-grow bg-white border border-slate-200 rounded p-4 overflow-y-auto relative"
                  style={{ scrollBehavior: "smooth" }}
                  ref={desktopRef}
                >
                  <div className="space-y-4">
                    <p className="h-4 bg-slate-200 rounded w-3/4"></p>
                    <h5 className="font-bold text-slate-800 text-sm h-6 pt-1">I. The Paradigm of Scroll Synchronization</h5>
                    <p className="text-xs text-slate-600 leading-normal">
                      Modern web content layouts reflow text elements based on absolute container constraints. A desktop screen offers an extremely dense landscape, whereas mobile viewports prioritize readability stacks.
                    </p>
                    <p className="text-xs text-slate-600 leading-normal">
                      Using pixel-precise heights fails catastrophically when hopping across hardware architectures. By shifting coordinates strictly into document scroll dimension ratios, our synchronizer achieves zero-flaws reading continuity.
                    </p>
                    <h5 className="font-bold text-slate-800 text-sm h-6 pt-1">II. Resilient Storage Pipeline</h5>
                    <p className="text-xs text-slate-600 leading-normal bg-amber-50 border-l-2 border-amber-400 p-2 font-mono">
                      [Sync Event Handlers]
                      Local Cache - Latency - Null Updates
                      Wait to settle debounced frame state...
                    </p>
                  </div>
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-indigo-500 opacity-60 flex justify-end pr-2 pointer-events-none transition-all duration-100"
                    style={{ top: `${currentSelectionPercent * 90 + 5}%` }}
                  >
                    <span className="bg-indigo-600 text-white text-[9px] px-1 rounded -translate-y-2.5">Sync Line</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Mobile Device Visualizer */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-100">
              <div className="bg-slate-800 px-4 py-2 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={14} className="text-slate-300" />
                  <span className="text-xs font-mono font-semibold">Firefox Mobile View</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">412x915</span>
              </div>
              <div className="p-4 bg-slate-50 h-[320px] relative overflow-hidden flex flex-col">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs font-mono text-slate-500 mb-3 border border-slate-200">
                  <div className="bg-white px-2 py-0.5 text-[10px] rounded border border-slate-300 overflow-hidden text-ellipsis whitespace-nowrap w-full">
                    {activeSession ? activeSession.url : "https://example.com"}
                  </div>
                </div>

                <div 
                  className="flex-grow bg-white border border-slate-200 rounded p-4 overflow-y-auto relative"
                  style={{ scrollBehavior: "smooth" }}
                  ref={mobileRef}
                >
                  <div className="space-y-4">
                    <p className="h-4 bg-slate-200 rounded w-1/2"></p>
                    <h5 className="font-bold text-slate-800 text-xs h-6 pt-1">I. The Paradigm of Scroll Synchronization</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Modern web content layouts reflow text elements based on absolute container constraints.
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      A desktop screen offers an extremely dense landscape, whereas mobile viewports prioritize readability stacks.
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Using pixel-precise heights fails catastrophically when hopping across hardware architectures.
                    </p>
                    <h5 className="font-bold text-slate-800 text-xs h-6 pt-1">II. Resilient Storage Pipeline</h5>
                  </div>
                  <div 
                    className="absolute left-0 right-0 border-t-2 border-indigo-500 opacity-60 flex justify-end pr-2 pointer-events-none transition-all duration-100"
                    style={{ top: `${currentSelectionPercent * 90 + 5}%` }}
                  >
                    <span className="bg-indigo-600 text-white text-[9px] px-1 rounded -translate-y-2.5">Sync Line</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Links Session Feed / Add Custom Links */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Linked Devices Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Active Synced Devices
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <Monitor size={15} className="text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-700 block">Workspace Desktop</span>
                  <span className="text-[10px] text-slate-400 font-mono">Firefox - Win11</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100/60 text-emerald-700 font-semibold rounded-full text-[10px]">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <Smartphone size={15} className="text-slate-600" />
                <div>
                  <span className="font-semibold text-slate-700 block">Pixel 8 Mobile</span>
                  <span className="text-[10px] text-slate-400 font-mono">Firefox Nightly</span>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100/60 text-emerald-700 font-semibold rounded-full text-[10px]">Connected</span>
            </div>
          </div>
        </div>

        {/* Saved Webpages List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Synchronized Pages</h3>
            <span className="text-[10px] px-2 py-0.5 bg-slate-100 font-mono text-slate-600 rounded">
              {syncSessions.length} active
            </span>
          </div>

          <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
            {syncSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                  selectedSessionId === session.id
                    ? "bg-indigo-50 border-indigo-400 text-indigo-800"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium line-clamp-1">{session.title}</span>
                  <button
                    onClick={(e) => deleteSession(session.id, e)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-all"
                    title="Unsync page"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                  <span>Reading Pos: <b>{(session.percent * 100).toFixed(0)}%</b></span>
                  <span>{new Date(session.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Custom Simulated Link Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 block border-b border-slate-150 pb-2">Inject Custom Page Connection</h3>
          <form onSubmit={addNewSession} className="space-y-3.5">
            <div>
              <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Webpage URL</label>
              <input
                type="url"
                placeholder="https://example.com/blog..."
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Custom Display Title</label>
              <input
                type="text"
                placeholder="E.g., fast fourier transform story"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Initial Scroll %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(customPercent * 100)}
                  onChange={(e) => setCustomPercent(parseInt(e.target.value || "0") / 100)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg inline-flex items-center gap-1 mt-5 transition-all w-fit"
              >
                <Plus size={14} /> Connect Link
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
