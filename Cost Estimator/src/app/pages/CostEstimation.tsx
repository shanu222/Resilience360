import { useState } from "react";
import { Edit2, Save } from "lucide-react";

const costItems = [
  { item: "Concrete", quantity: 800, unit: "cubic meters", unitCost: 120, total: 96000 },
  { item: "Steel reinforcement", quantity: 12000, unit: "kg", unitCost: 1.2, total: 14400 },
  { item: "Brickwork", quantity: 5000, unit: "sq meters", unitCost: 25, total: 125000 },
  { item: "Paint", quantity: 3000, unit: "sq meters", unitCost: 8, total: 24000 },
  { item: "Flooring", quantity: 1200, unit: "sq meters", unitCost: 45, total: 54000 },
  { item: "Doors", quantity: 24, unit: "units", unitCost: 450, total: 10800 },
  { item: "Windows", quantity: 36, unit: "units", unitCost: 380, total: 13680 },
  { item: "Electrical", quantity: 1, unit: "lump sum", unitCost: 85000, total: 85000 },
  { item: "Plumbing", quantity: 1, unit: "lump sum", unitCost: 65000, total: 65000 },
  { item: "HVAC", quantity: 1, unit: "lump sum", unitCost: 120000, total: 120000 },
];

export function CostEstimation() {
  const [items, setItems] = useState(costItems);
  const [editMode, setEditMode] = useState(false);

  const materialCost = items.reduce((sum, item) => sum + item.total, 0);
  const laborCost = materialCost * 0.35;
  const equipmentCost = materialCost * 0.15;
  const totalCost = materialCost + laborCost + equipmentCost;

  const handleUnitCostChange = (index: number, value: string) => {
    const newItems = [...items];
    const unitCost = parseFloat(value) || 0;
    newItems[index] = {
      ...newItems[index],
      unitCost,
      total: newItems[index].quantity * unitCost,
    };
    setItems(newItems);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Cost Estimation</h1>
          <p className="text-muted-foreground">
            Detailed cost calculation for construction materials and services
          </p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          {editMode ? (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit2 className="w-4 h-4" />
              Edit Costs
            </>
          )}
        </button>
      </div>

      {/* Cost Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Item</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Quantity</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit Cost</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4 text-sm font-medium">{item.item}</td>
                  <td className="px-6 py-4 text-sm">{item.quantity.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{item.unit}</td>
                  <td className="px-6 py-4">
                    {editMode ? (
                      <input
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => handleUnitCostChange(idx, e.target.value)}
                        className="w-24 px-3 py-1 rounded border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-sm">${item.unitCost.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${item.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Material Cost</p>
          <h3 className="text-2xl font-semibold text-primary">
            ${materialCost.toLocaleString()}
          </h3>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Labor Cost (35%)</p>
          <h3 className="text-2xl font-semibold text-accent">
            ${laborCost.toLocaleString()}
          </h3>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Equipment Cost (15%)</p>
          <h3 className="text-2xl font-semibold" style={{ color: "#8b5cf6" }}>
            ${equipmentCost.toLocaleString()}
          </h3>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border bg-primary/5">
          <p className="text-sm text-muted-foreground mb-1">Total Project Cost</p>
          <h3 className="text-2xl font-semibold">
            ${totalCost.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-4">Cost Calculation Formula</h3>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Total Cost</span> = Material Cost +
            Labor Cost + Equipment Cost
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Item Total</span> = Quantity × Unit
            Cost
          </p>
        </div>
      </div>
    </div>
  );
}
