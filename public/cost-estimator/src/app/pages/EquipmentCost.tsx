import { Truck, Calendar, DollarSign } from "lucide-react";

const equipment = [
  { name: "Excavator (Large)", rentalCost: 850, usageDays: 25, totalCost: 21250 },
  { name: "Tower Crane", rentalCost: 1200, usageDays: 90, totalCost: 108000 },
  { name: "Concrete Mixer Truck", rentalCost: 450, usageDays: 30, totalCost: 13500 },
  { name: "Concrete Pump", rentalCost: 550, usageDays: 20, totalCost: 11000 },
  { name: "Bulldozer", rentalCost: 750, usageDays: 18, totalCost: 13500 },
  { name: "Wheel Loader", rentalCost: 600, usageDays: 35, totalCost: 21000 },
  { name: "Forklift (5 ton)", rentalCost: 280, usageDays: 60, totalCost: 16800 },
  { name: "Scaffolding System", rentalCost: 350, usageDays: 120, totalCost: 42000 },
  { name: "Generator (100 kW)", rentalCost: 180, usageDays: 150, totalCost: 27000 },
  { name: "Compressor (Heavy Duty)", rentalCost: 120, usageDays: 90, totalCost: 10800 },
  { name: "Aerial Work Platform", rentalCost: 320, usageDays: 45, totalCost: 14400 },
  { name: "Dump Truck", rentalCost: 400, usageDays: 40, totalCost: 16000 },
];

export function EquipmentCost() {
  const totalCost = equipment.reduce((sum, eq) => sum + eq.totalCost, 0);
  const totalDays = equipment.reduce((sum, eq) => sum + eq.usageDays, 0);
  const avgDailyCost = totalCost / totalDays;

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
              <h3 className="text-2xl font-semibold">${avgDailyCost.toFixed(2)}</h3>
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
              <span className="text-sm font-medium">35% discount</span>
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
