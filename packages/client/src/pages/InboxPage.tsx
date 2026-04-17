import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PLAYER_AVATAR_GLYPHS,
  parseTileId,
  type BattleReport,
} from "@wargame/shared";
import { api } from "../api/client.js";
import { useSocket } from "../hooks/useSocket.js";
import { CoordLink } from "../components/CoordLink.js";
import BattleReportDetail from "../components/BattleReportDetail.js";
import {
  useNotificationStore,
  type Notification,
} from "../stores/notificationStore.js";
import { useMessageStore, type Message } from "../stores/messageStore.js";

type TabKey = "reports" | "messages" | "notifications";
type MessagesSubTab = "inbox" | "sent" | "compose";
type ReportsFilter = "all" | "victory" | "defeat" | "camp" | "player";

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

function isReportType(type: string): boolean {
  return type.startsWith("combat_") || type === "raid_incoming";
}

function routeForNotification(n: Notification): string | null {
  switch (n.type) {
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

export default function InboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "reports";
  const [tab, setTab] = useState<TabKey>(
    ["reports", "messages", "notifications"].includes(initialTab) ? initialTab : "reports"
  );
  const [messagesSubTab, setMessagesSubTab] = useState<MessagesSubTab>("inbox");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [reports, setReports] = useState<BattleReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportFilter, setReportFilter] = useState<ReportsFilter>("all");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Sync tab → URL
  function changeTab(t: TabKey) {
    setTab(t);
    const next = new URLSearchParams(searchParams);
    next.set("tab", t);
    setSearchParams(next, { replace: true });
  }

  const {
    notifications,
    fetchNotifications,
    markRead: markNotifRead,
    markAllRead: markAllNotifRead,
  } = useNotificationStore();

  const {
    inbox: messagesInbox,
    sent: messagesSent,
    unreadCount: messagesUnread,
    fetchInbox,
    fetchSent,
    markRead: markMessageRead,
    markAllRead: markAllMessagesRead,
    deleteMessage,
  } = useMessageStore();

  // Initial load
  useEffect(() => {
    fetchNotifications();
    fetchInbox();
    fetchSent();
    loadReports();
  }, [fetchNotifications, fetchInbox, fetchSent]);

  // Refresh reports when a new combat result comes in
  useSocket(
    "combat:result",
    useCallback(() => {
      loadReports();
    }, [])
  );

  async function loadReports() {
    try {
      const data = await api.get<{ reports: BattleReport[] }>("/battle-reports");
      setReports(data.reports);
    } catch {
      // silent
    } finally {
      setReportsLoading(false);
    }
  }

  // Filter notifications by report-type (for the Notifications tab — exclude combat ones)
  const notifList = notifications.filter((n) => !isReportType(n.type));
  const notifUnread = notifList.filter((n) => !n.isRead).length;
  const reportNotifs = notifications.filter((n) => isReportType(n.type) && !n.isRead);

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      if (!n.isRead) markNotifRead(n.id);
      const dest = routeForNotification(n);
      if (dest) navigate(dest);
    },
    [markNotifRead, navigate]
  );

  const handleMessageClick = useCallback(
    (m: Message) => {
      setSelectedMessage(m);
      // Mark as read if this is an inbox (received) message that's still unread
      if (m.isRead === 0 && m.senderName !== undefined) {
        markMessageRead(m.id);
      }
    },
    [markMessageRead]
  );

  // Filter reports by current filter
  const filteredReports = reports.filter((r) => {
    if (reportFilter === "all") return true;
    if (reportFilter === "victory") return r.result === "victory";
    if (reportFilter === "defeat") return r.result === "defeat";
    if (reportFilter === "camp") return r.defenderType === "camp";
    if (reportFilter === "player") return r.defenderType === "player";
    return true;
  });

  const reportTotals = {
    all: reports.length,
    victory: reports.filter((r) => r.result === "victory").length,
    defeat: reports.filter((r) => r.result === "defeat").length,
    camp: reports.filter((r) => r.defenderType === "camp").length,
    player: reports.filter((r) => r.defenderType === "player").length,
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fade-in">
      {/* Header + tabs */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{"💌"}</span>
          <div>
            <h1 className="font-title text-base font-bold text-[var(--color-gold)]">
              Inbox
            </h1>
            <p className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-widest">
              Reports · Messages · Notifications
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 border-b border-[var(--border-muted)]">
          <TabButton
            active={tab === "reports"}
            onClick={() => changeTab("reports")}
            icon="📜"
            label="Reports"
            badge={reportNotifs.length}
          />
          <TabButton
            active={tab === "messages"}
            onClick={() => changeTab("messages")}
            icon="💌"
            label="Messages"
            badge={messagesUnread}
          />
          <TabButton
            active={tab === "notifications"}
            onClick={() => changeTab("notifications")}
            icon="🔔"
            label="Notifications"
            badge={notifUnread}
          />
        </div>
      </div>

      {/* Tab content */}
      {tab === "reports" ? (
        <ReportsPanel
          loading={reportsLoading}
          reports={filteredReports}
          totalReports={reports.length}
          filter={reportFilter}
          totals={reportTotals}
          onFilter={setReportFilter}
          expandedId={expandedReportId}
          onToggleExpand={(id) =>
            setExpandedReportId(expandedReportId === id ? null : id)
          }
        />
      ) : tab === "messages" ? (
        <MessagesPanel
          subTab={messagesSubTab}
          onSubTabChange={setMessagesSubTab}
          inbox={messagesInbox}
          sent={messagesSent}
          unreadCount={messagesUnread}
          selected={selectedMessage}
          onSelect={handleMessageClick}
          onCloseSelected={() => setSelectedMessage(null)}
          onMarkAllRead={markAllMessagesRead}
          onDelete={async (id) => {
            await deleteMessage(id);
            if (selectedMessage?.id === id) setSelectedMessage(null);
          }}
        />
      ) : (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-title text-fluid-base font-bold text-[var(--color-gold)]">
              {"🔔"} Notifications
            </h2>
            {notifUnread > 0 && (
              <button
                type="button"
                onClick={() => markAllNotifRead()}
                className="text-fluid-xs text-[var(--text-muted)] hover:text-[var(--color-gold)] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifList.length === 0 ? (
            <div className="py-10 text-center">
              <span className="text-4xl block mb-2 opacity-60">📭</span>
              <p className="text-sm text-[var(--text-muted)] italic">
                No notifications. The realm is quiet.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {notifList.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`inbox-row${n.isRead ? "" : " inbox-row--unread"}`}
                >
                  <span className="inbox-row__icon">{n.icon || "📬"}</span>
                  <div className="inbox-row__body">
                    <div className="inbox-row__title-line">
                      <span className="inbox-row__title">{n.title}</span>
                      {!n.isRead && <span className="inbox-row__dot" />}
                    </div>
                    <div className="inbox-row__text">{n.body}</div>
                  </div>
                  <div className="inbox-row__time">{timeAgo(n.createdAt)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inbox-tab${active ? " inbox-tab--active" : ""}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge > 0 && <span className="inbox-tab__badge">{badge > 99 ? "99+" : badge}</span>}
    </button>
  );
}

interface ReportsPanelProps {
  loading: boolean;
  reports: BattleReport[];
  totalReports: number;
  filter: ReportsFilter;
  totals: Record<ReportsFilter, number>;
  onFilter: (f: ReportsFilter) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}

const FILTER_LABELS: Record<ReportsFilter, { label: string; icon: string }> = {
  all:     { label: "All",      icon: "📜" },
  victory: { label: "Victories", icon: "🏆" },
  defeat:  { label: "Defeats",   icon: "💀" },
  camp:    { label: "Vs Camps",  icon: "🔥" },
  player:  { label: "Vs Players", icon: "⚔️" },
};

function ReportsPanel({
  loading,
  reports,
  totalReports,
  filter,
  totals,
  onFilter,
  expandedId,
  onToggleExpand,
}: ReportsPanelProps) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-title text-fluid-base font-bold text-[var(--color-gold)]">
          {"📜"} Battle Reports
        </h2>
        <span className="text-fluid-xxs text-[var(--text-muted)] uppercase tracking-widest">
          {totalReports} total · {totals.victory} won · {totals.defeat} lost
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {(Object.keys(FILTER_LABELS) as ReportsFilter[]).map((k) => {
          const cfg = FILTER_LABELS[k];
          const isActive = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onFilter(k)}
              className={`reports-filter${isActive ? " reports-filter--active" : ""}`}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span className="reports-filter__count">{totals[k]}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="spinner w-5 h-5" />
          <span className="text-fluid-xs text-[var(--text-muted)]">
            Loading reports...
          </span>
        </div>
      ) : reports.length === 0 ? (
        <div className="py-8 text-center">
          <span className="text-3xl block mb-2 opacity-60">📜</span>
          <p className="text-sm text-[var(--text-muted)] italic">
            {totalReports === 0
              ? "No battles fought yet. Send your army on a march!"
              : "No reports match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const loc = parseTileId(r.tileId);
            const isVictory = r.result === "victory";
            const isExpanded = expandedId === r.id;
            const totalLosses = Object.values(r.attackerLosses).reduce(
              (s, q) => s + q,
              0
            );
            return (
              <div
                key={r.id}
                className={`br-row br-row--${isVictory ? "victory" : "defeat"} ${isExpanded ? "br-row--expanded" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onToggleExpand(r.id)}
                  className="br-row__trigger"
                >
                  <span className="br-row__icon">{isVictory ? "🏆" : "💀"}</span>
                  <span className="br-row__result">
                    {isVictory ? "Victory" : "Defeat"}
                  </span>
                  <span className="br-row__vs">
                    vs {r.defenderType === "camp" ? "Barbarian Camp" : "Enemy Lord"}
                  </span>
                  {totalLosses > 0 && (
                    <span className="br-row__losses">
                      −{totalLosses} losses
                    </span>
                  )}
                  <span className="br-row__meta">
                    <CoordLink x={loc.x} y={loc.y} />
                    <span className="br-row__sep">·</span>
                    <span className="br-row__time">{timeAgo(r.createdAt)}</span>
                  </span>
                  <span className="br-row__chevron">{isExpanded ? "▾" : "▸"}</span>
                </button>

                {isExpanded && (
                  <div className="br-row__body">
                    <BattleReportDetail report={r} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MessagesPanelProps {
  subTab: MessagesSubTab;
  onSubTabChange: (t: MessagesSubTab) => void;
  inbox: Message[];
  sent: Message[];
  unreadCount: number;
  selected: Message | null;
  onSelect: (m: Message) => void;
  onCloseSelected: () => void;
  onMarkAllRead: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function MessagesPanel({
  subTab,
  onSubTabChange,
  inbox,
  sent,
  unreadCount,
  selected,
  onSelect,
  onCloseSelected,
  onMarkAllRead,
  onDelete,
}: MessagesPanelProps) {
  const list = subTab === "inbox" ? inbox : subTab === "sent" ? sent : [];

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-1.5">
          <SubTabBtn
            active={subTab === "inbox"}
            onClick={() => onSubTabChange("inbox")}
            label="📥 Inbox"
            badge={unreadCount}
          />
          <SubTabBtn
            active={subTab === "sent"}
            onClick={() => onSubTabChange("sent")}
            label="📤 Sent"
          />
          <SubTabBtn
            active={subTab === "compose"}
            onClick={() => onSubTabChange("compose")}
            label="✍️ Compose"
          />
        </div>
        {subTab === "inbox" && unreadCount > 0 && (
          <button
            type="button"
            onClick={() => onMarkAllRead()}
            className="text-fluid-xs text-[var(--text-muted)] hover:text-[var(--color-gold)] transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {subTab === "compose" ? (
        <ComposeForm onSent={() => onSubTabChange("sent")} />
      ) : list.length === 0 ? (
        <div className="py-10 text-center">
          <span className="text-4xl block mb-2 opacity-60">
            {subTab === "inbox" ? "📭" : "📤"}
          </span>
          <p className="text-sm text-[var(--text-muted)] italic">
            {subTab === "inbox"
              ? "No messages received yet."
              : "You haven't sent any messages yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-3">
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
            {list.map((m) => {
              const isOutgoing = subTab === "sent";
              const otherName = isOutgoing
                ? m.recipientName ?? "Unknown"
                : m.senderName ?? "Unknown";
              const otherAvatar = isOutgoing
                ? m.recipientAvatar ?? "knight"
                : m.senderAvatar ?? "knight";
              const isSelected = selected?.id === m.id;
              const isUnread = !isOutgoing && m.isRead === 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelect(m)}
                  className={`message-row${isUnread ? " message-row--unread" : ""}${isSelected ? " message-row--selected" : ""}`}
                >
                  <span className="message-row__avatar">
                    {PLAYER_AVATAR_GLYPHS[otherAvatar] ?? "🧑"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="message-row__name">{otherName}</span>
                      {isUnread && <span className="message-row__dot" />}
                    </div>
                    <div className="message-row__subject">{m.subject}</div>
                    <div className="message-row__preview">{m.body}</div>
                  </div>
                  <span className="message-row__time">{timeAgo(m.createdAt)}</span>
                </button>
              );
            })}
          </div>

          {/* Detail pane */}
          <div className="border-l border-[var(--border-muted)] md:pl-4">
            {selected ? (
              <MessageDetail
                message={selected}
                isOutgoing={subTab === "sent"}
                onClose={onCloseSelected}
                onDelete={() => onDelete(selected.id)}
              />
            ) : (
              <div className="py-10 text-center text-fluid-xs text-[var(--text-muted)] italic">
                Select a message to read its content.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubTabBtn({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`subtab${active ? " subtab--active" : ""}`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="subtab__badge">{badge}</span>
      )}
    </button>
  );
}

function MessageDetail({
  message,
  isOutgoing,
  onClose,
  onDelete,
}: {
  message: Message;
  isOutgoing: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const otherName = isOutgoing
    ? message.recipientName ?? "Unknown"
    : message.senderName ?? "Unknown";
  const otherAvatar = isOutgoing
    ? message.recipientAvatar ?? "knight"
    : message.senderAvatar ?? "knight";

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="message-detail__avatar">
          {PLAYER_AVATAR_GLYPHS[otherAvatar] ?? "🧑"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-fluid-xxs uppercase tracking-wide text-[var(--text-muted)]">
            {isOutgoing ? "To" : "From"}
          </div>
          <div className="text-fluid-base font-bold text-[var(--text-primary)]">
            {otherName}
          </div>
          <div className="text-fluid-xxs text-[var(--text-muted)]">
            {timeAgo(message.createdAt)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost text-sm px-2 py-1"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div>
        <div className="text-fluid-base font-bold text-[var(--color-gold)] mb-1">
          {message.subject}
        </div>
        <div className="text-fluid-sm whitespace-pre-wrap text-[var(--text-secondary)]">
          {message.body}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-muted)]">
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this message? This cannot be undone.")) {
              onDelete();
            }
          }}
          className="btn-ghost text-fluid-xs px-2 py-1 text-[var(--color-danger-light)]"
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

function ComposeForm({ onSent }: { onSent: () => void }) {
  const sendMessage = useMessageStore((s) => s.sendMessage);
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(false);
    const result = await sendMessage({
      recipient: recipient.trim(),
      subject: subject.trim(),
      body: body.trim(),
    });
    setSending(false);
    if (result.ok) {
      setSuccess(true);
      setRecipient("");
      setSubject("");
      setBody("");
      setTimeout(() => onSent(), 800);
    } else {
      setError(result.error ?? "Failed to send");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-2xl">
      <div>
        <label className="profile-edit__label">Recipient (username)</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          required
          minLength={1}
          maxLength={40}
          placeholder="username"
          className="input-field"
        />
      </div>

      <div>
        <label className="profile-edit__label">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          minLength={1}
          maxLength={120}
          placeholder="Subject..."
          className="input-field"
        />
      </div>

      <div>
        <label className="profile-edit__label">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={1}
          maxLength={4000}
          rows={8}
          placeholder="Write your message..."
          className="input-field"
        />
        <div className="text-fluid-xxs text-[var(--text-muted)] text-right mt-0.5">
          {body.length}/4000
        </div>
      </div>

      {error && (
        <div className="text-fluid-xs text-[var(--color-danger-light)]">{error}</div>
      )}
      {success && (
        <div className="text-fluid-xs text-[var(--color-success)]">
          ✓ Message sent successfully!
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" disabled={sending} className="btn-primary">
          {sending ? (
            <>
              <span className="spinner w-3 h-3 inline-block mr-1.5" />
              Sending...
            </>
          ) : (
            "✉️ Send Message"
          )}
        </button>
      </div>
    </form>
  );
}
