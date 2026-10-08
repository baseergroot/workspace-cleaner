import "./style.css";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

type FoundFolder = {
  path: string;
  name: string;
  project: string;
  size_bytes: number;
};

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <section class="shell">
    <header>
      <div>
        <p class="eyebrow">LINUX WORKSPACE TOOL</p>
        <h1>Workspace Cleaner</h1>
        <p class="subtitle">Find generated folders and reclaim disk space safely.</p>
      </div>
      <div class="logo">⌫</div>
    </header>

    <section class="workspace-card">
      <label for="workspace">Workspace directory</label>
      <div class="path-row">
        <input id="workspace" placeholder="/home/you/projects" spellcheck="false" />
        <button id="browse" class="secondary">Browse</button>
        <button id="scan" class="primary">Scan</button>
      </div>
      <p class="hint">Only detected folders inside this directory will be shown. Nothing is deleted during scanning.</p>
    </section>

    <section class="summary" aria-live="polite">
      <div><span id="count">0</span><small>folders found</small></div>
      <div><span id="size">0 B</span><small>space recoverable</small></div>
      <div class="targets"><span>node_modules · dist · build · .next · .nuxt · coverage · .turbo</span><small>detected targets</small></div>
    </section>

    <section class="results-card">
      <div class="results-header"><h2>Review folders</h2><button id="select-all" class="text-button" disabled>Select all</button></div>
      <div id="status" class="empty">Choose a workspace and scan it to begin.</div>
      <div id="results"></div>
      <div class="footer"><span id="selected-label">0 selected</span><button id="delete" class="danger" disabled>Move selected to Trash</button></div>
    </section>
    <p id="message" class="message" role="status"></p>
  </section>
`;

const workspace = document.querySelector<HTMLInputElement>("#workspace")!;
const browse = document.querySelector<HTMLButtonElement>("#browse")!;
const scan = document.querySelector<HTMLButtonElement>("#scan")!;
const selectAll = document.querySelector<HTMLButtonElement>("#select-all")!;
const remove = document.querySelector<HTMLButtonElement>("#delete")!;
const results = document.querySelector<HTMLDivElement>("#results")!;
const status = document.querySelector<HTMLDivElement>("#status")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;
const count = document.querySelector<HTMLSpanElement>("#count")!;
const size = document.querySelector<HTMLSpanElement>("#size")!;
const selectedLabel = document.querySelector<HTMLSpanElement>("#selected-label")!;
let folders: FoundFolder[] = [];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do { value /= 1024; unit++; } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
};

function selectedPaths() {
  return [...results.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked")].map((el) => el.value);
}

function updateControls() {
  const selected = selectedPaths();
  selectedLabel.textContent = `${selected.length} selected`;
  remove.disabled = selected.length === 0;
  selectAll.disabled = folders.length === 0;
  selectAll.textContent = selected.length === folders.length ? "Clear all" : "Select all";
}

function render() {
  count.textContent = String(folders.length);
  size.textContent = formatSize(folders.reduce((total, folder) => total + folder.size_bytes, 0));
  status.style.display = folders.length ? "none" : "block";
  results.innerHTML = folders.map((folder) => `
    <label class="result-row">
      <input type="checkbox" value="${escapeHtml(folder.path)}" />
      <span class="folder-icon">⌁</span>
      <span class="folder-info"><strong>${escapeHtml(folder.name)}</strong><small>${escapeHtml(folder.project)}</small></span>
      <span class="folder-size">${formatSize(folder.size_bytes)}</span>
    </label>
  `).join("");
  results.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateControls));
  updateControls();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

browse.onclick = async () => {
  const chosen = await open({ directory: true, multiple: false, title: "Choose workspace" });
  if (typeof chosen === "string") workspace.value = chosen;
};

scan.onclick = async () => {
  if (!workspace.value.trim()) { message.textContent = "Choose a workspace directory first."; return; }
  scan.disabled = true; message.textContent = "Scanning…"; folders = [];
  render();
  try {
    folders = await invoke<FoundFolder[]>("scan_workspace", { root: workspace.value.trim() });
    message.textContent = folders.length ? "Review the folders below before moving anything to Trash." : "No generated folders found in this workspace.";
    render();
  } catch (error) { message.textContent = String(error); }
  finally { scan.disabled = false; }
};

selectAll.onclick = () => {
  const shouldSelect = selectedPaths().length !== folders.length;
  results.querySelectorAll<HTMLInputElement>("input").forEach((input) => input.checked = shouldSelect);
  updateControls();
};

remove.onclick = async () => {
  const paths = selectedPaths();
  if (!paths.length || !confirm(`Move ${paths.length} folder(s) to the Trash?`)) return;
  remove.disabled = true; message.textContent = "Moving folders to Trash…";
  try {
    await invoke("trash_folders", { root: workspace.value.trim(), paths });
    folders = folders.filter((folder) => !paths.includes(folder.path));
    message.textContent = "Selected folders were moved to the Trash.";
    render();
  } catch (error) { message.textContent = String(error); updateControls(); }
};
