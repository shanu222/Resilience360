import { createHashRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { AIDetectionResult } from "./pages/AIDetectionResult";
import { ElementCostBreakdown } from "./pages/ElementCostBreakdown";
import { FinalReport } from "./pages/FinalReport";
import { Layout } from "./components/Layout";

export const router = createHashRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "detection", Component: AIDetectionResult },
      { path: "cost-breakdown", Component: ElementCostBreakdown },
      { path: "final-report", Component: FinalReport },
    ],
  },
]);
