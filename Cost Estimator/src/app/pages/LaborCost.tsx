import { Users, Clock, DollarSign } from "lucide-react";
import { useMemo } from "react";
import { useEstimator } from "../state/estimatorStore";

const laborTemplate = [
  { type: "Mason", hourlyRate: 28 },
  { type: "Steel Fixer", hourlyRate: 32 },
  { type: "Concrete Worker", hourlyRate: 26 },
  { type: "Finishing Crew", hourlyRate: 24 },
  { type: "MEP Technician", hourlyRate: 35 },
];

export function LaborCost() {
  const { state } = useEstimator();
  const laborBudget = state.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0) * 0.35;
  const laborTypes = useMemo(() => {
    if (laborBudget <= 0) {
      return [];
    }
    const perTradeBudget = laborBudget / laborTemplate.length;
    return laborTemplate.map((trade) => {
      const estimatedHours = Math.max(8, Math.round(perTradeBudget / trade.hourlyRate));
      return {
        ...trade,
        region: state.settings.defaultRegion || "Configured Region",
        estimatedHours,
        totalCost: estimatedHours * trade.hourlyRate,
      };
    });
  }, [laborBudget, state.settings.defaultRegion]);

  const totalHours = laborTypes.reduce((sum, labor) => sum + labor.estimatedHours, 0);
  const totalCost = laborTypes.reduce((sum, labor) => sum + labor.totalCost, 0);
  const avgHourlyRate = totalHours > 0 ? totalCost / totalHours : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Labor Cost Database</h1>
        <p className="text-muted-foreground">
          Regional labor rates and estimated costs for construction trades
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Total Labor Cost</p>
              <h3 className="text-2xl font-semibold">${totalCost.toLocaleString()}</h3>
            </div>
            <div className="bg-primary rounded-lg p-3 text-white">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Total Hours</p>
              <h3 className="text-2xl font-semibold">{totalHours.toLocaleString()}</h3>
            </div>
            <div className="bg-accent rounded-lg p-3 text-white">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Avg. Hourly Rate</p>
              <h3 className="text-2xl font-semibold">{avgHourlyRate > 0 ? `$${avgHourlyRate.toFixed(2)}` : "N/A"}</h3>
            </div>
            <div className="bg-[#8b5cf6] rounded-lg p-3 text-white">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Labor Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Labor Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Hourly Rate</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Region</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Estimated Hours</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Labor Cost</th>
              </tr>
            </thead>
            <tbody>
              {laborTypes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No labor data yet. Upload and analyze documents to generate labor distribution.
                  </td>
                </tr>
              )}
              {laborTypes.map((labor, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{labor.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${labor.hourlyRate}/hr
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{labor.region}</td>
                  <td className="px-6 py-4 text-sm">
                    {labor.estimatedHours.toLocaleString()} hrs
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    ${labor.totalCost.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-primary/5 font-semibold">
                <td colSpan={3} className="px-6 py-4 text-right">
                  Total
                </td>
                <td className="px-6 py-4 text-sm">
                  {totalHours.toLocaleString()} hrs
                </td>
                <td className="px-6 py-4 text-primary">
                  ${totalCost.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Labor Rate Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Labor Rate Factors</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Base Rate</span>
              <span className="text-sm font-medium">{avgHourlyRate > 0 ? `$${avgHourlyRate.toFixed(2)}/hr` : "N/A"}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Regional Adjustment</span>
              <span className="text-sm font-medium">+15%</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Benefits & Insurance</span>
              <span className="text-sm font-medium">+25%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Overtime Premium</span>
              <span className="text-sm font-medium">1.5x after 40 hrs</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Labor Cost Notes</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Labor estimates are auto-derived from analyzed quantities and cost profile.</p>
            <p>• Adjust hourly rates after receiving real contractor quotations.</p>
            <p>• Run analysis again after drawing revisions to refresh labor allocation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
