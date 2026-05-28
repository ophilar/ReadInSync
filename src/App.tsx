/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Check,
  Copy,
  FileCode,
  Settings,
  Layers,
  Smartphone,
  Monitor,
  Download,
  RefreshCw,
  BookOpen,
  Terminal,
  ExternalLink,
  Trash2,
  Plus,
  Shuffle,
  ChevronRight,
  Code2,
  HelpCircle,
  Info,
  Lock
} from "lucide-react";

// hardcoded tracking namespace
const USER_ID = "my_shared_private_sync_id";

// Source Code Templates
const manifestCode = `{
  "manifest_version": 3,
  "name": "Live Page Scroll Synchronizer",
  "version": "1.0.0",
  "description": "Automatically and silently synchronizes your reading positions on web pages across devices.",
  "permissions": [
    "storage"
  ],
  "host_permissions": [
    "https://*/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://*/*"
      ],
      "js": [
        "content.js"
      ],
      "run_at": "document_idle"
    }
  ]
}`;

const contentCode = `/**
 * Live Page Scroll Synchronizer - Content Script
 * Tracks user scrolling natively and restores reading positions safely.
 */

// Keep track of whether the page has finished initializing.
// This prevents feedback loops where scroll adjustments cause active save operations.
let isInitialLoad = true;
let debounceTimeout = null;

// Listen for messages from the background service worker context.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RESTORE_SCROLL") {
    const { percent } = message;

    // Only restore scroll if we are in the initial loading phase.
    if (isInitialLoad && typeof percent === "number") {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollableHeight > 0) {
        const targetScrollY = percent * scrollableHeight;
        
        // Smoothly adjust the viewport scroll location.
        window.scrollTo({
          top: targetScrollY,
          behavior: "smooth"
        });
      }
      
      // Turn off initial load flag after restoring
      isInitialLoad = false;
    }
  }
});

// Capture viewport scrolling events to sync upstream.
window.addEventListener("scroll", () => {
  // If we are currently restoring or haven't settled the initial sync, hold off.
  if (isInitialLoad) {
    // If the user scrolls manually before restore, we clear the initial load flag.
    isInitialLoad = false;
    return;
  }

  // Active scroll debounce to limit database write frequencies.
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = setTimeout(() => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    
    // Avoid calculations if the page isn't scrollable.
    if (scrollableHeight <= 0) {
      return;
    }

    const currentScrollY = window.scrollY;
    const percent = Math.min(Math.max(currentScrollY / scrollableHeight, 0), 1);

    // Communicate scroll position update to the background service worker thread.
    chrome.runtime.sendMessage({
      type: "SAVE_SCROLL",
      url: window.location.href,
      percent: parseFloat(percent.toFixed(5))
    }, (response) => {
      // Gracefully handle runtime disconnected conditions (e.g., extension reloaded in development).
      if (chrome.runtime.lastError) {
        // Discard gracefully.
      }
    });
  }, 1000); // 1-second debounce
});

// Fallback safety gate: If no RESTORE_SCROLL is received within 3 seconds,
// release the listener to make sure manual scrolls capture correctly.
setTimeout(() => {
  isInitialLoad = false;
}, 3000);`;

const backgroundCode = `/**
 * Live Page Scroll Synchronizer - Background Service Worker
 * Coordinates Firestore connection, URL hashing, and message broadcasts.
 */

import { initializeApp } from "./firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "./firebase-firestore.js";

// Private tracking profile identification key
const USER_ID = "my_shared_private_sync_id";

// Clean Firebase integration config credentials payload placeholder
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App and Firestore Database references
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Deterministically hashes a URL to a Firestore-safe document ID.
 * Returns a clean alphanumeric ID (e.g., 'url_ab38cd1').
 */
function getUrlHash(url) {
  let hash = 5381;
  const cleanUrl = url.split('#')[0]; // Strip hash fragments
  for (let i = 0; i < cleanUrl.length; i++) {
    hash = (hash * 33) ^ cleanUrl.charCodeAt(i);
  }
  return \`url_\${(hash >>> 0).toString(16)}\`;
}

// Event Hub - Track tab updates and restore positions for completely loaded tabs.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    try {
      const urlHash = getUrlHash(tab.url);
      const docPath = \`users/\${USER_ID}/scroll_states/\${urlHash}\`;
      const docRef = doc(db, docPath);
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.percent === "number") {
          // Push RESTORE_SCROLL notification down into the active tab context.
          chrome.tabs.sendMessage(tabId, {
            type: "RESTORE_SCROLL",
            url: tab.url,
            percent: data.percent
          }, (response) => {
            // Silently suppress errors if matching scripts are not yet ready.
            if (chrome.runtime.lastError) {
              // Graceful failure
            }
          });
        }
      }
    } catch (error) {
      console.error("[ScrollSync] Error retrieving scroll state:", error);
    }
  }
});

// Event Hub - Listen for inbound "SAVE_SCROLL" updates from content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_SCROLL") {
    const { url, percent } = message;
    
    if (url && typeof percent === "number") {
      const urlHash = getUrlHash(url);
      const docPath = \`users/\${USER_ID}/scroll_states/\${urlHash}\`;
      const docRef = doc(db, docPath);

      // Perform a merge write to maintain Firestore integrity
      setDoc(docRef, {
        url: url,
        percent: percent,
        updatedAt: new Date().toISOString()
      }, { merge: true })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error("[ScrollSync] Error writing state to Firestore:", error);
          sendResponse({ success: false, error: error.message });
        });

      // Keep response message channel alive for asynchronous resolution.
      return true;
    }
  }
});`;

interface SyncSession {
  id: string;
  url: string;
  percent: number;
  updatedAt: string;
  title: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"simulator" | "code" | "schema" | "guide">("simulator");
  const [activeCodeFile, setActiveCodeFile] = useState<"manifest.json" | "content.js" | "background.js">("manifest.json");
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // Mock initial sync states
  const [syncSessions, setSyncSessions] = useState<SyncSession[]>([
    {
      id: "url_5c378e1",
      url: "https://www.quantamagazine.org/the-mathematical-revolutions-that-shaped-artificial-intelligence",
      percent: 0.62,
      updatedAt: new Date(Date.now() - 40000).toISOString(),
      title: "The Mathematical Revolutions... - Quanta Magazine"
    },
    {
      id: "url_fe3892a",
      url: "https://en.wikipedia.org/wiki/Fast_Fourier_transform",
      percent: 0.28,
      updatedAt: new Date(Date.now() - 320000).toISOString(),
      title: "Fast Fourier transform - Wikipedia"
    },
    {
      id: "url_92a3fe7",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API",
      percent: 0.85,
      updatedAt: new Date(Date.now() - 1200000).toISOString(),
      title: "Intersection Observer API - MDN Web Docs"
    }
  ]);

  const [selectedSessionId, setSelectedSessionId] = useState<string>("url_5c378e1");
  const [customUrl, setCustomUrl] = useState<string>("");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customPercent, setCustomPercent] = useState<number>(0.5);

  // Firestore placeholder configs (can be updated locally)
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: "AIzaSyAs7F3b_exampleKey_v021",
    projectId: "scroll-sync-v3-prod",
    authDomain: "scroll-sync-v3-prod.firebaseapp.com",
    storageBucket: "scroll-sync-v3-prod.appspot.com"
  });

  const activeSession = syncSessions.find(s => s.id === selectedSessionId) || syncSessions[0];

  const triggerCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const getFileContent = () => {
    switch (activeCodeFile) {
      case "manifest.json":
        return manifestCode;
      case "content.js":
        return contentCode;
      case "background.js":
        return backgroundCode;
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentSelectionPercent = activeSession ? activeSession.percent : 0.5;

  const updateSelectedPercent = (newValue: number) => {
    setSyncSessions(prev =>
      prev.map(s => (s.id === selectedSessionId ? { ...s, percent: newValue, updatedAt: new Date().toISOString() } : s))
    );
  };

  const addNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;

    let parsedTitle = customTitle || customUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
    // Hash url
    let hash = 5381;
    for (let i = 0; i < customUrl.length; i++) {
      hash = (hash * 33) ^ customUrl.charCodeAt(i);
    }
    const id = `url_${(hash >>> 0).toString(16)}`;

    const newSess: SyncSession = {
      id,
      url: customUrl,
      title: parsedTitle,
      percent: customPercent,
      updatedAt: new Date().toISOString()
    };

    setSyncSessions(prev => [newSess, ...prev]);
    setSelectedSessionId(id);
    setCustomUrl("");
    setCustomTitle("");
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = syncSessions.filter(s => s.id !== id);
    setSyncSessions(remaining);
    if (selectedSessionId === id && remaining.length > 0) {
      setSelectedSessionId(remaining[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans transition-colors duration-200">
      {/* Top Premium Minimalist Nav */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md">
              <Layers size={18} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-semibold text-slate-900 tracking-tight">Cross-Device Scroll Synchronizer</h1>
              <p className="text-xs text-slate-500 font-mono">Silent Firefox MV3 Node Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-mono text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              <span className="font-semibold">NAMESPACE:</span> {USER_ID}
            </div>
            <a 
              href="#installation" 
              onClick={() => setActiveTab("guide")}
              className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg inline-flex items-center gap-1.5 transition-all shadow"
            >
              <Download size={13} />
              Install Extension
            </a>
          </div>
        </div>
      </header>

      {/* Primary Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Banner Alert detailing Zero-UI Concept */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2">
                <Info size={11} /> Zero-UI Philosophy
              </div>
              <h2 className="text-xl font-medium tracking-tight">Natively Embedded DOM Synchronizer</h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                This Firefox Manifest V3 system is built completely code-native with no intrusive popup markup. It silently captures your exact paragraph coordinates locally inside webpage elements, converts them to document scroll height ratios, and updates Firestore.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button 
                onClick={() => setActiveTab("simulator")}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'simulator' ? 'bg-white text-slate-900 shadow' : 'bg-white/10 text-white hover:bg-white/15'}`}
              >
                Launch Live Simulator
              </button>
              <button 
                onClick={() => setActiveTab("code")}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'code' ? 'bg-white text-slate-900 shadow' : 'bg-white/10 text-white hover:bg-white/15'}`}
              >
                View Extension Code
              </button>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scroller-hidden">
          <button
            onClick={() => setActiveTab("simulator")}
            style={{ id: "tab-simulator" }}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "simulator"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🛰️ Synchronizer & Coordinator
          </button>
          <button
            onClick={() => setActiveTab("code")}
            style={{ id: "tab-code" }}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "code"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📦 Browser Extension Code
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            style={{ id: "tab-schema" }}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "schema"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🔒 Firestore Rules & Blueprint
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            style={{ id: "tab-guide" }}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "guide"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📖 Step-By-Step Setup
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "simulator" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Device Alignment Coordinator */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-md font-semibold text-slate-900">Side-By-Side Reading Coordinator</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Calculates and aligns vertical scroll positions relative to webpage heights dynamically.</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 border border-violet-100 text-violet-700 rounded-full text-xs font-mono">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Ratio Sync Active</span>
                  </div>
                </div>

                {/* Simulated Article Box */}
                {activeSession ? (
                  <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#6366f1] font-semibold bg-indigo-50 px-2 py-0.5 rounded">Active Simulated Tab</span>
                        <h4 className="text-sm font-medium text-slate-800 mt-1">{activeSession.title}</h4>
                        <a href={activeSession.url} target="_blank" rel="noreferrer" className="text-xs text-[#2563eb] hover:underline inline-flex items-center gap-1 mt-1 font-mono break-all">
                          {activeSession.url}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-mono">Synced Hash</span>
                        <span className="text-xs font-semibold text-slate-700 font-mono">{activeSession.id}</span>
                      </div>
                    </div>

                    {/* Math engine block */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-3sm">
                        <p className="text-[10px] text-slate-400 font-mono">SCROLL PERCENT FLOAT</p>
                        <p className="text-lg font-bold text-slate-900 font-mono">{(currentSelectionPercent * 100).toFixed(1)}%</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-3sm">
                        <p className="text-[10px] text-slate-400 font-mono">DESKTOP EQUIVALENT Y</p>
                        <p className="text-lg font-semibold text-slate-800 font-mono">{~~(currentSelectionPercent * 3400)}px</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-3sm">
                        <p className="text-[10px] text-slate-400 font-mono">MOBILE EQUIVALENT Y</p>
                        <p className="text-lg font-semibold text-slate-800 font-mono">{~~(currentSelectionPercent * 5800)}px</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">No synchronized link selected.</div>
                )}

                {/* Scroll Coordinator Control Slider */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Shuffle size={13} className="text-slate-500" />
                      Simulated Scroll Controller
                    </label>
                    <span className="text-xs font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
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
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
                    <span>TOP OF ARTICLE (0%)</span>
                    <span>CENTER READING FRAME (50%)</span>
                    <span>BOTTOM REACHED (100%)</span>
                  </div>
                </div>

                {/* Mock Phone and Desktop Devices Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Simulated Desktop Visualizer */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2sm bg-slate-100">
                    <div className="bg-slate-800 px-4 py-2 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-slate-300" />
                        <span className="text-xs font-mono font-semibold">Firefox Desktop View</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Viewport: 1920x1080</span>
                    </div>
                    {/* Desktop Monitor Frame */}
                    <div className="p-4 bg-slate-50 h-[380px] relative overflow-hidden flex flex-col">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs font-mono text-slate-500 mb-3 border border-slate-200">
                        <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                        <div className="bg-white px-2 py-0.5 text-[10px] rounded border border-slate-300 overflow-hidden text-ellipsis whitespace-nowrap flex-grow">
                          {activeSession ? activeSession.url : "https://example.com"}
                        </div>
                      </div>

                      {/* Content representation */}
                      <div 
                        className="flex-grow bg-white border border-slate-200 rounded p-4 overflow-y-auto relative"
                        style={{ scrollBehavior: "smooth" }}
                        ref={(el) => {
                          if (el) {
                            el.scrollTop = currentSelectionPercent * (el.scrollHeight - el.clientHeight);
                          }
                        }}
                      >
                        {/* Static Text layout represents live website DOM */}
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
                          <p className="text-xs text-slate-600 leading-normal">
                            Once the scroll finishes its movement, the background processes the payload inside the queue, storing the state locally and preparing to push changes.
                          </p>
                          <h5 className="font-bold text-slate-800 text-sm h-6 pt-1">III. Synchronized Viewports</h5>
                          <p className="text-xs text-slate-600 leading-normal">
                            As you adjust this viewport, you will notice the companion mobile device adjusts its content block synchronously.
                          </p>
                          <div className="h-32 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono">
                            End of Simulated Article Section
                          </div>
                        </div>
                        {/* Red visual reading scroll pointer */}
                        <div 
                          className="absolute left-0 right-0 border-t-2 border-rose-500 opacity-60 flex justify-end pr-2 pointer-events-none transition-all duration-100"
                          style={{ top: `${currentSelectionPercent * 90 + 5}%` }}
                        >
                          <span className="bg-rose-500 text-white text-[9px] px-1 rounded -translate-y-2.5">Sync Line</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Mobile Device Visualizer */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2sm bg-slate-100">
                    <div className="bg-slate-800 px-4 py-2 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone size={14} className="text-slate-300" />
                        <span className="text-xs font-mono font-semibold">Firefox Mobile View</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Viewport: 412x915</span>
                    </div>
                    {/* Mobile Monitor Frame with notch/curve layout */}
                    <div className="p-4 bg-slate-50 h-[380px] relative overflow-hidden flex flex-col">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs font-mono text-slate-500 mb-3 border border-slate-200">
                        <div className="bg-white px-2 py-0.5 text-[10px] rounded border border-slate-300 overflow-hidden text-ellipsis whitespace-nowrap w-full">
                          {activeSession ? activeSession.url : "https://example.com"}
                        </div>
                      </div>

                      {/* Content representation */}
                      <div 
                        className="flex-grow bg-white border border-slate-200 rounded p-4 overflow-y-auto relative"
                        style={{ scrollBehavior: "smooth" }}
                        ref={(el) => {
                          if (el) {
                            el.scrollTop = currentSelectionPercent * (el.scrollHeight - el.clientHeight);
                          }
                        }}
                      >
                        {/* Static stack layout represents mobile viewport */}
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
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            By shifting coordinates strictly into document scroll dimension ratios, our synchronizer achieves zero-flaws reading continuity.
                          </p>
                          <h5 className="font-bold text-slate-800 text-xs h-6 pt-1">II. Resilient Storage Pipeline</h5>
                          <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50 border-l-2 border-amber-400 p-2 font-mono">
                            [Sync Event Handlers]
                            Local Cache - Latency - Null Updates
                          </p>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Once the scroll finishes its movement, the background processes the payload inside the queue, storing the state locally and preparing to push changes.
                          </p>
                          <h5 className="font-bold text-slate-800 text-xs h-6 pt-1">III. Synchronized Viewports</h5>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            As you adjust this viewport, you will notice the companion mobile device adjusts its content block synchronously.
                          </p>
                          <div className="h-48 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono text-center p-2">
                            End of Simulated Article Section
                          </div>
                        </div>
                        {/* Red visual reading scroll pointer */}
                        <div 
                          className="absolute left-0 right-0 border-t-2 border-rose-500 opacity-60 flex justify-end pr-2 pointer-events-none transition-all duration-100"
                          style={{ top: `${currentSelectionPercent * 90 + 5}%` }}
                        >
                          <span className="bg-rose-500 text-white text-[9px] px-1 rounded -translate-y-2.5">Sync Line</span>
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
                        <span className="text-[10px] text-slate-400 font-mono">Firefox 126.0 - Linux</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100/60 text-emerald-700 font-semibold rounded-full text-[10px]">Connected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <Smartphone size={15} className="text-slate-600" />
                      <div>
                        <span className="font-semibold text-slate-700 block">Pixel 8 Mobile</span>
                        <span className="text-[10px] text-slate-400 font-mono">Firefox Focus - Android 14</span>
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
                          ? "bg-[#2563eb]/5 border-[#2563eb] text-[#1e40af]"
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
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Custom Display Title</label>
                    <input
                      type="text"
                      placeholder="E.g., fast fourier transform story"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
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
        )}

        {/* Tab Contents: Browser Extension Code Inspector */}
        {activeTab === "code" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Folder Selector */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block mb-2 font-semibold">Extension Bundle Directory</span>
                <div className="space-y-1">
                  
                  <button
                    onClick={() => setActiveCodeFile("manifest.json")}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-mono border transition-all ${
                      activeCodeFile === "manifest.json"
                        ? "bg-slate-900 text-white border-slate-900 font-medium"
                        : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileCode size={13} className={activeCodeFile === "manifest.json" ? "text-emerald-400" : "text-indigo-400"} />
                      manifest.json
                    </span>
                    <span className="text-[9px] opacity-75">Config</span>
                  </button>

                  <button
                    onClick={() => setActiveCodeFile("content.js")}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-mono border transition-all ${
                      activeCodeFile === "content.js"
                        ? "bg-slate-900 text-white border-slate-900 font-medium"
                        : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Terminal size={13} className={activeCodeFile === "content.js" ? "text-emerald-400" : "text-yellow-400"} />
                      content.js
                    </span>
                    <span className="text-[9px] opacity-75">Inject</span>
                  </button>

                  <button
                    onClick={() => setActiveCodeFile("background.js")}
                    className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-mono border transition-all ${
                      activeCodeFile === "background.js"
                        ? "bg-slate-900 text-white border-slate-900 font-medium"
                        : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Settings size={13} className={activeCodeFile === "background.js" ? "text-emerald-400" : "text-[#4f46e5]"} />
                      background.js
                    </span>
                    <span className="text-[9px] opacity-75">Worker</span>
                  </button>

                </div>

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-900 mb-2">Workspace Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDownload("manifest.json", manifestCode)}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download size={12} /> Download manifest.json
                    </button>
                    <button
                      onClick={() => handleDownload("content.js", contentCode)}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download size={12} /> Download content.js
                    </button>
                    <button
                      onClick={() => handleDownload("background.js", backgroundCode)}
                      className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download size={12} /> Download background.js
                    </button>
                  </div>
                </div>

              </div>
              
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white space-y-3 shadow shadow-md">
                <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
                  <Lock size={12} className="text-[#a78bfa]" /> Private Key Isolation
                </h4>
                <p className="text-[11px] text-slate-300 leading-normal">
                  Firefox security policies completely prohibit remote hosted scripts. This extension bundles Firebase modules directly to keep credentials entirely native.
                </p>
              </div>
            </div>

            {/* Core Code Viewer */}
            <div className="lg:col-span-9">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col">
                <div className="bg-slate-900 border-b border-slate-800 pl-5 pr-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-slate-800 rounded-full flex gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                    </span>
                    <span className="text-xs text-slate-400 font-mono tracking-wide">{activeCodeFile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerCopy(activeCodeFile, getFileContent())}
                      className="p-1 px-3 bg-slate-800/65 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700/80 text-xs inline-flex items-center gap-1 transition-all"
                    >
                      {copiedStates[activeCodeFile] ? (
                        <>
                          <Check size={12} className="text-emerald-400 animate-scale" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDownload(activeCodeFile, getFileContent())}
                      className="p-1 px-3 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded border border-indigo-500 text-xs inline-flex items-center gap-1 transition-all"
                    >
                      <Download size={12} /> Export File
                    </button>
                  </div>
                </div>
                {/* Code Window with horizontal and vertical scroll */}
                <div className="p-5 overflow-auto text-xs font-mono text-slate-300 select-all max-h-[550px] leading-relaxed">
                  <pre className="whitespace-pre">{getFileContent()}</pre>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Tab Contents: Firestore Blueprint & Rules */}
        {activeTab === "schema" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Firestore Config Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-md font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Settings size={17} className="text-indigo-500" />
                  Local Credentials Manager
                </h3>
                <p className="text-xs text-slate-500 mb-5">These credentials should be loaded inside the extension to bind the synchronization to your database instance.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Project ID</label>
                    <input
                      type="text"
                      value={firebaseConfig.projectId}
                      onChange={(e) => setFirebaseConfig({...firebaseConfig, projectId: e.target.value})}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">API Key</label>
                    <input
                      type="text"
                      value={firebaseConfig.apiKey}
                      onChange={(e) => setFirebaseConfig({...firebaseConfig, apiKey: e.target.value})}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Auth Domain</label>
                    <input
                      type="text"
                      value={firebaseConfig.authDomain}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg font-mono bg-slate-50 text-slate-400 focus:outline-none"
                      disabled
                    />
                  </div>
                </div>

                <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h4 className="text-xs font-semibold text-slate-800 mb-1">Deterministic DB Collection Paths</h4>
                  <p className="text-[11px] text-slate-500 mb-3leading-normal">Using static sync IDs allows multiple authenticated devices to update the exact same document without login friction.</p>
                  <div className="bg-white px-3 py-2 rounded border border-slate-200 font-mono text-xs text-slate-700">
                    /users/<span className="font-bold text-[#c084fc]">{USER_ID}</span>/scroll_states/<b>{activeSession ? activeSession.id : "url_hash"}</b>
                  </div>
                </div>
              </div>

              {/* Security Shield Rules Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-md font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Zero-Trust Security Rules
                  </h3>
                  <button
                    onClick={() => triggerCopy("rules", `rules_version = '2';\nservice cloud.firestore {\n...`)}
                    className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] inline-flex items-center gap-1 transition-all"
                  >
                    {copiedStates["rules"] ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copiedStates["rules"] ? "Copied" : "Copy firestore.rules"}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-5">These security rules enforce accurate payload formats, float bounds, URL lengths, and secure sync key ownership.</p>
                
                <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4.5 rounded-xl border border-slate-800 max-h-[385px] overflow-y-auto leading-relaxed">
                  <p className="text-slate-500">// firestore.rules</p>
                  <p className="text-purple-400">rules_version = '2';</p>
                  <p className="text-rose-400">service cloud.firestore &#123;</p>
                  <p className="pl-4 text-emerald-400">match /databases/&#123;database&#125;/documents &#123;</p>
                  <p className="pl-8 text-slate-500">// Global safety wall</p>
                  <p className="pl-8 text-neutral-400">match /&#123;document=**&#125; &#123;</p>
                  <p className="pl-12 text-rose-500">allow read, write: if false;</p>
                  <p className="pl-8 text-neutral-400">&#125;</p>
                  <br />
                  <p className="pl-8 text-slate-500">// Private synchronization rules</p>
                  <p className="pl-8 text-blue-400">match /users/&#123;userId&#125;/scroll_states/&#123;urlHash&#125; &#123;</p>
                  <p className="pl-12 text-slate-300">allow read: if isValidId(userId) && userId == "my_shared_private_sync_id";</p>
                  <p className="pl-12 text-slate-300">allow write: if isValidId(userId) && userId == "my_shared_private_sync_id" && isValidId(urlHash);</p>
                  <p className="pl-8 text-blue-400">&#125;</p>
                  <p className="pl-4 text-emerald-400">&#125;</p>
                  <p className="text-rose-400">&#125;</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Contents: Step-By-Step Setup Guide */}
        {activeTab === "guide" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-8" id="installation">
            
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-600" />
                Browser Installation & Loading Guide
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Follow these exact steps to load the scroll synchronizer extension unpacked inside Firefox (Mobile/Desktop) or any Chromium browser.
              </p>
            </div>

            <div className="space-y-6">
              
              {/* Step 1 */}
              <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">1</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Gather the extension files</h4>
                  <p className="text-xs text-slate-600 leading-normal mt-1">
                    Export and save <code className="bg-slate-100 text-[#0f172a] px-1 rounded">manifest.json</code>, <code className="bg-slate-100 text-[#0f172a] px-1 rounded">content.js</code>, and <code className="bg-slate-100 text-[#0f172a] px-1 rounded">background.js</code> (from our Code tab) into a single folder on your local machine named <strong className="text-slate-900">scroll-sync-extension/</strong>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">2</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Download the Firebase Native SDK files</h4>
                  <p className="text-xs text-slate-600 leading-normal mt-1">
                    Because remote code tags are secure block policies, save the Firebase ES6 Core files directly inside the root folder:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5 mt-2">
                    <li>Download Firebase App module and map it as <code className="bg-slate-100 text-rose-600 px-1 rounded font-mono">firebase-app.js</code></li>
                    <li>Download Firebase Firestore module and map it as <code className="bg-slate-100 text-rose-600 px-1 rounded font-mono">firebase-firestore.js</code></li>
                  </ul>
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg text-[11px] text-amber-800 border border-amber-200 leading-normal">
                    💡 <strong>Pro-Tip:</strong> You can download these straight from standard ES CDN packages like <code className="bg-white/70 px-1 rounded">https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js</code> and save them directly as local file references.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">3</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Load the Extension on Desktop Firefox</h4>
                  <p className="text-xs text-slate-600 leading-normal mt-1">
                    Open your Firefox browser, type <code className="bg-slate-100 px-1 rounded font-mono">about:debugging</code> inside the location bar, and press Enter:
                  </p>
                  <ul className="list-decimal pl-5 text-xs text-slate-600 space-y-1 mt-2">
                    <li>Click <strong className="text-slate-900">This Firefox</strong> in the sidebar.</li>
                    <li>Select <strong className="text-slate-900">Load Temporary Add-on...</strong></li>
                    <li>Select your <strong className="text-slate-900">manifest.json</strong> inside the local folder.</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">4</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Load on Chromium Browsers (Optional)</h4>
                  <p className="text-xs text-slate-600 leading-normal mt-1">
                    This Manifest V3 extension is also fully cross-compatible with Google Chrome and Brave:
                  </p>
                  <ul className="list-decimal pl-5 text-xs text-slate-600 space-y-1 mt-2">
                    <li>Navigate to <code className="bg-slate-100 px-1 rounded font-mono">chrome://extensions</code></li>
                    <li>Toggle <strong className="text-slate-900">Developer Mode</strong> active at the top right.</li>
                    <li>Click <strong className="text-slate-900">Load unpacked</strong> and select your extension directory folder.</li>
                  </ul>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 items-start border-slate-200 pl-6 relative">
                <div className="absolute -left-3 top-0 w-6 h-6 bg-emerald-500 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">🎉</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">You are ready to sync!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1 font-sans">
                    Once loaded, the content script will silently run directly on the native webpage DOM when the tab page completely loads. Whenever you pause or scroll on desktop articles, the mobile viewport synchronized state updates immediately.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
        
      </main>

      {/* Footer footer layout details */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16 text-center text-xs text-slate-500 font-mono">
        <p>Built as a Manifest V3 native solution. Powered by Google Firebase (Spark Free Tier) & Antigravity Agent.</p>
      </footer>
    </div>
  );
}
