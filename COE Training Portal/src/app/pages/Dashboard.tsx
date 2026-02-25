import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { 
  Users, 
  GraduationCap, 
  Award, 
  BookCheck, 
  MapPin,
  ArrowRight,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";

const kpiData = [
  { 
    title: "Total Registered Users", 
    value: "15,432", 
    icon: Users, 
    color: "blue",
    change: "+12% from last month"
  },
  { 
    title: "Active Training Programs", 
    value: "48", 
    icon: GraduationCap, 
    color: "green",
    change: "8 new this quarter"
  },
  { 
    title: "Certified Professionals", 
    value: "3,847", 
    icon: Award, 
    color: "purple",
    change: "+245 this month"
  },
  { 
    title: "Courses Completed (2026)", 
    value: "1,234", 
    icon: BookCheck, 
    color: "orange",
    change: "89% completion rate"
  },
  { 
    title: "Provinces Covered", 
    value: "4/4", 
    icon: MapPin, 
    color: "teal",
    change: "All provinces active"
  },
];

const provinceData = [
  { province: "Punjab", participants: 5432 },
  { province: "Sindh", participants: 4321 },
  { province: "KPK", participants: 3210 },
  { province: "Balochistan", participants: 2469 },
];

const sectorData = [
  { sector: "Engineering", value: 1245, color: "#2563eb" },
  { sector: "Planning", value: 892, color: "#16a34a" },
  { sector: "Emergency Response", value: 1034, color: "#dc2626" },
  { sector: "Building Safety", value: 676, color: "#9333ea" },
];

const monthlyData = [
  { month: "Aug", completions: 145 },
  { month: "Sep", completions: 178 },
  { month: "Oct", completions: 234 },
  { month: "Nov", completions: 289 },
  { month: "Dec", completions: 312 },
  { month: "Jan", completions: 276 },
];

const quickActions = [
  { label: "Enroll in Training", path: "/training", color: "green" },
  { label: "My Courses", path: "/my-courses", color: "blue" },
  { label: "View Certificates", path: "/certification", color: "purple" },
  { label: "Access Knowledge Library", path: "/knowledge", color: "orange" },
];

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-semibold mb-2">Welcome back, {user?.name}</h2>
        <p className="text-green-50">
          Continue your learning journey in disaster risk reduction and resilience building.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.title}
                </CardTitle>
                <div className={`w-10 h-10 rounded-full bg-${kpi.color}-100 flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 text-${kpi.color}-600`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {kpi.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.path}>
                <Button 
                  variant="outline" 
                  className="w-full justify-between h-auto py-4"
                >
                  <span>{action.label}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Training Participation by Province */}
        <Card>
          <CardHeader>
            <CardTitle>Training Participation by Province</CardTitle>
            <p className="text-sm text-gray-500">Total participants across Pakistan</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provinceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="province" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="participants" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Certifications by Sector */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications by Sector</CardTitle>
            <p className="text-sm text-gray-500">Distribution of certified professionals</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {sectorData.map((sector) => (
                <div key={sector.sector} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: sector.color }}
                  />
                  <span className="text-sm">{sector.sector}: {sector.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Completion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Course Completion Trend</CardTitle>
          <p className="text-sm text-gray-500">Last 6 months performance</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="completions" 
                stroke="#16a34a" 
                strokeWidth={2}
                name="Course Completions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: "Completed Module 3", course: "Infrastructure Damage Assessment", time: "2 hours ago" },
              { action: "Enrolled in", course: "Building Codes & Compliance", time: "1 day ago" },
              { action: "Earned Certificate", course: "Disaster Risk Reduction Fundamentals", time: "3 days ago" },
              { action: "Passed Assessment", course: "Structural Safety Evaluation", time: "5 days ago" },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.action}</span>{" "}
                    <span className="text-gray-600">{activity.course}</span>
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}