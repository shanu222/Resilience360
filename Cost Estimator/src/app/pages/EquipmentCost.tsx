import { Truck, Calendar, DollarSign } from "lucide-react";
import { useMemo } from "react";
import { useEstimator } from "../state/estimatorStore";

const equipmentTemplate = [
  { name: "Excavator", rentalCost: 850 },
  { name: "Concrete Mixer", rentalCost: 420 },
  { name: "Scaffolding System", rentalCost: 300 },
  { name: "Material Lift", rentalCost: 260 },
  { name: "Generator", rentalCost: 180 },
];

export function EquipmentCost() {
  const { state } = useEstimator();
  const equipmentBudget = state.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0) * 0.15;
  const equipment = useMemo(() => {
    if (equipmentBudget <= 0) {
      return [];
    }
    const perType = equipmentBudget / equipmentTemplate.length;
    return equipmentTemplate.map((entry) => {
      const usageDays = Math.max(3, Math.round(perType / entry.rentalCost));
      return {
        ...entry,
        usageDays,
        totalCost: usageDays * entry.rentalCost,
      };
    });
  }, [equipmentBudget]);

  const totalCost = equipment.reduce((sum, eq) => sum + eq.totalCost, 0);
  const totalDays = equipment.reduce((sum, eq) => sum + eq.usageDays, 0);
  const avgDailyCost = totalDays > 0 ? totalCost / totalDays : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Equipment Cost</h1>
        <p className="text-muted-foreground">
          Construction equipment rental costs and usage tracking
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Total Equipment Cost</p>
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
              <p className="text-sm text-muted-foreground mb-1">Total Usage Days</p>
              <h3 className="text-2xl font-semibold">{totalDays}</h3>
            </div>
            <div className="bg-accent rounded-lg p-3 text-white">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Avg. Daily Cost</p>
              <h3 className="text-2xl font-semibold">{avgDailyCost > 0 ? `$${avgDailyCost.toFixed(2)}` : "N/A"}</h3>
            </div>
            <div className="bg-[#f59e0b] rounded-lg p-3 text-white">
              <Truck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Equipment</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Rental Cost per Day</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Usage Days</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No equipment allocation yet. Analyze uploaded documents to generate equipment requirements.
                  </td>
                </tr>
              )}
              {equipment.map((eq, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-accent" />
                      </div>
                      <span className="text-sm font-medium">{eq.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${eq.rentalCost.toLocaleString()}/day
                  </td>
                  <td className="px-6 py-4 text-sm">{eq.usageDays} days</td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    ${eq.totalCost.toLocaleString()}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-primary/5 font-semibold">
                <td colSpan={2} className="px-6 py-4 text-right">
                  Total
                </td>
                <td className="px-6 py-4">{totalDays} days</td>
                <td className="px-6 py-4 text-primary">
                  ${totalCost.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Rental Terms</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Daily Rate</span>
              <span className="text-sm font-medium">Standard pricing</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Weekly Rate</span>
              <span className="text-sm font-medium">20% discount</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Monthly Rate</span>
              <span className="text-sm font-medium">Derived from generated usage plan</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Operator</span>
              <span className="text-sm font-medium">+$200/day</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Cost Optimization Tips</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Consider weekly/monthly rates for long-term usage</p>
            <p>• Schedule equipment efficiently to minimize idle time</p>
            <p>• Bundle multiple equipment from same vendor for discounts</p>
            <p>• Plan delivery and pickup to reduce transportation costs</p>
            <p>• Regular maintenance included in rental price</p>
          </div>
        </div>
      </div>
    </div>
  );
}
