import { Search, Filter, MapPin, TrendingUp } from "lucide-react";
import { useState } from "react";

const materials = [
  { name: "Concrete Grade 30", category: "Concrete", unit: "cubic meter", avgCost: 120, regionalCost: 125, trend: "+3%" },
  { name: "Steel Rebar 12mm", category: "Steel", unit: "kg", avgCost: 1.2, regionalCost: 1.3, trend: "+8%" },
  { name: "Red Clay Bricks", category: "Masonry", unit: "1000 units", avgCost: 350, regionalCost: 380, trend: "+5%" },
  { name: "Portland Cement", category: "Cement", unit: "50kg bag", avgCost: 8.5, regionalCost: 9.0, trend: "+6%" },
  { name: "Structural Steel I-Beam", category: "Steel", unit: "kg", avgCost: 1.5, regionalCost: 1.6, trend: "+7%" },
  { name: "Tempered Glass 10mm", category: "Glass", unit: "sq meter", avgCost: 75, regionalCost: 80, trend: "+4%" },
  { name: "Ceramic Floor Tiles", category: "Tiles", unit: "sq meter", avgCost: 45, regionalCost: 48, trend: "+2%" },
  { name: "Wall Insulation Foam", category: "Insulation", unit: "sq meter", avgCost: 18, regionalCost: 19, trend: "+1%" },
  { name: "Aluminum Window Frame", category: "Aluminum", unit: "linear meter", avgCost: 85, regionalCost: 90, trend: "+3%" },
  { name: "PVC Pipe 4 inch", category: "Plumbing", unit: "linear meter", avgCost: 12, regionalCost: 13, trend: "+2%" },
  { name: "Electrical Cable 2.5mm", category: "Electrical", unit: "100 meters", avgCost: 65, regionalCost: 68, trend: "+4%" },
  { name: "Interior Paint Premium", category: "Paint", unit: "gallon", avgCost: 42, regionalCost: 45, trend: "+3%" },
];

export function MaterialsDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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
            <select className="w-full pl-10 pr-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring appearance-none">
              <option>New York, NY</option>
              <option>Los Angeles, CA</option>
              <option>Chicago, IL</option>
              <option>Houston, TX</option>
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
          <h3 className="text-2xl font-semibold text-green-600">+4.2%</h3>
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
          Material prices are updated weekly based on regional supplier data, market trends, and
          economic indicators. Regional costs include local taxes, transportation, and supplier
          premiums. All prices are in USD.
        </p>
      </div>
    </div>
  );
}
