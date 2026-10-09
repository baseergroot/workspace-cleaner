import type { ReactNode } from "react";
import type { FoundFolder } from "../types";
import { ResultRow } from "./ResultRow";

type ResultsListProps = {
  folders: FoundFolder[];
  selectedPaths: Set<string>;
  onToggle: (path: string) => void;
  onToggleAll: () => void;
  onDelete: () => void;
  busy: boolean;
  trashing: boolean;
  status: ReactNode;
};

export function ResultsList({ folders, selectedPaths, onToggle, onToggleAll, onDelete, status, busy, trashing }: ResultsListProps) {
  const allSelected = folders.length > 0 && selectedPaths.size === folders.length;

  return (
    <section className="results-card">
      <div className="results-header">
        <h2>Review folders</h2>
        <button className="text-button" disabled={folders.length === 0 || busy} onClick={onToggleAll}>
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      {status}
      <div id="results">
        {folders.map((folder) => (
          <ResultRow
            key={folder.path}
            folder={folder}
            selected={selectedPaths.has(folder.path)}
            onToggle={onToggle}
            disabled={busy}
          />
        ))}
      </div>
      <div className="footer">
        <span>{selectedPaths.size} selected</span>
        <button className="danger" disabled={selectedPaths.size === 0 || busy} onClick={onDelete}>
          {trashing ? "Moving to Trash…" : "Move selected to Trash"}
        </button>
      </div>
    </section>
  );
}
