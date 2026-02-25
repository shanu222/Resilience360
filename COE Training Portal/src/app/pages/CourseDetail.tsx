import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  Clock, 
  Users, 
  Award, 
  CheckCircle2, 
  Circle, 
  Lock,
  PlayCircle,
  FileText,
  ClipboardCheck,
  Calendar,
  MapPin,
  User
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const courseModules = [
  {
    id: 1,
    title: "Introduction to Infrastructure Damage Assessment",
    duration: "45 min",
    type: "video",
    status: "completed",
    resources: ["Lecture Slides", "Reading Material"],
    quiz: true,
  },
  {
    id: 2,
    title: "Structural Assessment Fundamentals",
    duration: "60 min",
    type: "video",
    status: "completed",
    resources: ["Lecture Slides", "Case Study"],
    quiz: true,
  },
  {
    id: 3,
    title: "Field Assessment Techniques",
    duration: "90 min",
    type: "video",
    status: "in-progress",
    resources: ["Field Guide", "Assessment Forms"],
    quiz: true,
  },
  {
    id: 4,
    title: "Safety Protocols and Risk Management",
    duration: "50 min",
    type: "video",
    status: "locked",
    resources: ["Safety Guidelines", "Protocol Checklist"],
    quiz: true,
  },
  {
    id: 5,
    title: "Documentation and Reporting",
    duration: "40 min",
    type: "video",
    status: "locked",
    resources: ["Report Templates", "Best Practices"],
    quiz: true,
  },
  {
    id: 6,
    title: "Final Assessment",
    duration: "120 min",
    type: "exam",
    status: "locked",
    resources: [],
    quiz: false,
  },
];

const instructors = [
  {
    name: "Dr. Sohail Ahmad",
    title: "Senior Structural Engineer",
    organization: "NDMA Pakistan",
    experience: "15+ years",
  },
  {
    name: "Engr. Fatima Khan",
    title: "Disaster Risk Specialist",
    organization: "World Bank",
    experience: "12+ years",
  },
];

export function CourseDetail() {
  const completedModules = courseModules.filter(m => m.status === "completed").length;
  const totalModules = courseModules.length;
  const progressPercentage = (completedModules / totalModules) * 100;

  const getModuleIcon = (status: string) => {
    switch (status) {
      case "completed": return CheckCircle2;
      case "in-progress": return PlayCircle;
      case "locked": return Lock;
      default: return Circle;
    }
  };

  const getModuleColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "in-progress": return "text-blue-600";
      case "locked": return "text-gray-400";
      default: return "text-gray-600";
    }
  };

  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching course data
    const fetchCourse = async () => {
      try {
        // Replace with actual API call
        const response = await fetch(`/api/courses/${courseId}`);
        const data = await response.json();
        setCourse(data);
      } catch (error) {
        toast.error("Failed to load course data");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-8 text-white">
        <Badge className="bg-white/20 text-white border-white/30 mb-3">
          Advanced Level
        </Badge>
        <h1 className="text-3xl font-semibold mb-2">
          Infrastructure Damage Assessment
        </h1>
        <p className="text-green-50 mb-6 max-w-3xl">
          Comprehensive training on assessing structural damage post-disaster, including field assessment techniques, safety protocols, and reporting standards.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <div>
              <div className="text-sm text-green-100">Duration</div>
              <div className="font-medium">6 weeks</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <div className="text-sm text-green-100">Enrolled</div>
              <div className="font-medium">245 students</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <div>
              <div className="text-sm text-green-100">Start Date</div>
              <div className="font-medium">March 15, 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            <div>
              <div className="text-sm text-green-100">Certification</div>
              <div className="font-medium">Included</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="modules">Course Modules</TabsTrigger>
              <TabsTrigger value="instructors">Instructors</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Description</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700">
                    This comprehensive course provides professionals with essential skills and knowledge for conducting infrastructure damage assessments following natural disasters. Participants will learn systematic approaches to evaluating structural integrity, identifying hazards, and documenting findings according to international standards.
                  </p>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Learning Objectives</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Conduct systematic structural damage assessments</li>
                      <li>Apply safety protocols during field operations</li>
                      <li>Identify and classify structural damage severity</li>
                      <li>Prepare comprehensive assessment reports</li>
                      <li>Make informed decisions on building safety</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Target Audience</h4>
                    <p className="text-gray-700">
                      Civil engineers, structural engineers, building inspectors, disaster response teams, and government officials involved in post-disaster assessment activities.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Pre-requisites</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-700">
                      <li>Bachelor's degree in Civil Engineering or related field</li>
                      <li>Basic understanding of structural engineering principles</li>
                      <li>Completion of "Disaster Risk Reduction Fundamentals" (recommended)</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assessment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-700">Module Quizzes (6)</span>
                      <span className="font-medium">30%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-700">Assignments (3)</span>
                      <span className="font-medium">30%</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-gray-700">Final Assessment</span>
                      <span className="font-medium">40%</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Passing Score</span>
                      <span className="font-semibold text-green-600">70%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="modules" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Structure</CardTitle>
                  <p className="text-sm text-gray-500">
                    {totalModules} modules • {completedModules} completed
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {courseModules.map((module, index) => {
                      const Icon = getModuleIcon(module.status);
                      const colorClass = getModuleColor(module.status);
                      
                      return (
                        <div
                          key={module.id}
                          className={`p-4 border rounded-lg ${
                            module.status === "locked" ? "bg-gray-50" : "bg-white hover:shadow-md"
                          } transition-shadow`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`mt-1 ${colorClass}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                      Module {index + 1}
                                    </span>
                                    {module.status === "in-progress" && (
                                      <Badge className="bg-blue-100 text-blue-700">
                                        In Progress
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-medium mt-1">{module.title}</h4>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {module.duration}
                                </div>
                              </div>

                              {module.resources.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {module.resources.map((resource) => (
                                    <Button
                                      key={resource}
                                      variant="outline"
                                      size="sm"
                                      disabled={module.status === "locked"}
                                      className="text-xs"
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      {resource}
                                    </Button>
                                  ))}
                                  {module.quiz && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={module.status === "locked"}
                                      className="text-xs"
                                    >
                                      <ClipboardCheck className="h-3 w-3 mr-1" />
                                      Quiz
                                    </Button>
                                  )}
                                </div>
                              )}

                              {module.status !== "locked" && (
                                <Button
                                  className="mt-3"
                                  variant={module.status === "completed" ? "outline" : "default"}
                                >
                                  {module.status === "completed" ? "Review" : "Continue"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="instructors" className="space-y-4">
              {instructors.map((instructor) => (
                <Card key={instructor.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-8 w-8 text-green-700" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{instructor.name}</h3>
                        <p className="text-gray-600">{instructor.title}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {instructor.organization}
                          </span>
                          <span>{instructor.experience} experience</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Overall Completion</span>
                  <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-2xl font-semibold text-green-600">
                    {completedModules}
                  </div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold text-gray-600">
                    {totalModules - completedModules}
                  </div>
                  <div className="text-xs text-gray-500">Remaining</div>
                </div>
              </div>

              <Button className="w-full bg-green-600 hover:bg-green-700">
                Continue Learning
              </Button>
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Mode</span>
                <span className="font-medium">Hybrid</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location</span>
                <span className="font-medium">Islamabad</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Language</span>
                <span className="font-medium">English/Urdu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Certificate</span>
                <span className="font-medium text-green-600">Yes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPD Points</span>
                <span className="font-medium">15 points</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Download Course Outline
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Join Discussion Forum
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Award className="h-4 w-4 mr-2" />
                View Certificate Requirements
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}