import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { AIDetectionResult } from "./pages/AIDetectionResult";
import { ElementCostBreakdown } from "./pages/ElementCostBreakdown";
import { FinalReport } from "./pages/FinalReport";
import { Layout } from "./components/Layout";

const retrofitBaseSegment = "/retrofit-calculator";
const resolvedBasename =
  typeof window !== "undefined" &&
  (window.location.pathname === retrofitBaseSegment ||
    window.location.pathname.startsWith(`${retrofitBaseSegment}/`))
    ? retrofitBaseSegment
    : "/";

export const router = createBrowserRouter([
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
], { basename: resolvedBasename });
