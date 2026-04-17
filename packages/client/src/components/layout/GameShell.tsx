import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore.js";
import { useEventLogStore } from "../../stores/eventLogStore.js";
import { useNotificationStore, type Notification } from "../../stores/notificationStore.js";
import { useMessageStore, type Message } from "../../stores/messageStore.js";
import { api } from "../../api/client.js";
import { useSocket, useSocketConnect } from "../../hooks/useSocket.js";
import type { LeaderboardData } from "@wargame/shared";
import Sidebar from "./Sidebar.js";
import TopBar from "./TopBar.js";
import BottomBar from "./BottomBar.js";
import LeaderboardModal from "./LeaderboardModal.js";
import NotificationToastStack from "./NotificationToast.js";
import IncomingAttackBanner from "./IncomingAttackBanner.js";
import ProfileEditModal from "./ProfileEditModal.js";
import DashboardContent from "../../pages/DashboardPage.js";
import WorldMapPage from "../../pages/WorldMapPage.js";
import ArmyPage from "../../pages/ArmyPage.js";
import AlliancePage from "../../pages/AlliancePage.js";
import TechTreePage from "../../pages/TechTreePage.js";
import PlayerProfilePage from "../../pages/PlayerProfilePage.js";
import AllianceProfilePage from "../../pages/AllianceProfilePage.js";
import AdminDashboard from "../../pages/AdminDashboard.js";
import GameManual from "../../pages/GameManual.js";
import MarchDetailPage from "../../pages/MarchDetailPage.js";
import BattleReportsPage from "../../pages/BattleReportsPage.js";
import InboxPage from "../../pages/InboxPage.js";

interface FiefData {
  fief: {
    id: string;
    name: string;
    tileId: string;
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
    constructionStartedAt?: number | null;
  }>;
  troops: Array<{
    troopType: string;
    quantity: number;
    isRecruiting: boolean;
    recruitingQuantity: number;
    recruitingTicksRemaining: number;
    recruitingStartedAt?: number | null;
  }>;
}

export default function GameShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const player = useAuthStore((s) => s.player);
  const addEvent = useEventLogStore((s) => s.addEvent);

  const [fiefData, setFiefData] = useState<FiefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [incomingMarchCount, setIncomingMarchCount] = useState(0);
  const [outgoingMarchCount, setOutgoingMarchCount] = useState(0);
  const [allianceInviteCount, setAllianceInviteCount] = useState(0);

  // Notification store integration
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const notifications = useNotificationStore((s) => s.notifications);
  const notificationUnreadCount = useNotificationStore((s) => s.unreadCount);

  // Split unread notifications: combat/raid → reports, others → notifications
  const reportUnreadCount = notifications.filter(
    (n) => !n.isRead && (n.type.startsWith("combat_") || n.type === "raid_incoming")
  ).length;
  const genericNotifUnreadCount = notifications.filter(
    (n) => !n.isRead && !n.type.startsWith("combat_") && n.type !== "raid_incoming"
  ).length;

  // Message store integration
  const fetchMessageUnreadCount = useMessageStore((s) => s.fetchUnreadCount);
  const addIncomingMessage = useMessageStore((s) => s.addIncoming);
  const messageUnreadCount = useMessageStore((s) => s.unreadCount);

  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
    fetchMessageUnreadCount();
    const id = setInterval(fetchUnreadCount, 60_000);
    const nid = setInterval(fetchNotifications, 60_000);
    const mid = setInterval(fetchMessageUnreadCount, 60_000);
    return () => {
      clearInterval(id);
      clearInterval(nid);
      clearInterval(mid);
    };
  }, [fetchUnreadCount, fetchNotifications, fetchMessageUnreadCount]);

  // Derive active tab from URL
  const activeTab =
    location.pathname === "/map"
      ? "map"
      : location.pathname === "/army"
        ? "army"
        : location.pathname === "/diplomacy"
          ? "diplomacy"
          : location.pathname === "/tech"
            ? "technology"
            : location.pathname.startsWith("/march/")
              ? "march-detail"
              : location.pathname === "/manual"
                ? "manual"
              : location.pathname === "/admin"
                ? "admin"
              : location.pathname === "/reports"
                ? "reports"
              : location.pathname === "/inbox"
                ? "inbox"
              : location.pathname.startsWith("/player/")
                ? "player-profile"
                : location.pathname.startsWith("/alliance/")
                  ? "alliance-profile"
                  : "headquarters";

  const handleTabChange = useCallback(
    (tab: string) => {
      if (tab === "map") navigate("/map");
      else if (tab === "army") navigate("/army");
      else if (tab === "diplomacy") navigate("/diplomacy");
      else if (tab === "technology") navigate("/tech");
      else if (tab === "manual") navigate("/manual");
      else if (tab === "admin") navigate("/admin");
      else if (tab === "reports") navigate("/reports");
      else if (tab === "inbox") navigate("/inbox");
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

  const loadLeaderboard = useCallback(async () => {
    try {
      const data = await api.get<LeaderboardData>("/leaderboard");
      setLeaderboard(data);
    } catch {
      // silent
    }
  }, []);

  const loadMarchCounts = useCallback(async () => {
    try {
      const [inc, mine] = await Promise.all([
        api.get<{ incoming: Array<{ id: string }> }>("/marches/incoming"),
        api.get<{ marches: Array<{ id: string; status: string }> }>("/marches"),
      ]);
      setIncomingMarchCount((inc.incoming || []).length);
      setOutgoingMarchCount(
        (mine.marches || []).filter(
          (m) => m.status === "marching" || m.status === "returning"
        ).length
      );
    } catch {
      // silent
    }
  }, []);

  const loadAllianceInvites = useCallback(async () => {
    try {
      const data = await api.get<{ invites: Array<{ id: string }> }>(
        "/alliance/invites"
      );
      setAllianceInviteCount((data.invites || []).length);
    } catch {
      // endpoint may not exist / no invites — silent
      setAllianceInviteCount(0);
    }
  }, []);

  useEffect(() => {
    loadFief();
    loadLeaderboard();
    loadMarchCounts();
    loadAllianceInvites();
    const interval = setInterval(loadFief, 60_000);
    const lbInterval = setInterval(loadLeaderboard, 120_000);
    const marchInterval = setInterval(loadMarchCounts, 15_000);
    const inviteInterval = setInterval(loadAllianceInvites, 60_000);
    return () => {
      clearInterval(interval);
      clearInterval(lbInterval);
      clearInterval(marchInterval);
      clearInterval(inviteInterval);
    };
  }, [loadFief, loadLeaderboard, loadMarchCounts, loadAllianceInvites]);

  // Socket.io
  useSocketConnect();

  useSocket(
    "building:complete",
    useCallback(
      (data: { buildingType: string; level: number }) => {
        loadFief();
        addEvent({
          icon: "✅",
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
          icon: "⚔️",
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
          icon: isVictory ? "🏆" : "💀",
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
        loadMarchCounts();
        addEvent({
          icon: "🏴",
          text: `Army arrived at ${data.targetTileId}`,
          type: "info",
        });
      },
      [addEvent, loadMarchCounts]
    )
  );

  useSocket(
    "march:progress",
    useCallback(
      (data: { status?: string }) => {
        // Returning/completed transitions change outgoing count
        if (data.status === "completed" || data.status === "returning") {
          loadMarchCounts();
        }
      },
      [loadMarchCounts]
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
        loadMarchCounts();
        const defended = data.result === "victory";
        addEvent({
          icon: defended ? "🛡️" : "🔥",
          text: defended
            ? `Defended against raid by ${data.attackerName}!`
            : `Raided by ${data.attackerName}! Resources stolen.`,
          type: defended ? "success" : "danger",
        });
      },
      [loadFief, addEvent, loadMarchCounts]
    )
  );

  useSocket(
    "tech:completed",
    useCallback(
      (data: { techId: string; techName: string }) => {
        addEvent({
          icon: "🔬",
          text: `Research complete: ${data.techName}`,
          type: "success",
        });
      },
      [addEvent]
    )
  );

  useSocket(
    "alliance:invite_received",
    useCallback(
      (data: { allianceName: string; allianceTag: string; inviterName: string }) => {
        loadAllianceInvites();
        addEvent({
          icon: "🤝",
          text: `Alliance invite from [${data.allianceTag}] ${data.allianceName} by ${data.inviterName}`,
          type: "info",
        });
      },
      [addEvent, loadAllianceInvites]
    )
  );

  useSocket(
    "alliance:member_joined",
    useCallback(
      (data: { playerName: string }) => {
        addEvent({
          icon: "🤝",
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
          icon: "🚪",
          text: `${data.playerName} left the alliance`,
          type: "warning",
        });
      },
      [addEvent]
    )
  );

  // Real-time notification arrivals
  useSocket(
    "notification:new",
    useCallback(
      (data: Notification) => {
        addNotification(data);
      },
      [addNotification]
    )
  );

  // Real-time message arrivals
  useSocket(
    "message:new",
    useCallback(
      (data: any) => {
        // Build a Message-shaped object — we only have sender info so far;
        // recipient is the current player.
        const msg: Message = {
          id: data.id,
          senderId: data.senderId,
          recipientId: player?.id ?? "",
          subject: data.subject,
          body: data.body,
          isRead: 0,
          parentId: null,
          createdAt: data.createdAt,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
        };
        addIncomingMessage(msg);
        // Also push a notification-style toast via the notification store
        addNotification({
          id: `msg-toast-${data.id}`,
          type: "message_new",
          title: `New message from ${data.senderName}`,
          body: data.subject,
          icon: "✉️",
          isRead: 0,
          relatedId: data.id,
          createdAt: data.createdAt,
        });
      },
      [addIncomingMessage, addNotification, player?.id]
    )
  );

  const isConstructing = fiefData?.buildings.some((b) => b.isConstructing) ?? false;

  return (
    <div className="game-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        constructionActive={isConstructing}
        incomingMarchCount={incomingMarchCount}
        outgoingMarchCount={outgoingMarchCount}
        allianceInviteCount={allianceInviteCount}
      />

      <TopBar
        resources={fiefData?.resources ?? []}
        buildings={fiefData?.buildings ?? []}
        playerName={player?.displayName ?? ""}
        playerAvatar={player?.avatar}
        playerIsAdmin={player?.isAdmin}
        leaderboard={leaderboard}
        onOpenLeaderboard={() => {
          loadLeaderboard();
          setLeaderboardOpen(true);
        }}
        reportUnreadCount={reportUnreadCount}
        messageUnreadCount={messageUnreadCount}
        notificationUnreadCount={genericNotifUnreadCount}
        onOpenProfile={() => navigate(`/player/${player?.id}`)}
        onEditProfile={() => setProfileEditOpen(true)}
      />

      <NotificationToastStack />
      {incomingMarchCount > 0 && location.pathname !== "/army" && (
        <IncomingAttackBanner
          count={incomingMarchCount}
          onView={() => navigate("/army")}
        />
      )}

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
            fief={fiefData?.fief ?? null}
            onFiefRenamed={(name) => {
              if (fiefData) {
                setFiefData({
                  ...fiefData,
                  fief: { ...fiefData.fief, name },
                });
              }
            }}
            onRefresh={loadFief}
          />
        ) : activeTab === "map" ? (
          <WorldMapPage />
        ) : activeTab === "army" ? (
          <ArmyPage />
        ) : activeTab === "diplomacy" ? (
          <AlliancePage />
        ) : activeTab === "technology" ? (
          <TechTreePage />
        ) : activeTab === "player-profile" ? (
          <PlayerProfilePage />
        ) : activeTab === "alliance-profile" ? (
          <AllianceProfilePage />
        ) : activeTab === "march-detail" ? (
          <MarchDetailPage />
        ) : activeTab === "manual" ? (
          <GameManual />
        ) : activeTab === "admin" ? (
          <AdminDashboard />
        ) : activeTab === "reports" ? (
          <BattleReportsPage />
        ) : activeTab === "inbox" ? (
          <InboxPage />
        ) : null}
      </div>

      <BottomBar />

      {leaderboardOpen && (
        <LeaderboardModal
          data={leaderboard}
          loading={false}
          onClose={() => setLeaderboardOpen(false)}
          currentPlayerId={player?.id}
        />
      )}

      {profileEditOpen && (
        <ProfileEditModal
          onClose={() => setProfileEditOpen(false)}
        />
      )}
    </div>
  );
}
