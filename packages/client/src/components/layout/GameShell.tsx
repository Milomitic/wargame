import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { useEventLogStore } from "../../stores/eventLogStore.js";
import { api } from "../../api/client.js";
import { useSocket, useSocketConnect } from "../../hooks/useSocket.js";
import Sidebar from "./Sidebar.js";
import TopBar from "./TopBar.js";
import BottomBar from "./BottomBar.js";
import DashboardContent from "../../pages/DashboardPage.js";
import WorldMapPage from "../../pages/WorldMapPage.js";
import ArmyPage from "../../pages/ArmyPage.js";
import AlliancePage from "../../pages/AlliancePage.js";

interface FiefData {
  fief: {
    id: string;
    name: string;
    level: number;
    population: number;
    morale: number;
  };
  resources: Array<{
    resourceType: string;
    amount: number;
    capacity: number;
    productionRate: number;
    updatedAt: number;
  }>;
  buildings: Array<{
    buildingType: string;
    level: number;
    isConstructing: boolean;
    constructionTicksRemaining: number;
  }>;
  troops: Array<{
    troopType: string;
    quantity: number;
    isRecruiting: boolean;
    recruitingQuantity: number;
    recruitingTicksRemaining: number;
  }>;
}

export default function GameShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const player = useAuthStore((s) => s.player);
  const addEvent = useEventLogStore((s) => s.addEvent);

  const [fiefData, setFiefData] = useState<FiefData | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive active tab from URL
  const activeTab =
    location.pathname === "/map"
      ? "map"
      : location.pathname === "/army"
        ? "army"
        : location.pathname === "/diplomacy"
          ? "diplomacy"
          : "headquarters";

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === "map") navigate("/map");
      else if (tab === "army") navigate("/army");
      else if (tab === "diplomacy") navigate("/diplomacy");
      else navigate("/dashboard");
    },
    [navigate]
  );

  const loadFief = useCallback(async () => {
    try {
      const data = await api.get<FiefData>("/fief");
      setFiefData(data);
    } catch {
      // silent retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFief();
    const interval = setInterval(loadFief, 60_000);
    return () => clearInterval(interval);
  }, [loadFief]);

  // Socket.io
  useSocketConnect();

  useSocket(
    "building:complete",
    useCallback(
      (data: { buildingType: string; level: number }) => {
        loadFief();
        addEvent({
          icon: "\u2705",
          text: `${data.buildingType} construction complete (Lv.${data.level})`,
          type: "success",
        });
      },
      [loadFief, addEvent]
    )
  );

  useSocket(
    "building:progress",
    useCallback(
      (data: { buildingType: string; ticksRemaining: number }) => {
        setFiefData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            buildings: prev.buildings.map((b) =>
              b.buildingType === data.buildingType
                ? { ...b, constructionTicksRemaining: data.ticksRemaining }
                : b
            ),
          };
        });
      },
      []
    )
  );

  // Troop socket events
  useSocket(
    "troop:recruited",
    useCallback(
      (data: { troopType: string; quantity: number }) => {
        loadFief();
        addEvent({
          icon: "\u2694\uFE0F",
          text: `${data.troopType} recruitment complete (${data.quantity} units)`,
          type: "success",
        });
      },
      [loadFief, addEvent]
    )
  );

  useSocket(
    "troop:progress",
    useCallback(
      (data: { troopType: string; ticksRemaining: number; recruitingQuantity: number }) => {
        setFiefData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            troops: (prev.troops || []).map((t) =>
              t.troopType === data.troopType
                ? { ...t, recruitingTicksRemaining: data.ticksRemaining }
                : t
            ),
          };
        });
      },
      []
    )
  );

  useSocket(
    "combat:result",
    useCallback(
      (data: { result: string; defenderType: string; loot: Record<string, number> | null }) => {
        loadFief();
        const isVictory = data.result === "victory";
        const target = data.defenderType === "camp" ? "barbarian camp" : "enemy";
        addEvent({
          icon: isVictory ? "\u{1F3C6}" : "\u{1F480}",
          text: isVictory
            ? `Victory against ${target}!${data.loot ? " Loot collected." : ""}`
            : `Defeat against ${target}. Survivors retreating.`,
          type: isVictory ? "success" : "danger",
        });
      },
      [loadFief, addEvent]
    )
  );

  useSocket(
    "march:arrived",
    useCallback(
      (data: { targetTileId: string }) => {
        addEvent({
          icon: "\u{1F3F4}",
          text: `Army arrived at ${data.targetTileId}`,
          type: "info",
        });
      },
      [addEvent]
    )
  );

  useSocket(
    "combat:raid_incoming",
    useCallback(
      (data: {
        attackerName: string;
        result: string;
        lootLost: Record<string, number> | null;
        defenderLosses: Record<string, number>;
      }) => {
        loadFief();
        const defended = data.result === "victory";
        addEvent({
          icon: defended ? "\u{1F6E1}\uFE0F" : "\u{1F525}",
          text: defended
            ? `Defended against raid by ${data.attackerName}!`
            : `Raided by ${data.attackerName}! Resources stolen.`,
          type: defended ? "success" : "danger",
        });
      },
      [loadFief, addEvent]
    )
  );

  useSocket(
    "alliance:invite_received",
    useCallback(
      (data: { allianceName: string; allianceTag: string; inviterName: string }) => {
        addEvent({
          icon: "\u{1F91D}",
          text: `Alliance invite from [${data.allianceTag}] ${data.allianceName} by ${data.inviterName}`,
          type: "info",
        });
      },
      [addEvent]
    )
  );

  useSocket(
    "alliance:member_joined",
    useCallback(
      (data: { playerName: string }) => {
        addEvent({
          icon: "\u{1F91D}",
          text: `${data.playerName} joined the alliance`,
          type: "success",
        });
      },
      [addEvent]
    )
  );

  useSocket(
    "alliance:member_left",
    useCallback(
      (data: { playerName: string }) => {
        addEvent({
          icon: "\u{1F6AA}",
          text: `${data.playerName} left the alliance`,
          type: "warning",
        });
      },
      [addEvent]
    )
  );

  const isConstructing = fiefData?.buildings.some((b) => b.isConstructing) ?? false;

  return (
    <div className="game-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        constructionActive={isConstructing}
      />

      <TopBar
        resources={fiefData?.resources ?? []}
        playerName={player?.displayName ?? ""}
        fief={fiefData?.fief ?? null}
        buildings={fiefData?.buildings ?? []}
      />

      <div className="main-content">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-3">
            <div className="spinner w-8 h-8" />
            <span className="text-sm text-[var(--text-muted)]">Loading...</span>
          </div>
        ) : activeTab === "headquarters" ? (
          <DashboardContent
            buildings={fiefData?.buildings ?? []}
            resources={fiefData?.resources ?? []}
            troops={fiefData?.troops ?? []}
            onRefresh={loadFief}
          />
        ) : activeTab === "map" ? (
          <WorldMapPage />
        ) : activeTab === "army" ? (
          <ArmyPage />
        ) : activeTab === "diplomacy" ? (
          <AlliancePage />
        ) : null}
      </div>

      <BottomBar />
    </div>
  );
}
