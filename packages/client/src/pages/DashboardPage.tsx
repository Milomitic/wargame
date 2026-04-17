import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import VillageScene from "../components/village/VillageScene.js";
import BuildingList from "../components/village/BuildingList.js";
import BuildingDetail from "../components/village/BuildingDetail.js";
import VillageRightPanel from "../components/village/VillageRightPanel.js";

interface DashboardContentProps {
  buildings: Array<{
    buildingType: string;
    level: number;
    isConstructing: boolean;
    constructionTicksRemaining: number;
    constructionStartedAt?: number | null;
  }>;
  resources: Array<{
    resourceType: string;
    amount: number;
    capacity: number;
    productionRate: number;
    updatedAt: number;
  }>;
  troops: Array<{
    troopType: string;
    quantity: number;
    isRecruiting: boolean;
    recruitingQuantity: number;
    recruitingTicksRemaining: number;
  }>;
  fief?: {
    name: string;
    tileId?: string;
    level: number;
    population: number;
  } | null;
  onFiefRenamed?: (name: string) => void;
  onRefresh: () => void;
}

export default function DashboardContent({
  buildings,
  resources,
  troops,
  fief,
  onFiefRenamed,
  onRefresh,
}: DashboardContentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  // Open the building requested via ?b=<type> from contextual links
  useEffect(() => {
    const b = searchParams.get("b");
    if (b) {
      setSelectedBuilding(b);
      // Strip the param so that going back/forward doesn't reopen it.
      searchParams.delete("b");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="village-dashboard">
      {/* Left: Building List with village info card on top */}
      <BuildingList
        buildings={buildings}
        resources={resources}
        selectedBuilding={selectedBuilding}
        onSelect={(type) => setSelectedBuilding(type)}
        fief={fief}
        onFiefRenamed={onFiefRenamed}
      />

      {/* Center: Village Scene */}
      <VillageScene
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        onBuildingSelect={(type) => setSelectedBuilding(type)}
        onEmptySlotSelect={(type) => setSelectedBuilding(type)}
      />

      {/* Right: Always-visible info panel (garrison + marches) */}
      <VillageRightPanel
        troops={troops}
        buildings={buildings}
        onSelectBuilding={(type) => setSelectedBuilding(type)}
      />

      {/* Building Detail slide-out — overlays on top */}
      {selectedBuilding && (
        <BuildingDetail
          buildingType={selectedBuilding}
          buildingData={buildings.find((b) => b.buildingType === selectedBuilding) || null}
          buildings={buildings}
          resources={resources}
          troops={troops}
          onRefresh={onRefresh}
          onClose={() => setSelectedBuilding(null)}
          onSelectBuilding={(type) => setSelectedBuilding(type)}
        />
      )}
    </div>
  );
}
