type WorkspacePickerProps = {
  workspace: string;
  scanning: boolean;
  onWorkspaceChange: (workspace: string) => void;
  onBrowse: () => void;
  onScan: () => void;
};

export function WorkspacePicker({
  workspace,
  scanning,
  onWorkspaceChange,
  onBrowse,
  onScan,
}: WorkspacePickerProps) {
  return (
    <section className="workspace-card">
      <label htmlFor="workspace">Workspace directory</label>
      <div className="path-row">
        <input
          id="workspace"
          placeholder="/home/you/projects"
          spellCheck={false}
          value={workspace}
          onChange={(event) => onWorkspaceChange(event.target.value)}
        />
        <button className="secondary" onClick={onBrowse} disabled={scanning}>
          Browse
        </button>
        <button className="primary" onClick={onScan} disabled={scanning}>
          {scanning ? "Scanning…" : "Scan"}
        </button>
      </div>
      <p className="hint">
        Only detected folders inside this directory will be shown. Nothing is deleted during scanning.
      </p>
    </section>
  );
}
