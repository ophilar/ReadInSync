# ReadInSync Work Log - 2026-06-14

## Work Done
- Examined the CI workflow of `H:\tabtogether` to replicate its browser extension compilation pattern.
- Updated the CI workflow in [.github/workflows/ci.yml](file:///H:/ReaInSync/.github/workflows/ci.yml) to add the `build-and-upload` job.
- Configured the workflow to run `npx web-ext build --source-dir extension --overwrite-dest` to compile the browser extension situated in the `extension/` subdirectory.
- Integrated GitHub's `actions/upload-artifact@v4` action to upload the resulting `.zip` extension bundle to build artifacts.
- Verified that the extension compiles successfully locally by running the build command in the `H:\ReaInSync` workspace.
- Updated [readinsync_roadmap.md](file:///H:/ReaInSync/dev_docs/readinsync_roadmap.md) to document today's updates.
- Strictly enforced a "no mocks, no fakes, and no default fallback placeholders" configuration using official Firebase patterns:
  - Discarded temporary build-time replacement environment variables in favor of a standard [firebase-config.json](file:///H:/ReaInSync/firebase-config.json) configuration file (added to [.gitignore](file:///H:/ReaInSync/.gitignore)).
  - Created [firebase-config.example.json](file:///H:/ReaInSync/firebase-config.example.json) as a public configuration template.
  - Setup a Vite configuration [vite-extension.config.ts](file:///H:/ReaInSync/vite-extension.config.ts) to compile the browser extension locally, resolving and bundling the official Firebase Auth and Firestore SDKs into self-contained files inside the packaged bundle.
  - Updated [.github/workflows/ci.yml](file:///H:/ReaInSync/.github/workflows/ci.yml) to generate the `firebase-config.json` dynamically from GitHub Action Secrets (`FIREBASE_CONFIG_JSON`) at compile time.
  - Refactored [src/App.tsx](file:///H:/ReaInSync/src/App.tsx) to import and validate the configuration directly, failing loudly if keys are missing or hold placeholders.
  - Created [extension/auth.html](file:///H:/ReaInSync/extension/auth.html) and [extension/auth.js](file:///H:/ReaInSync/extension/auth.js) to support multi-provider authentication (Google Sign-In, GitHub, and Anonymous Sign-In) inside a secure extension-tab context.
  - Updated [extension/popup.html](file:///H:/ReaInSync/extension/popup.html) and [extension/popup.js](file:///H:/ReaInSync/extension/popup.js) to monitor authentication state, automatically configure the Sync Profile ID from the authenticated user's `uid` on federated sign-in, and fall back to local storage profile configurations.
  - Configured [extension/background.js](file:///H:/ReaInSync/extension/background.js) to asynchronously initialize Firebase Auth and Firestore, failing fast if the configuration is missing.
  - Confirmed all TypeScript compile checks and Vite production builds pass successfully.
  - Pushed all finalized code directly to the remote repository.
