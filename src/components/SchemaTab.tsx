import React from "react";
import { Settings, Copy, Check } from "lucide-react";

interface SchemaTabProps {
  syncId: string;
  activeSession: any;
  firebaseConfig: {
    apiKey: string;
    projectId: string;
    authDomain: string;
    storageBucket: string;
  };
  setFirebaseConfig: (config: any) => void;
  copiedStates: { [key: string]: boolean };
  triggerCopy: (key: string, text: string) => void;
}

export default function SchemaTab({
  syncId,
  activeSession,
  firebaseConfig,
  setFirebaseConfig,
  copiedStates,
  triggerCopy
}: SchemaTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Firestore Config Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-md font-semibold text-slate-900 mb-2 flex items-center gap-2">
            <Settings size={17} className="text-indigo-500" />
            Credentials Settings
          </h3>
          <p className="text-xs text-slate-500 mb-5">These credentials should be loaded inside the extension background worker to establish database binding.</p>
          
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
          </div>

          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-semibold text-slate-800 mb-1">Deterministic DB Collection Paths</h4>
            <p className="text-[11px] text-slate-500 mb-3 leading-normal">Deterministic document hashes let authenticated devices lookup reading positions privately.</p>
            <div className="bg-white px-3 py-2 rounded border border-slate-200 font-mono text-xs text-slate-700 overflow-x-auto">
              /users/<span className="font-bold text-[#c084fc]">{syncId}</span>/scroll_states/<b>{activeSession ? activeSession.id : "url_hash"}</b>
            </div>
          </div>
        </div>

        {/* Security Shield Rules Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              Zero-Knowledge Security Rules
            </h3>
            <button
              onClick={() => triggerCopy("rules", `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if false;\n    }\n    match /users/{userId}/scroll_states/{urlHash} {\n      allow read, delete: if true;\n      allow write: if request.resource.data.keys().hasAll(['ciphertext', 'iv', 'updatedAt'])\n        && request.resource.data.keys().size() == 3\n        && request.resource.data.ciphertext is string\n        && request.resource.data.iv is string;\n    }\n  }\n}`)}
              className="p-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] inline-flex items-center gap-1 transition-all"
            >
              {copiedStates["rules"] ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copiedStates["rules"] ? "Copied" : "Copy firestore.rules"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-5">These rules validate that the database strictly receives E2EE records containing only ciphertext, iv, and updatedAt.</p>
          
          <div className="bg-slate-950 text-slate-300 font-mono text-[11px] p-4.5 rounded-xl border border-slate-800 max-h-[385px] overflow-y-auto leading-relaxed">
            <p className="text-slate-500">// firestore.rules</p>
            <p className="text-purple-400">rules_version = '2';</p>
            <p className="text-rose-400">service cloud.firestore &#123;</p>
            <p className="pl-4 text-emerald-400">match /databases/&#123;database&#125;/documents &#123;</p>
            <p className="pl-8 text-neutral-400">match /&#123;document=**&#125; &#123;</p>
            <p className="pl-12 text-rose-500">allow read, write: if false;</p>
            <p className="pl-8 text-neutral-400">&#125;</p>
            <br />
            <p className="pl-8 text-slate-500">// Private synchronization rules</p>
            <p className="pl-8 text-blue-400">match /users/&#123;userId&#125;/scroll_states/&#123;urlHash&#125; &#123;</p>
            <p className="pl-12 text-slate-300">allow read, delete: if true;</p>
            <p className="pl-12 text-slate-300">allow write: if request.resource.data.keys().hasAll(['ciphertext', 'iv', 'updatedAt'])</p>
            <p className="pl-16 text-slate-300">&& request.resource.data.keys().size() == 3</p>
            <p className="pl-16 text-slate-300">&& request.resource.data.ciphertext is string</p>
            <p className="pl-16 text-slate-300">&& request.resource.data.iv is string;</p>
            <p className="pl-8 text-blue-400">&#125;</p>
            <p className="pl-4 text-emerald-400">&#125;</p>
            <p className="text-rose-400">&#125;</p>
          </div>
        </div>

      </div>
    </div>
  );
}
