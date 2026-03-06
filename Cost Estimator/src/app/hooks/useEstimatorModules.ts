import { useCallback, useEffect, useMemo, useState } from "react";
import { loadEstimatorModulesFromBackend, type CostEstimatorModules } from "../services/costEstimatorApi";

const EMPTY_MODULES: CostEstimatorModules = {
  materials: [],
  labor: [],
  equipment: [],
  risk: {},
  dashboard: {},
};

export const useEstimatorModules = () => {
  const [modules, setModules] = useState<CostEstimatorModules>(EMPTY_MODULES);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const refreshModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await loadEstimatorModulesFromBackend();
      setModules(response.modules ?? EMPTY_MODULES);
      setUpdatedAt(response.updatedAt ?? new Date().toISOString());
      setError("");
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Unable to load module data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshModules();
    const timer = window.setInterval(() => {
      void refreshModules();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, [refreshModules]);

  return useMemo(
    () => ({ modules, updatedAt, isLoading, error, refreshModules }),
    [modules, updatedAt, isLoading, error, refreshModules],
  );
};
