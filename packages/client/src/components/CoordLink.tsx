import { Link } from "react-router-dom";

/** Standalone coordinate link — always renders as [x, y] in square brackets. */
export function CoordLink({ x, y }: { x: number; y: number }) {
  return (
    <Link
      to={`/map?x=${x}&y=${y}`}
      className="font-mono text-[var(--text-secondary)] hover:text-[var(--color-gold)] transition-colors underline-offset-2 hover:underline"
      title={`View on map [${x}, ${y}]`}
    >
      [{x}, {y}]
    </Link>
  );
}
