import { formatSize } from "../utils/formatSize";
import type { FoundFolder } from "../types";

type ResultRowProps = {
  folder: FoundFolder;
  selected: boolean;
  onToggle: (path: string) => void;
};

export function ResultRow({ folder, selected, onToggle }: ResultRowProps) {
  return (
    <label className="result-row">
      <input
        type="checkbox"
        value={folder.path}
        checked={selected}
        onChange={() => onToggle(folder.path)}
      />
      <span className="folder-icon">⌁</span>
      <span className="folder-info">
        <strong>{folder.name}</strong>
        <small>{folder.project}</small>
      </span>
      <span className="folder-size">{formatSize(folder.size_bytes)}</span>
    </label>
  );
}
