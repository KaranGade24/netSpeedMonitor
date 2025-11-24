# netSpeedMonitor

## Windows EXE (packaging) notes

- This project uses Electron and `electron-builder` to produce Windows installers (`.exe`). The codebase has been updated to remove the runtime Python dependency: network stats are now collected with the `systeminformation` Node module.
- To build a Windows installer you can run `npm run dist` on a Windows machine with Node installed, or on Linux with `wine` available (NSIS target requires wine to create a native installer).

Basic steps (Windows machine recommended):

1. Install dependencies:

```bash
npm install
```

2. Build distribution (64-bit Windows exe):

```bash
npm run dist
```

Notes:

- The project uses native modules like `sqlite3`. `electron-builder` will rebuild native modules automatically during packaging, but building on the same target platform (Windows) is recommended to avoid ABI issues.
- Windows 7 compatibility depends on the Electron version used. The project currently uses Electron v17; test generated installers on the target OS before distribution. If strict Windows 7 compatibility is required, consider using an Electron version documented to support Windows 7 or add compatibility flags as needed.
- If you want me to add a CI workflow, automated build scripts, or produce a portable EXE on this machine (requires `wine`), tell me and I will add step-by-step instructions or automation.
