import { useEffect } from "react";
import { useEventLogStore } from "../../stores/eventLogStore.js";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const TYPE_CLASS: Record<string, string> = {
  info: "",
  success: "log-entry__text--green",
  warning: "log-entry__text--orange",
  danger: "log-entry__text--red",
};

export default function BottomBar() {
  const events = useEventLogStore((s) => s.events);
  const addEvent = useEventLogStore((s) => s.addEvent);
  const clearEvents = useEventLogStore((s) => s.clearEvents);

  useEffect(() => {
    if (events.length === 0) {
      addEvent({ icon: "\u{1F4E1}", text: "Connected to command center", type: "success" });
      addEvent({ icon: "\u2699\uFE0F", text: "Systems initialized", type: "info" });
    }
  }, []);

  return (
    <div className="bottombar">
      <div className="bottombar__header">
        <div className="bottombar__title">
          <span className="bottombar__dot" />
          Communication Log
        </div>
        <button
          onClick={clearEvents}
          className="btn-ghost text-[0.6rem] px-2 py-0.5"
        >
          Clear
        </button>
      </div>
      <div className="bottombar__log">
        {events.map((e) => (
          <div key={e.id} className="log-entry">
            <span className="log-entry__time">{formatTime(e.timestamp)}</span>
            <span>{e.icon}</span>
            <span className={`log-entry__text ${TYPE_CLASS[e.type] || ""}`}>
              {e.text}
            </span>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] py-2">No events logged</p>
        )}
      </div>
    </div>
  );
}
