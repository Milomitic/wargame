import { useAuthStore } from "../../stores/authStore.js";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  constructionActive?: boolean;
  incomingMarchCount?: number;
  outgoingMarchCount?: number;
  allianceInviteCount?: number;
}

const NAV_ITEMS = [
  { id: "headquarters", icon: "🏰", label: "HQ" },
  { id: "map", icon: "🗺️", label: "MAP" },
  { id: "army", icon: "⚔️", label: "ARMY" },
  { id: "technology", icon: "🔬", label: "TECH" },
  { id: "diplomacy", icon: "🤝", label: "DIPLO" },
  { id: "intelligence", icon: "🕵️", label: "INTEL", disabled: true },
  { id: "admin", icon: "📊", label: "ADMIN" },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  constructionActive,
  incomingMarchCount = 0,
  outgoingMarchCount = 0,
  allianceInviteCount = 0,
}: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

  const armyTotal = incomingMarchCount + outgoingMarchCount;
  const armyTooltip =
    armyTotal > 0
      ? `Army — ${incomingMarchCount} incoming · ${outgoingMarchCount} outgoing`
      : "Army";

  return (
    <nav className="sidebar">
      {NAV_ITEMS.map((item) => {
        const isActive = activeTab === item.id;
        const cls = [
          "sidebar-item",
          isActive && "sidebar-item--active",
          item.disabled && "sidebar-item--disabled",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={item.id}
            className={cls}
            onClick={() => !item.disabled && onTabChange(item.id)}
            title={
              item.disabled
                ? "Coming soon"
                : item.id === "army"
                  ? armyTooltip
                  : item.label
            }
          >
            <span className="sidebar-item__icon">{item.icon}</span>
            <span className="sidebar-item__label">{item.label}</span>
            {item.id === "headquarters" && constructionActive && (
              <span className="sidebar-badge" />
            )}
            {item.id === "army" && armyTotal > 0 && (
              <span
                className={
                  incomingMarchCount > 0
                    ? "sidebar-count sidebar-count--incoming"
                    : "sidebar-count sidebar-count--neutral"
                }
              >
                {armyTotal > 99 ? "99+" : armyTotal}
              </span>
            )}
            {item.id === "diplomacy" && allianceInviteCount > 0 && (
              <span className="sidebar-count sidebar-count--neutral">
                {allianceInviteCount > 99 ? "99+" : allianceInviteCount}
              </span>
            )}
          </button>
        );
      })}

      <div className="sidebar-spacer" />
      <div className="sidebar-divider" />

      <button
        className="sidebar-item"
        onClick={logout}
        title="Logout"
      >
        <span className="sidebar-item__icon">{"🚪"}</span>
        <span className="sidebar-item__label">EXIT</span>
      </button>
    </nav>
  );
}
