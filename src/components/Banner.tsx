import React from "react";
import { Lock } from "lucide-react";

interface BannerProps {
  activeTab: "simulator" | "code" | "schema" | "guide";
  setActiveTab: (tab: "simulator" | "code" | "schema" | "guide") => void;
}

export default function Banner({ activeTab, setActiveTab }: BannerProps) {
  return (
    <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white shadow-xl relative overflow-hidden">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none"></div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Lock size={11} className="text-indigo-400" /> Zero-Knowledge Security Model
          </div>
          <h2 className="text-xl font-medium tracking-tight">Mandatory Client-Side Scroll Encryption</h2>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
            No plaintext data ever hits your database. The URL, page title, and scroll progress percentage are bundled and encrypted locally via AES-GCM prior to transmission. Firestore only indexes a deterministic URL hash path, ensuring absolute reading privacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setActiveTab("simulator")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'simulator' ? 'bg-white text-slate-900 shadow' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            Launch Simulator
          </button>
          <button 
            onClick={() => setActiveTab("code")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'code' ? 'bg-white text-slate-900 shadow' : 'bg-white/10 text-white hover:bg-white/15'}`}
          >
            Inspector Code
          </button>
        </div>
      </div>
    </div>
  );
}
