import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TICK_INTERVAL_MS } from "@wargame/shared";

function nextTickIn(): number {
  // Tick happens at every multiple of TICK_INTERVAL_MS
  const ms = TICK_INTERVAL_MS - (Date.now() % TICK_INTERVAL_MS);
  return Math.ceil(ms / 1000);
}

function formatServerTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function BottomBar() {
  const navigate = useNavigate();
  const [tickIn, setTickIn] = useState(nextTickIn);
  const [serverTime, setServerTime] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setTickIn(nextTickIn());
      setServerTime(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bottombar">
      <div className="bottombar__footer">
        <span className="bottombar__footer-brand">
          {"🏰"} Medieval Wargame
          <span className="bottombar__footer-version">v0.1</span>
        </span>
        <span className="bottombar__footer-sep">·</span>
        <span className="bottombar__footer-status">
          <span className="bottombar__footer-dot" />
          Realm online
        </span>
        <span className="bottombar__footer-sep">·</span>
        <span className="bottombar__footer-clock" title="Server time">
          {"🕰️"} {formatServerTime(serverTime)}
        </span>
        <span className="bottombar__footer-sep">·</span>
        <span className="bottombar__footer-tick" title="Time until next game tick">
          {"⏱️"} Next tick in {tickIn}s
        </span>
        <span className="bottombar__footer-sep bottombar__footer-sep--hide-sm">·</span>
        <button
          type="button"
          onClick={() => navigate("/manual")}
          className="bottombar__footer-link"
          title="Open game guide"
        >
          {"📖"} Guide
        </button>
        <span className="bottombar__footer-sep bottombar__footer-sep--hide-sm">·</span>
        <span className="bottombar__footer-motto bottombar__footer-sep--hide-sm">
          {"⚔️"} Build. Conquer. Rule.
        </span>
      </div>
    </div>
  );
}
