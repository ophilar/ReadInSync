# ReadInSync Work Log - 2026-06-12

## Work Done
- Inspected the repository's GitHub security alerts using the `gh` CLI.
- Discovered an active Secret Scanning alert (Alert #1) indicating a Google API Key leak.
- Found the leaked credential `"YOUR_FIREBASE_API_KEY"` hardcoded in three files:
  1. [background.js](file:///H:/ReaInSync/extension/background.js) (line 19)
  2. [App.tsx](file:///H:/ReaInSync/src/App.tsx) (line 58)
  3. [templates.ts](file:///H:/ReaInSync/src/templates.ts) (line 311)
- Replaced the hardcoded API Key and project configurations with generic configuration placeholders (`YOUR_FIREBASE_API_KEY`, `YOUR_PROJECT_ID`, etc.) in all three files to resolve the alert.
- Enabled compile-time environment variable injection in [App.tsx](file:///H:/ReaInSync/src/App.tsx) using Vite's `import.meta.env` loader with safe fallback placeholders.
- Added `vite/client` typing references to resolve TypeScript compiler error with `ImportMeta`.
- Dynamically integrated user settings into the downloaded extension templates inside [CodeInspectorTab.tsx](file:///H:/ReaInSync/src/components/CodeInspectorTab.tsx) so that placeholders are replaced on export.
- Purged the leaked key from all Git commits in the repository history using `git-filter-repo --replace-text`.
- Verified that local TypeScript checks pass with zero errors (`npx tsc --noEmit`).
- Verified that the Vite production build works perfectly (`npm run build`).
- Confirmed that the unit test suite (`npm test`) passes with 100% success.
- Restored the repository's git remote and verified that the secret is completely absent from all logs.
- Updated the project roadmap in [readinsync_roadmap.md](file:///H:/ReaInSync/dev_docs/readinsync_roadmap.md) to document the security remediation.

