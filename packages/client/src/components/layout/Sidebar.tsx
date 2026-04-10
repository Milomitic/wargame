import { useAuthStore } from "../../stores/authStore.js";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  constructionActive?: boolean;
}

const NAV_ITEMS = [
  { id: "headquarters", icon: "\u{1F3F0}", label: "HQ" },
  { id: "map", icon: "\u{1F5FA}\uFE0F", label: "MAP" },
  { id: "army", icon: "\u2694\uFE0F", label: "ARMY" },
  { id: "technology", icon: "\u{1F52C}", label: "TECH", disabled: true },
  { id: "diplomacy", icon: "\u{1F91D}", label: "DIPLO" },
  { id: "intelligence", icon: "\u{1F575}\uFE0F", label: "INTEL", disabled: true },
];

export default function Sidebar({ activeTab, onTabChange, constructionActive }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);

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
            title={item.disabled ? "Coming soon" : item.label}
          >
            <span className="sidebar-item__icon">{item.icon}</span>
            <span className="sidebar-item__label">{item.label}</span>
            {item.id === "headquarters" && constructionActive && (
              <span className="sidebar-badge" />
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
        <span className="sidebar-item__icon">{"\u{1F6AA}"}</span>
        <span className="sidebar-item__label">EXIT</span>
      </button>
    </nav>
  );
}
