import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  TrendingUp, 
  Award, 
  BookOpen, 
  Target,
  Users,
  MapPin,
  GraduationCap,
  AlertTriangle
} from "lucide-react";

const skillsData = [
  { skill: "Structural Assessment", value: 85 },
  { skill: "Risk Analysis", value: 72 },
  { skill: "Emergency Response", value: 68 },
  { skill: "Documentation", value: 90 },
  { skill: "Field Operations", value: 78 },
];

const monthlyProgressData = [
  { month: "Aug", hours: 12, courses: 1 },
  { month: "Sep", hours: 18, courses: 2 },
  { month: "Oct", hours: 24, courses: 2 },
  { month: "Nov", hours: 20, courses: 1 },
  { month: "Dec", hours: 28, courses: 3 },
  { month: "Jan", hours: 32, courses: 2 },
];

const provinceTrainedData = [
  { province: "Punjab", trained: 5432, gap: 1200 },
  { province: "Sindh", trained: 4321, gap: 1800 },
  { province: "KPK", trained: 3210, gap: 2100 },
  { province: "Balochistan", trained: 2469, gap: 2800 },
];

const genderData = [
  { name: "Male", value: 9876, color: "#3b82f6" },
  { name: "Female", value: 5556, color: "#ec4899" },
];

const sectorCapacityData = [
  { sector: "Engineering", trained: 1245, required: 2000 },
  { sector: "Planning", trained: 892, required: 1500 },
  { sector: "Emergency", trained: 1034, required: 1800 },
  { sector: "Health", trained: 567, required: 1200 },
];

export function ProgressAnalytics() {
  const completedCourses = 4;
  const inProgressCourses = 2;
  const totalLearningHours = 134;
  const certificatesEarned = 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Progress & Analytics</h1>
        <p className="text-gray-600 mt-1">
          Track your learning progress and view capacity analytics
        </p>
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="personal">My Progress</TabsTrigger>
          <TabsTrigger value="admin">Admin Analytics</TabsTrigger>
        </TabsList>

        {/* Personal Progress */}
        <TabsContent value="personal" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{completedCourses}</div>
                    <div className="text-sm text-gray-600">Courses Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{inProgressCourses}</div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{certificatesEarned}</div>
                    <div className="text-sm text-gray-600">Certificates Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{totalLearningHours}h</div>
                    <div className="text-sm text-gray-600">Learning Hours</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skills Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Skills Assessment</CardTitle>
              <p className="text-sm text-gray-500">Your competency levels across key areas</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={skillsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Skills"
                    dataKey="value"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.6}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Learning Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Learning Activity</CardTitle>
              <p className="text-sm text-gray-500">Your learning hours and course completion over time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="hours"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Learning Hours"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="courses"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Courses Completed"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Current Courses Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Current Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Infrastructure Damage Assessment</h4>
                    <p className="text-sm text-gray-600">Module 3 of 6</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                </div>
                <Progress value={50} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">50% complete</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Climate Resilience Planning</h4>
                    <p className="text-sm text-gray-600">Module 2 of 8</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>
                </div>
                <Progress value={25} className="h-2" />
                <p className="text-xs text-gray-500 mt-1">25% complete</p>
              </div>
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recommended Focus Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Emergency Response:</strong> Consider enrolling in advanced emergency response training to strengthen this competency (current: 68%)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span><strong>Risk Analysis:</strong> Complete the Risk Assessment Methodologies course to improve analytical skills (current: 72%)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Analytics */}
        <TabsContent value="admin" className="space-y-6 mt-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">15,432</div>
                    <div className="text-sm text-gray-600">Total Trained</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">3,847</div>
                    <div className="text-sm text-gray-600">Certified</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">4/4</div>
                    <div className="text-sm text-gray-600">Provinces</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-orange-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">7,900</div>
                    <div className="text-sm text-gray-600">Capacity Gap</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trained Personnel by Province */}
          <Card>
            <CardHeader>
              <CardTitle>Trained Personnel & Capacity Gaps by Province</CardTitle>
              <p className="text-sm text-gray-500">Current capacity vs. requirements</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={provinceTrainedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="trained" fill="#16a34a" name="Trained Personnel" />
                  <Bar dataKey="gap" fill="#ef4444" name="Capacity Gap" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gender Participation */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Participation</CardTitle>
                <p className="text-sm text-gray-500">Distribution of trained professionals</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {genderData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm">{entry.name}: {entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sector-wise Capacity */}
            <Card>
              <CardHeader>
                <CardTitle>Sector-wise Capacity</CardTitle>
                <p className="text-sm text-gray-500">Trained vs. required personnel</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sectorCapacityData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="sector" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="trained" fill="#16a34a" name="Trained" />
                    <Bar dataKey="required" fill="#94a3b8" name="Required" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Key Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                  <span><strong>Overall Progress:</strong> 15,432 professionals trained across Pakistan, achieving 66% of national capacity target</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-600" />
                  <span><strong>Balochistan Focus:</strong> Highest capacity gap (2,800) requires immediate attention and targeted training programs</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                  <span><strong>Gender Balance:</strong> Female participation at 36% - consider implementing targeted recruitment to improve gender balance</span>
                </li>
                <li className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                  <span><strong>Sector Priority:</strong> Health sector shows largest gap (633) - prioritize health emergency preparedness training</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
