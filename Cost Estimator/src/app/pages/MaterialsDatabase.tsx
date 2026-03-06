import { Search, Filter, MapPin, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useEstimator } from "../state/estimatorStore";

const inferCategory = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("concrete") || lower.includes("foundation") || lower.includes("slab")) return "Concrete";
  if (lower.includes("steel") || lower.includes("beam") || lower.includes("column")) return "Steel";
  if (lower.includes("wall") || lower.includes("brick")) return "Masonry";
  if (lower.includes("door") || lower.includes("window")) return "Fixtures";
  if (lower.includes("roof")) return "Roofing";
  return "General";
};

export function MaterialsDatabase() {
  const { state } = useEstimator();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const materials = useMemo(
    () =>
      state.costItems.map((item) => {
        const avgCost = item.unitCost;
        const regionalCost = item.unitCost * 1.05;
        const trendValue = ((regionalCost - avgCost) / Math.max(avgCost, 1)) * 100;
        return {
          name: item.item,
          category: inferCategory(item.item),
          unit: item.unit,
          avgCost,
          regionalCost,
          trend: `${trendValue >= 0 ? "+" : ""}${trendValue.toFixed(1)}%`,
        };
      }),
    [state.costItems],
  );

  const categories = ["All", ...new Set(materials.map((m) => m.category))];

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Materials Database</h1>
        <p className="text-muted-foreground">
          Comprehensive pricing database for construction materials
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select value={state.settings.defaultRegion} className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring appearance-none" disabled>
              <option>{state.settings.defaultRegion || "Region from settings"}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Total Materials</p>
          <h3 className="text-2xl font-semibold">{materials.length}</h3>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Categories</p>
          <h3 className="text-2xl font-semibold">{categories.length - 1}</h3>
        </div>
        <div className="bg-card rounded-xl p-6 border border-border">
          <p className="text-sm text-muted-foreground mb-1">Avg. Price Trend</p>
          <h3 className="text-2xl font-semibold text-green-600">
            {materials.length === 0
              ? "N/A"
              : `${(
                  materials.reduce((sum, item) => sum + Number.parseFloat(item.trend), 0) /
                  Math.max(materials.length, 1)
                ).toFixed(1)}%`}
          </h3>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">Material Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Category</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Average Cost</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Regional Cost</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                    No material pricing data yet. Run AI analysis on uploaded documents to populate this table.
                  </td>
                </tr>
              )}
              {filteredMaterials.map((material, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-6 py-4 text-sm font-medium">{material.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      {material.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{material.unit}</td>
                  <td className="px-6 py-4 text-sm">${material.avgCost.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    ${material.regionalCost.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      {material.trend}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-2">About Material Pricing</h3>
        <p className="text-sm text-muted-foreground">
          This table is generated from your uploaded documents and AI takeoff output. Prices only
          appear after analysis runs and are adjusted for the active region profile.
        </p>
      </div>
    </div>
  );
}
