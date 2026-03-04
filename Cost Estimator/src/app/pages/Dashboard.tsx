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

const costBreakdownData = [
  { name: "Materials", value: 450000, color: "#3A63FF" },
  { name: "Labor", value: 280000, color: "#2EC4B6" },
  { name: "Equipment", value: 120000, color: "#8b5cf6" },
  { name: "Other", value: 50000, color: "#f59e0b" },
];

const timelineData = [
  { month: "Jan", budget: 100000, actual: 95000 },
  { month: "Feb", budget: 150000, actual: 160000 },
  { month: "Mar", budget: 200000, actual: 195000 },
  { month: "Apr", budget: 250000, actual: 240000 },
  { month: "May", budget: 300000, actual: 310000 },
  { month: "Jun", budget: 350000, actual: 340000 },
];

const recentProjects = [
  {
    name: "Downtown Office Complex",
    location: "New York, NY",
    area: "50,000 sq ft",
    cost: "$2,500,000",
    status: "In Progress",
  },
  {
    name: "Residential Tower",
    location: "Los Angeles, CA",
    area: "80,000 sq ft",
    cost: "$4,200,000",
    status: "Completed",
  },
  {
    name: "Shopping Mall Renovation",
    location: "Chicago, IL",
    area: "120,000 sq ft",
    cost: "$6,800,000",
    status: "Planning",
  },
  {
    name: "Industrial Warehouse",
    location: "Houston, TX",
    area: "200,000 sq ft",
    cost: "$8,500,000",
    status: "In Progress",
  },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Project Overview</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's a summary of your construction projects.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Project Cost"
          value="$900,000"
          icon={<DollarSign className="w-6 h-6" />}
          color="bg-primary"
          trend={{ value: "8.5% from last month", isPositive: true }}
        />
        <StatCard
          title="Material Cost"
          value="$450,000"
          icon={<Package className="w-6 h-6" />}
          color="bg-accent"
        />
        <StatCard
          title="Labor Cost"
          value="$280,000"
          icon={<Users className="w-6 h-6" />}
          color="bg-[#8b5cf6]"
        />
        <StatCard
          title="Equipment Cost"
          value="$120,000"
          icon={<Truck className="w-6 h-6" />}
          color="bg-[#f59e0b]"
        />
        <StatCard
          title="Estimated Duration"
          value="18 Months"
          icon={<Clock className="w-6 h-6" />}
          color="bg-[#10b981]"
        />
        <StatCard
          title="Cost per Square Foot"
          value="$180"
          icon={<TrendingUp className="w-6 h-6" />}
          color="bg-primary"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Cost Breakdown</h3>
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
