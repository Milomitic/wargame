import { useNavigate } from "react-router-dom";

interface PlayerLinkProps {
  playerId: string;
  name: string;
  className?: string;
}

/**
 * Clickable player name that navigates to their profile.
 * Use this everywhere a player name is shown in the UI.
 */
export function PlayerLink({ playerId, name, className }: PlayerLinkProps) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/player/${playerId}`);
      }}
      className={`player-link ${className ?? ""}`}
      title={`View ${name}'s profile`}
    >
      {name}
    </button>
  );
}
