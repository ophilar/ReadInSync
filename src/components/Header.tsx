import React from "react";
import { Layers, Download, ShieldCheck } from "lucide-react";

interface HeaderProps {
  setActiveTab: (tab: "simulator" | "code" | "schema" | "guide") => void;
}

export default function Header({ setActiveTab }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-md">
            <Layers size={18} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-md font-semibold text-slate-900 tracking-tight flex items-center gap-1.5">
              ReadInSync
              <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-full">E2EE</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">Mandatory Zero-Knowledge Scroll Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-mono text-slate-600 border border-slate-200">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span className="font-semibold text-slate-700">AES-256 Active</span>
          </div>
          <a 
            href="#installation" 
            onClick={() => setActiveTab("guide")}
            className="px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center gap-1.5 transition-all shadow"
          >
            <Download size={13} />
            Setup Guide
          </a>
        </div>
      </div>
    </header>
  );
}
