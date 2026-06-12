import React from "react";
import { FileCode, Terminal, Lock, Settings, Download, Check, Copy } from "lucide-react";
import { manifestCode, contentCode, cryptoCode, backgroundCode } from "../templates";

interface CodeInspectorTabProps {
  activeCodeFile: "manifest.json" | "content.js" | "background.js" | "crypto.js";
  setActiveCodeFile: (file: "manifest.json" | "content.js" | "background.js" | "crypto.js") => void;
  copiedStates: { [key: string]: boolean };
  triggerCopy: (key: string, text: string) => void;
  handleDownload: (filename: string, content: string) => void;
  firebaseConfig: {
    apiKey: string;
    projectId: string;
    authDomain: string;
    storageBucket: string;
  };
}

export default function CodeInspectorTab({
  activeCodeFile,
  setActiveCodeFile,
  copiedStates,
  triggerCopy,
  handleDownload,
  firebaseConfig
}: CodeInspectorTabProps) {
  
  const getFileContent = (fileType = activeCodeFile) => {
    let rawContent = "";
    switch (fileType) {
      case "manifest.json":
        rawContent = manifestCode;
        break;
      case "content.js":
        rawContent = contentCode;
        break;
      case "background.js":
        rawContent = backgroundCode;
        break;
      case "crypto.js":
        rawContent = cryptoCode;
        break;
    }

    if (fileType === "background.js") {
      return rawContent
        .replace("YOUR_FIREBASE_API_KEY", firebaseConfig.apiKey)
        .replace("YOUR_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain)
        .replace("YOUR_FIREBASE_PROJECT_ID", firebaseConfig.projectId)
        .replace("YOUR_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket);
    }
    return rawContent;
  };

  return (
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
              onClick={() => setActiveCodeFile("crypto.js")}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-mono border transition-all ${
                activeCodeFile === "crypto.js"
                  ? "bg-slate-900 text-white border-slate-900 font-medium"
                  : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Lock size={13} className={activeCodeFile === "crypto.js" ? "text-emerald-400" : "text-cyan-400"} />
                crypto.js
              </span>
              <span className="text-[9px] opacity-75">E2EE</span>
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
                onClick={() => handleDownload("manifest.json", getFileContent("manifest.json"))}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={12} /> Download manifest.json
              </button>
              <button
                onClick={() => handleDownload("content.js", getFileContent("content.js"))}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={12} /> Download content.js
              </button>
              <button
                onClick={() => handleDownload("crypto.js", getFileContent("crypto.js"))}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={12} /> Download crypto.js
              </button>
              <button
                onClick={() => handleDownload("background.js", getFileContent("background.js"))}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={12} /> Download background.js
              </button>
            </div>
          </div>

        </div>
        
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white space-y-3 shadow-md">
          <h4 className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
            <Lock size={12} className="text-[#a78bfa]" /> Private Key Isolation
          </h4>
          <p className="text-[11px] text-slate-300 leading-normal">
            Firefox security policies completely prohibit remote hosted scripts. This extension bundles Web Crypto routines natively to keep credentials entirely client-side.
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
                    <Check size={12} className="text-emerald-400" />
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
          <div className="p-5 overflow-auto text-xs font-mono text-slate-300 select-all max-h-[550px] leading-relaxed">
            <pre className="whitespace-pre">{getFileContent()}</pre>
          </div>
        </div>
      </div>

    </div>
  );
}
