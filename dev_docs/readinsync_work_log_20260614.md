# ReadInSync Work Log - 2026-06-14

## Work Done
- Examined the CI workflow of `H:\tabtogether` to replicate its browser extension compilation pattern.
- Updated the CI workflow in [.github/workflows/ci.yml](file:///H:/ReaInSync/.github/workflows/ci.yml) to add the `build-and-upload` job.
- Configured the workflow to run `npx web-ext build --source-dir extension --overwrite-dest` to compile the browser extension situated in the `extension/` subdirectory.
- Integrated GitHub's `actions/upload-artifact@v4` action to upload the resulting `.zip` extension bundle to build artifacts.
- Verified that the extension compiles successfully locally by running the build command in the `H:\ReaInSync` workspace.
- Updated [readinsync_roadmap.md](file:///H:/ReaInSync/dev_docs/readinsync_roadmap.md) to document today's updates.
- Strictly enforced a "no mocks, no fakes, and no default fallback placeholders" configuration:
  - Added a build script [scripts/build-extension.js](file:///H:/ReaInSync/scripts/build-extension.js) that compiles the extension and replaces the background credentials with actual environment variables, failing the compilation loudly if they are not set.
  - Configured [.github/workflows/ci.yml](file:///H:/ReaInSync/.github/workflows/ci.yml) to map required build environment variables directly to GitHub Actions Secrets.
  - Refactored [src/App.tsx](file:///H:/ReaInSync/src/App.tsx) to fail-fast with a loud initialization error if required Firebase credentials are missing from the environment at runtime, completely removing hardcoded fallback configurations.
  - Configured the extension [extension/background.js](file:///H:/ReaInSync/extension/background.js) to look for local storage overrides (`chrome.storage.local`) first when running on a local machine, failing loudly if no credentials are provided.
  - Updated [extension/popup.html](file:///H:/ReaInSync/extension/popup.html) and [extension/popup.js](file:///H:/ReaInSync/extension/popup.js) with collapsible input fields allowing users to configure these override credentials locally.
  - Updated [.env.example](file:///H:/ReaInSync/.env.example) and added `dist-extension/` build folder to [.gitignore](file:///H:/ReaInSync/.gitignore).
  - Staged, committed, and pushed these strict security configuration updates directly to the remote repository.
