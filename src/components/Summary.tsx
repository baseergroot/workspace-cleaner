import { formatSize } from "../utils/formatSize";
import type { FoundFolder } from "../types";

type SummaryProps = { folders: FoundFolder[] };

export function Summary({ folders }: SummaryProps) {
  const totalSize = folders.reduce((total, folder) => total + folder.size_bytes, 0);

  return (
    <section className="summary" aria-live="polite">
      <div><span>{folders.length}</span><small>folders found</small></div>
      <div><span>{formatSize(totalSize)}</span><small>space recoverable</small></div>
      <div className="targets">
        <span>node_modules · dist · build · .next · .nuxt · coverage · .turbo</span>
        <small>detected targets</small>
      </div>
    </section>
  );
}
