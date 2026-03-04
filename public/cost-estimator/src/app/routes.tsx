import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { UploadDrawings } from "./pages/UploadDrawings";
import { AIQuantityTakeoff } from "./pages/AIQuantityTakeoff";
import { CostEstimation } from "./pages/CostEstimation";
import { BillOfQuantities } from "./pages/BillOfQuantities";
import { MaterialsDatabase } from "./pages/MaterialsDatabase";
import { LaborCost } from "./pages/LaborCost";
import { EquipmentCost } from "./pages/EquipmentCost";
import { RiskAnalysis } from "./pages/RiskAnalysis";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "upload", Component: UploadDrawings },
      { path: "ai-takeoff", Component: AIQuantityTakeoff },
      { path: "cost-estimation", Component: CostEstimation },
      { path: "boq", Component: BillOfQuantities },
      { path: "materials", Component: MaterialsDatabase },
      { path: "labor", Component: LaborCost },
      { path: "equipment", Component: EquipmentCost },
      { path: "risk-analysis", Component: RiskAnalysis },
      { path: "reports", Component: Reports },
      { path: "settings", Component: Settings },
    ],
  },
]);
