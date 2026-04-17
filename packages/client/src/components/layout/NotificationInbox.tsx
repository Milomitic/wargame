import { useEffect, useRef, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore, type Notification } from "../../stores/notificationStore.js";

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function routeForNotification(n: Notification): string | null {
  switch (n.type) {
    case "combat_victory":
    case "combat_defeat":
    case "raid_incoming":
    case "troops_returned":
      return "/army";
    case "building_complete":
    case "troop_recruited":
      return "/";
    case "alliance_invite":
    case "alliance_member":
      return "/diplomacy";
    default:
      return null;
  }
}

export default function NotificationInbox({ open, onClose, anchorRef }: Props) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationStore();

  useEffect(() => {
    if (!open) return;
    fetchNotifications();
  }, [open, fetchNotifications]);

  // Click outside closes
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  function handleClick(n: Notification) {
    if (!n.isRead) markRead(n.id);
    const dest = routeForNotification(n);
    if (dest) navigate(dest);
    onClose();
  }

  return (
    <div ref={panelRef} className="notification-inbox">
      <div className="notification-inbox__header">
        <span className="notification-inbox__title">
          {"📬"} Inbox
          {unreadCount > 0 && (
            <span className="notification-inbox__unread-count">
              {unreadCount}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          className="notification-inbox__mark-all"
        >
          Mark all read
        </button>
      </div>

      <div className="notification-inbox__list">
        {loading && notifications.length === 0 ? (
          <div className="notification-inbox__empty">
            <span className="spinner w-3 h-3 inline-block" /> Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-inbox__empty">
            <span className="text-2xl block mb-1">📭</span>
            No messages yet.
            <div className="text-fluid-xxs opacity-60 mt-0.5">
              Your inbox will fill as the realm grows.
            </div>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`notification-row${n.isRead ? "" : " notification-row--unread"}`}
            >
              <span className="notification-row__icon">{n.icon || "📬"}</span>
              <div className="notification-row__body">
                <div className="notification-row__title-line">
                  <span className="notification-row__title">{n.title}</span>
                  {!n.isRead && <span className="notification-row__dot" />}
                </div>
                <div className="notification-row__text">{n.body}</div>
                <div className="notification-row__time">{timeAgo(n.createdAt)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        className="notification-inbox__footer-link"
        onClick={() => {
          onClose();
          navigate("/inbox");
        }}
      >
        💌 Open full Inbox →
      </button>
    </div>
  );
}
