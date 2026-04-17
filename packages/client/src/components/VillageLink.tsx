import { useNavigate } from "react-router-dom";

interface VillageLinkProps {
  name: string;
  x: number;
  y: number;
  className?: string;
}

/**
 * Clickable village name + coordinates that navigates to the map centered
 * on those coordinates. Coords always in square brackets [x, y].
 *
 * Usage: <VillageLink name="BARI" x={-11} y={-27} />
 * Renders: BARI [-11, -27]  (all clickable, styled as link)
 */
export function VillageLink({ name, x, y, className }: VillageLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/map?x=${x}&y=${y}`);
      }}
      className={`village-link ${className ?? ""}`}
      title={`View ${name} on map at [${x}, ${y}]`}
    >
      <span className="village-link__name">{name}</span>
      <span className="village-link__coords">[{x}, {y}]</span>
    </button>
  );
}
