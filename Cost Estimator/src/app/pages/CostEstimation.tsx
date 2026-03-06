import { useState } from "react";
import { Edit2, Save } from "lucide-react";
import { useEstimator } from "../state/estimatorStore";

export function CostEstimation() {
  const { state, updateCostItemUnitCost, regenerateCostItemsFromTakeoff } = useEstimator();
  const [editMode, setEditMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const items = state.costItems.map((item) => ({
    ...item,
    total: item.quantity * item.unitCost,
  }));

  const materialCost = items.reduce((sum, item) => sum + item.total, 0);
  const laborCost = materialCost * 0.35;
  const equipmentCost = materialCost * 0.15;
  const totalCost = materialCost + laborCost + equipmentCost;

  const handleUnitCostChange = (id: string, value: string) => {
    const unitCost = parseFloat(value) || 0;
    updateCostItemUnitCost(id, unitCost);
  };

  const handleEditToggle = () => {
    if (editMode) {
      setSavedMessage(`Saved at ${new Date().toLocaleTimeString()}. Cost totals are updated in real time across the dashboard.`);
    }
    setEditMode((prev) => !prev);
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
        <div className="flex gap-3">
          <button
            onClick={() => {
              regenerateCostItemsFromTakeoff();
              setSavedMessage("Cost items regenerated from analyzed document elements.");
            }}
            className="flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Generate from Analysis
          </button>
          <button
            onClick={handleEditToggle}
            disabled={items.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
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
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No cost items yet. Upload documents and run AI analysis to generate real estimation rows.
                  </td>
                </tr>
              )}
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
                        onChange={(e) => handleUnitCostChange(item.id, e.target.value)}
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

      {savedMessage && (
        <div className="bg-accent/10 border border-accent/20 rounded-lg px-4 py-3 text-sm text-muted-foreground">
          {savedMessage}
        </div>
      )}

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
