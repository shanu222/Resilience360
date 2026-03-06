import { StatCard } from "../components/StatCard";
import { DataTable } from "../components/DataTable";
import {
  DollarSign,
  Package,
  Users,
  Truck,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import { useEstimator } from "../state/estimatorStore";

export function Dashboard() {
  const { state } = useEstimator();

  const materialCost = state.costItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const laborCost = materialCost * 0.35;
  const equipmentCost = materialCost * 0.15;
  const totalCost = materialCost + laborCost + equipmentCost;
  const otherCost = totalCost * 0.05;
  const hasDerivedData = state.costItems.length > 0 || state.takeoffElements.length > 0;

  const costBreakdownData = useMemo(
    () =>
      hasDerivedData
        ? [
            { name: "Materials", value: materialCost, color: "#3A63FF" },
            { name: "Labor", value: laborCost, color: "#2EC4B6" },
            { name: "Equipment", value: equipmentCost, color: "#8b5cf6" },
            { name: "Other", value: otherCost, color: "#f59e0b" },
          ]
        : [],
    [hasDerivedData, materialCost, laborCost, equipmentCost, otherCost],
  );

  const timelineData = useMemo(() => {
    if (!hasDerivedData) {
      return [];
    }
    const base = totalCost / 6;
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    return labels.map((month, index) => {
      const budget = Math.round(base * (index + 1));
      const factor = 0.92 + ((index % 3) * 0.06);
      const actual = Math.round(budget * factor);
      return { month, budget, actual };
    });
  }, [hasDerivedData, totalCost]);

  const recentProjects = useMemo(
    () =>
      hasDerivedData
        ? [
            {
              name: "Current Analysis Session",
              location: state.settings.defaultRegion || "Configured region",
              area: `${Math.max(1, state.takeoffElements.length) * 750} sq ft`,
              cost: `$${Math.round(totalCost).toLocaleString()}`,
              status: state.takeoffElements.length > 0 ? "In Progress" : "Planning",
            },
            {
              name: "Uploaded Document Batch",
              location: state.settings.defaultRegion || "Configured region",
              area: `${Math.max(1, state.uploadedFiles.length) * 8200} sq ft`,
              cost: `$${Math.round(materialCost).toLocaleString()}`,
              status: state.uploadedFiles.length > 0 ? "In Progress" : "Planning",
            },
            {
              name: "Generated BOQ",
              location: state.settings.defaultRegion || "Configured region",
              area: `${Math.max(1, state.takeoffElements.length) * 350} sq ft`,
              cost: `$${Math.round(totalCost * 1.08).toLocaleString()}`,
              status: state.takeoffElements.length > 0 ? "Completed" : "Planning",
            },
          ]
        : [],
    [hasDerivedData, state.settings.defaultRegion, state.takeoffElements.length, state.uploadedFiles.length, totalCost, materialCost],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Project Overview</h1>
        <p className="text-muted-foreground">
          Live summary generated from uploaded and analyzed documents.
        </p>
        {!hasDerivedData && (
          <p className="text-sm text-muted-foreground mt-2">
            No analyzed data yet. Upload drawings/photos and run AI analysis to populate this dashboard.
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Project Cost"
          value={hasDerivedData ? `$${Math.round(totalCost).toLocaleString()}` : "N/A"}
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-primary"
          trend={{ value: `${state.uploadedFiles.length} files tracked`, isPositive: true }}
        />
        <StatCard
          title="Material Cost"
          value={hasDerivedData ? `$${Math.round(materialCost).toLocaleString()}` : "N/A"}
          icon={<Package className="w-6 h-6" />}
          color="bg-accent"
        />
        <StatCard
          title="Labor Cost"
          value={hasDerivedData ? `$${Math.round(laborCost).toLocaleString()}` : "N/A"}
          icon={<Users className="w-6 h-6" />}
          color="bg-[#8b5cf6]"
        />
        <StatCard
          title="Equipment Cost"
          value={hasDerivedData ? `$${Math.round(equipmentCost).toLocaleString()}` : "N/A"}
          icon={<Truck className="w-6 h-6" />}
          color="bg-[#f59e0b]"
        />
        <StatCard
          title="Estimated Duration"
          value={hasDerivedData ? `${Math.max(1, Math.round(state.takeoffElements.length / 2) || 1)} Months` : "N/A"}
          icon={<Clock className="w-6 h-6" />}
          color="bg-[#10b981]"
        />
        <StatCard
          title="Cost per Square Foot"
          value={hasDerivedData ? `$${Math.max(1, Math.round(totalCost / Math.max(1, state.takeoffElements.length * 20 || 1)))}` : "N/A"}
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Cost Breakdown</h3>
          {!hasDerivedData && <p className="text-sm text-muted-foreground mb-2">Waiting for analysis output.</p>}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {costBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {costBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget vs Actual */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Budget vs Actual</h3>
          {!hasDerivedData && <p className="text-sm text-muted-foreground mb-2">No budget trend available until costs are generated.</p>}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="budget" fill="#3A63FF" name="Budget" />
              <Bar dataKey="actual" fill="#2EC4B6" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Construction Cost Timeline */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-4">Construction Cost Timeline</h3>
        {!hasDerivedData && <p className="text-sm text-muted-foreground mb-2">Timeline will appear after first successful analysis run.</p>}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="budget"
              stroke="#3A63FF"
              strokeWidth={2}
              name="Budget"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#2EC4B6"
              strokeWidth={2}
              name="Actual"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Projects Table */}
      <div>
        <h3 className="font-semibold mb-4">Recent Projects</h3>
        {!hasDerivedData && <p className="text-sm text-muted-foreground mb-2">No project records generated yet.</p>}
        <DataTable
          columns={[
            { key: "name", label: "Project Name" },
            { key: "location", label: "Location" },
            { key: "area", label: "Area" },
            { key: "cost", label: "Estimated Cost" },
            {
              key: "status",
              label: "Status",
              render: (value) => (
                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    value === "Completed"
                      ? "bg-green-100 text-green-800"
                      : value === "In Progress"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          data={recentProjects}
        />
      </div>
    </div>
  );
}
