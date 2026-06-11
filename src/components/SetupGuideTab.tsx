import React from "react";
import { BookOpen } from "lucide-react";

export default function SetupGuideTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm max-w-4xl mx-auto space-y-8" id="installation">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-600" />
          Browser Installation & Loading Guide
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-normal">
          Follow these exact steps to load the scroll synchronizer extension unpacked inside Firefox or Chrome.
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
          <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">1</div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Gather the extension files</h4>
            <p className="text-xs text-slate-600 leading-normal mt-1">
              Export and save <code className="bg-slate-100 text-[#0f172a] px-1 rounded">manifest.json</code>, <code className="bg-slate-100 text-[#0f172a] px-1 rounded">content.js</code>, <code className="bg-slate-100 text-[#0f172a] px-1 rounded">crypto.js</code>, and <code className="bg-slate-100 text-[#0f172a] px-1 rounded">background.js</code> (from our Code tab) into a single folder on your local machine named <strong className="text-slate-900">scroll-sync-extension/</strong>.
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
              💡 <strong>Pro-Tip:</strong> You can download these straight from standard ES CDN packages like <code className="bg-white/70 px-1 rounded font-mono">https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js</code> and save them directly as local file references.
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
            <h4 className="text-sm font-semibold text-slate-900">Configure your PC Browser</h4>
            <p className="text-xs text-slate-600 leading-normal mt-1">
              Click the extension icon in your toolbar, copy the auto-generated **Sync ID**, and set a secure **Sync Password** (e.g. <code className="bg-slate-100 px-1 rounded font-mono">my_secret_reading_password</code>). Click **Save Configuration**.
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="flex gap-4 items-start border-l-2 border-slate-200 pl-6 relative">
          <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-900 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">5</div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Load on Android Mobile Devices</h4>
            <p className="text-xs text-slate-600 leading-normal mt-1">
              To test E2EE sync on mobile, choose one of these two options:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 space-y-2 mt-2">
              <li>
                <strong>Option A (Kiwi Browser - Easiest)</strong>: 
                Copy your <code className="bg-slate-100 px-1 rounded">scroll-sync-extension/</code> folder to your Android device. Open Kiwi Browser, go to <code className="bg-slate-100 px-1 rounded font-mono">kiwi://extensions</code>, enable Developer Mode, click <strong>+ (Load)</strong>, and select the extension folder to install.
              </li>
              <li>
                <strong>Option B (Firefox Nightly)</strong>: 
                Go to Settings &gt; About Firefox Nightly. Tap the logo 5 times to unlock Developer options. Go back, select **Custom Add-on Collection**, and load your custom collection containing the extension zip from addons.mozilla.org.
              </li>
            </ul>
            <p className="text-xs text-slate-600 leading-normal mt-2">
              Once installed, open the extension popup on mobile and enter the **exact same** Sync ID and Sync Password as your PC.
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <div className="flex gap-4 items-start border-slate-200 pl-6 relative">
          <div className="absolute -left-3 top-0 w-6 h-6 bg-emerald-500 rounded-full text-white text-xs font-bold flex items-center justify-center font-mono">🎉</div>
          <div>
            <h4 className="text-sm font-semibold text-slate-950">You are ready to sync!</h4>
            <p className="text-xs text-slate-600 leading-relaxed mt-1 font-sans">
              Open a page (e.g. Wikipedia) on your PC and scroll down. Close the tab or lock your PC screen. Open the same URL on your phone—it will automatically glide down to the exact matching scrolled position, fully E2EE-decrypted client-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
