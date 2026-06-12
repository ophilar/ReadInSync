/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";

// Subcomponents
import Header from "./components/Header";
import Banner from "./components/Banner";
import Footer from "./components/Footer";
import SimulatorTab, { SyncSession } from "./components/SimulatorTab";
import CodeInspectorTab from "./components/CodeInspectorTab";
import SchemaTab from "./components/SchemaTab";
import SetupGuideTab from "./components/SetupGuideTab";

export default function App() {
  const [activeTab, setActiveTab] = useState<"simulator" | "code" | "schema" | "guide">("simulator");
  const [activeCodeFile, setActiveCodeFile] = useState<"manifest.json" | "content.js" | "background.js" | "crypto.js">("manifest.json");
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  // Dynamic user configurable settings in simulator
  const [syncId, setSyncId] = useState("my_shared_private_sync_id");
  const [syncPassword, setSyncPassword] = useState("my_secret_reading_password");

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

  // Firestore placeholder configs (can be updated locally or overridden via env variables)
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || "YOUR_FIREBASE_API_KEY",
    projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || "YOUR_PROJECT_ID",
    authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || "YOUR_PROJECT_ID.firebaseapp.com",
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || "YOUR_PROJECT_ID.firebasestorage.app"
  });

  const activeSession = syncSessions.find(s => s.id === selectedSessionId) || syncSessions[0];
  const currentSelectionPercent = activeSession ? activeSession.percent : 0.5;

  const triggerCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
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

  const updateSelectedPercent = (newValue: number) => {
    setSyncSessions(prev =>
      prev.map(s => (s.id === selectedSessionId ? { ...s, percent: newValue, updatedAt: new Date().toISOString() } : s))
    );
  };

  const addNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;

    const parsedTitle = customTitle || customUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
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

  // Compute dynamic E2EE values for simulation visualizer
  const simulatedIv = "N1g4TTh5SmhaMXE1"; // Static mock base64 IV
  const rawPayload = JSON.stringify({
    url: activeSession?.url || "",
    title: activeSession?.title || "",
    percent: parseFloat(currentSelectionPercent.toFixed(5))
  });
  // Generate a premium simulated ciphertext based on current scroll / credentials
  const simulatedCiphertext = btoa(encodeURIComponent(syncPassword + ":" + syncId + ":" + rawPayload)).substring(0, 80) + "...[AES-256-GCM]";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans transition-colors duration-200">
      <Header setActiveTab={setActiveTab} />

      {/* Primary Container */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Banner activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scroller-hidden">
          <button
            onClick={() => setActiveTab("simulator")}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "simulator"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🛰️ Synchronizer & Coordinator
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "code"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📦 Browser Extension Code
          </button>
          <button
            onClick={() => setActiveTab("schema")}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "schema"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            🔒 Firestore Schema & Rules
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`pb-4 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors duration-155 ${
              activeTab === "guide"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            📖 Step-By-Step Setup
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "simulator" && (
          <SimulatorTab
            syncId={syncId}
            setSyncId={setSyncId}
            syncPassword={syncPassword}
            setSyncPassword={setSyncPassword}
            syncSessions={syncSessions}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
            customUrl={customUrl}
            setCustomUrl={setCustomUrl}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            customPercent={customPercent}
            setCustomPercent={setCustomPercent}
            activeSession={activeSession}
            currentSelectionPercent={currentSelectionPercent}
            updateSelectedPercent={updateSelectedPercent}
            addNewSession={addNewSession}
            deleteSession={deleteSession}
            simulatedIv={simulatedIv}
            simulatedCiphertext={simulatedCiphertext}
          />
        )}

        {activeTab === "code" && (
          <CodeInspectorTab
            activeCodeFile={activeCodeFile}
            setActiveCodeFile={setActiveCodeFile}
            copiedStates={copiedStates}
            triggerCopy={triggerCopy}
            handleDownload={handleDownload}
            firebaseConfig={firebaseConfig}
          />
        )}

        {activeTab === "schema" && (
          <SchemaTab
            syncId={syncId}
            activeSession={activeSession}
            firebaseConfig={firebaseConfig}
            setFirebaseConfig={setFirebaseConfig}
            copiedStates={copiedStates}
            triggerCopy={triggerCopy}
          />
        )}

        {activeTab === "guide" && <SetupGuideTab />}
      </main>

      <Footer />
    </div>
  );
}
