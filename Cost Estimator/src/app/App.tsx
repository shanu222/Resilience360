import { RouterProvider } from "react-router";
import { router } from "./routes";
import { EstimatorProvider } from "./state/estimatorStore";

export default function App() {
  return (
    <EstimatorProvider>
      <RouterProvider router={router} />
    </EstimatorProvider>
  );
}
