import { useState } from "react";
import VillageScene from "../components/village/VillageScene.js";
import BuildingDetail from "../components/village/BuildingDetail.js";

interface DashboardContentProps {
  buildings: Array<{
    buildingType: string;
    level: number;
    isConstructing: boolean;
    constructionTicksRemaining: number;
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
  onRefresh: () => void;
}

export default function DashboardContent({
  buildings,
  resources,
  troops,
  onRefresh,
}: DashboardContentProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  return (
    <div className="village-dashboard">
      {/* Village Scene — fills entire main area */}
      <VillageScene
        buildings={buildings}
        selectedBuilding={selectedBuilding}
        onBuildingSelect={(type) => setSelectedBuilding(type)}
        onEmptySlotSelect={(type) => setSelectedBuilding(type)}
      />

      {/* Building Detail — slide-out panel */}
      {selectedBuilding && (
        <BuildingDetail
          buildingType={selectedBuilding}
          buildingData={buildings.find((b) => b.buildingType === selectedBuilding) || null}
          buildings={buildings}
          resources={resources}
          troops={troops}
          onRefresh={onRefresh}
          onClose={() => setSelectedBuilding(null)}
        />
      )}
    </div>
  );
}
