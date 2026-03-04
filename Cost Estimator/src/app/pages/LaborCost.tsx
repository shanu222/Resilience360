import { Users, Clock, DollarSign } from "lucide-react";

const laborTypes = [
  { type: "Carpenter", hourlyRate: 45, region: "New York, NY", estimatedHours: 480, totalCost: 21600 },
  { type: "Electrician", hourlyRate: 55, region: "New York, NY", estimatedHours: 360, totalCost: 19800 },
  { type: "Plumber", hourlyRate: 52, region: "New York, NY", estimatedHours: 280, totalCost: 14560 },
  { type: "Mason", hourlyRate: 42, region: "New York, NY", estimatedHours: 520, totalCost: 21840 },
  { type: "Painter", hourlyRate: 38, region: "New York, NY", estimatedHours: 320, totalCost: 12160 },
  { type: "Welder", hourlyRate: 48, region: "New York, NY", estimatedHours: 240, totalCost: 11520 },
  { type: "HVAC Technician", hourlyRate: 58, region: "New York, NY", estimatedHours: 280, totalCost: 16240 },
  { type: "Roofer", hourlyRate: 44, region: "New York, NY", estimatedHours: 200, totalCost: 8800 },
  { type: "Concrete Worker", hourlyRate: 40, region: "New York, NY", estimatedHours: 360, totalCost: 14400 },
  { type: "Drywall Installer", hourlyRate: 36, region: "New York, NY", estimatedHours: 280, totalCost: 10080 },
];

export function LaborCost() {
  const totalHours = laborTypes.reduce((sum, labor) => sum + labor.estimatedHours, 0);
  const totalCost = laborTypes.reduce((sum, labor) => sum + labor.totalCost, 0);
  const avgHourlyRate = totalCost / totalHours;

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
              <h3 className="text-2xl font-semibold">${avgHourlyRate.toFixed(2)}</h3>
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
              <span className="text-sm font-medium">$42.50/hr</span>
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
            <p>• Rates include base pay, benefits, and insurance</p>
            <p>• Overtime calculated at 1.5x for hours over 40/week</p>
            <p>• Union rates may vary based on local agreements</p>
            <p>• Specialized certifications may increase rates by 10-20%</p>
            <p>• Weekend work typically adds 25% premium</p>
          </div>
        </div>
      </div>
    </div>
  );
}
