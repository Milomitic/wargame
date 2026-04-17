interface Props {
  count: number;
  onView: () => void;
}

export default function IncomingAttackBanner({ count, onView }: Props) {
  return (
    <div className="incoming-attack-banner">
      <span className="incoming-attack-banner__icon">{"🚨"}</span>
      <span className="incoming-attack-banner__text">
        <strong>{count}</strong> incoming attack{count > 1 ? "s" : ""} detected
      </span>
      <button
        type="button"
        onClick={onView}
        className="incoming-attack-banner__btn"
      >
        View →
      </button>
    </div>
  );
}
