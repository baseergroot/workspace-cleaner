type WorkspacePickerProps = {
  workspace: string;
  scanning: boolean;
  browsing: boolean;
  busy: boolean;
  cancelingScan: boolean;
  onWorkspaceChange: (workspace: string) => void;
  onBrowse: () => void;
  onScan: () => void;
  onCancelScan: () => void;
};

export function WorkspacePicker({
  workspace,
  scanning,
  browsing,
  busy,
  cancelingScan,
  onWorkspaceChange,
  onBrowse,
  onScan,
  onCancelScan,
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
          disabled={scanning || busy}
          onChange={(event) => onWorkspaceChange(event.target.value)}
        />
        <button className="secondary" onClick={onBrowse} disabled={scanning || browsing || busy}>
          {browsing ? "Opening…" : "Browse"}
        </button>
        <button className="primary" onClick={onScan} disabled={scanning || browsing || busy}>
          {scanning ? "Scanning…" : "Scan"}
        </button>
        {scanning && <button className="secondary" onClick={onCancelScan} disabled={cancelingScan}>{cancelingScan ? "Canceling…" : "Cancel scan"}</button>}
      </div>
      <p className="hint">
        Only detected folders inside this directory will be shown. Nothing is deleted during scanning.
      </p>
    </section>
  );
}
