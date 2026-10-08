# Workspace Cleaner

Workspace Cleaner is a Linux desktop app for finding generated project folders such as `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `coverage`, and `.turbo`.

It scans a directory, shows the folders and their sizes, and moves selected folders to the Linux Trash after confirmation. It never deletes folders during scanning and does not follow symbolic links.

## Development requirements

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Install Rust and Node.js, then install the frontend dependencies:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
npm install
```

Run the graphical app in development mode:

```bash
npm run tauri dev
```

## Build and install on Linux

Create release packages:

```bash
npm run tauri build
```

Install the Debian package:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/*.deb
```

After installation, **Workspace Cleaner** is available from the desktop application menu. The Debian package installs the application launcher and desktop entry automatically. You can also run it from a terminal with:

```bash
workspace-cleaner
```

The AppImage is also created in:

```text
src-tauri/target/release/bundle/appimage/
```

Make it executable before launching it:

```bash
chmod +x src-tauri/target/release/bundle/appimage/*.AppImage
```

## Safety

- Scanning is read-only.
- Deletion requires selecting folders and confirming.
- Selected folders are moved to Trash, not permanently removed.
- Only approved generated-folder names can be removed.
- Paths must remain inside the selected workspace.
- Symbolic links are ignored.

## Project layout

```text
src/                 Graphical frontend
src-tauri/src/       Rust scanner and Trash integration
src-tauri/            Tauri desktop configuration
```
