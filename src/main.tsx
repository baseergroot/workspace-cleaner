import "./style.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { ResultsList } from "./components/ResultsList";
import { Summary } from "./components/Summary";
import { WorkspacePicker } from "./components/WorkspacePicker";
import type { FoundFolder } from "./types";

function App() {
  const [workspace, setWorkspace] = useState("");
  const [scannedRoot, setScannedRoot] = useState<string | null>(null);
  const [folders, setFolders] = useState<FoundFolder[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const browse = async () => {
    const chosen = await open({ directory: true, multiple: false, title: "Choose workspace" });
    if (typeof chosen === "string") setWorkspace(chosen);
  };

  const scan = async () => {
    const root = workspace.trim();
    if (!root) {
      setError("Choose a workspace directory first.");
      setMessage("");
      return;
    }

    setScanning(true);
    setScannedRoot(root);
    setFolders([]);
    setSelectedPaths(new Set());
    setError(null);
    setMessage("Scanning…");

    try {
      const found = await invoke<FoundFolder[]>("scan_workspace", { root });
      setFolders(found);
      setMessage(found.length
        ? "Review the folders below before moving anything to Trash."
        : "No generated folders found in this workspace.");
    } catch (scanError) {
      setError(String(scanError));
      setMessage("");
    } finally {
      setScanning(false);
    }
  };

  const togglePath = (path: string) => {
    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedPaths((current) => current.size === folders.length
      ? new Set()
      : new Set(folders.map((folder) => folder.path)));
  };

  const trashSelected = async () => {
    const paths = [...selectedPaths];
    if (!paths.length || !scannedRoot || !confirm(`Move ${paths.length} folder(s) to the Trash?`)) return;

    setError(null);
    setMessage("Moving folders to Trash…");
    try {
      await invoke("trash_folders", { root: scannedRoot, paths });
      setFolders((current) => current.filter((folder) => !selectedPaths.has(folder.path)));
      setSelectedPaths(new Set());
      setMessage("Selected folders were moved to the Trash.");
    } catch (trashError) {
      setError(String(trashError));
      setMessage("");
    }
  };

  const status = error
    ? <div className="empty" role="alert">{error}</div>
    : folders.length === 0
      ? <div className="empty">{message || "Choose a workspace and scan it to begin."}</div>
      : null;

  return (
    <section className="shell">
      <header>
        <div>
          <p className="eyebrow">LINUX WORKSPACE TOOL</p>
          <h1>Workspace Cleaner</h1>
          <p className="subtitle">Find generated folders and reclaim disk space safely.</p>
        </div>
        <div className="logo">⌫</div>
      </header>

      <WorkspacePicker
        workspace={workspace}
        scanning={scanning}
        onWorkspaceChange={setWorkspace}
        onBrowse={browse}
        onScan={scan}
      />
      <Summary folders={folders} />
      <ResultsList
        folders={folders}
        selectedPaths={selectedPaths}
        onToggle={togglePath}
        onToggleAll={toggleAll}
        onDelete={trashSelected}
        status={status}
      />
      <p className="message" role="status">{error ? "" : message}</p>
    </section>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
