# Workspace Cleaner

Workspace Cleaner is a Linux desktop app for finding generated project folders such as `node_modules`, `dist`, `build`, `.next`, `.nuxt`, `coverage`, and `.turbo`.

It scans a directory, shows the folders and their sizes, and moves selected folders to the Linux Trash after confirmation. It never deletes folders during scanning and does not follow symbolic links.

## Build and install from GitHub

Clone the repository and enter the project directory:

```bash
git clone https://github.com/baseergroot/workspace-cleaner.git
cd workspace-cleaner
```

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

Build the Debian package:

```bash
npm run tauri build
```

Install it:

```bash
sudo apt install ./src-tauri/target/release/bundle/deb/*.deb
```

After installation, launch **Workspace Cleaner** from the desktop application menu.

To run the graphical app in development mode instead:

```bash
npm run tauri dev
```

The `.deb` declares the small Linux graphics libraries required by Tauri. `apt` resolves and installs those automatically; users do not need Rust, Node.js, npm, or any project dependencies.

The Debian package installs the application launcher automatically, so **Workspace Cleaner** appears in the desktop application menu. You can also run it from a terminal with:

```bash
workspace-cleaner
```

The package includes the Workspace Cleaner icon for the desktop menu, launcher, and window.

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
