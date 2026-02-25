import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  GraduationCap, 
  Clock, 
  Award, 
  TrendingUp,
  BookOpen,
  Target,
  Calendar
} from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";

const allCourses = [
  {
    id: 1,
    title: "Infrastructure Damage Assessment",
    category: "Structural Safety",
    duration: "6 weeks",
    modules: 6,
    certified: true,
    startDate: "March 15, 2026",
  },
  {
    id: 2,
    title: "Disaster Risk Reduction Fundamentals",
    category: "Disaster Risk Reduction",
    duration: "4 weeks",
    modules: 8,
    certified: true,
    startDate: "March 1, 2026",
  },
  {
    id: 3,
    title: "Climate Resilience Planning",
    category: "Climate Resilience",
    duration: "8 weeks",
    modules: 10,
    certified: true,
    startDate: "February 5, 2026",
  },
  {
    id: 4,
    title: "Emergency Response Coordination",
    category: "Emergency Preparedness",
    duration: "5 weeks",
    modules: 7,
    certified: true,
    startDate: "March 20, 2026",
  },
  {
    id: 5,
    title: "Building Codes & Compliance",
    category: "Building Codes & Compliance",
    duration: "10 weeks",
    modules: 12,
    certified: true,
    startDate: "April 1, 2026",
  },
];

export function MyCourses() {
  const { user } = useAuth();

  if (!user || user.role !== "trainee") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please log in as a trainee to view your courses.</p>
      </div>
    );
  }

  const trainee = user as any;
  const enrolledCourseIds = trainee.enrolledCourses || [];
  const enrolledCourses = allCourses.filter(course => 
    enrolledCourseIds.includes(course.id)
  );

  const totalEnrolled = enrolledCourses.length;
  const totalCompleted = enrolledCourses.filter(course => 
    (trainee.courseProgress[course.id] || 0) === 100
  ).length;
  const totalInProgress = totalEnrolled - totalCompleted;

  const averageProgress = totalEnrolled > 0
    ? enrolledCourses.reduce((sum, course) => 
        sum + (trainee.courseProgress[course.id] || 0), 0
      ) / totalEnrolled
    : 0;

  if (enrolledCourses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">
            Your enrolled courses and learning progress
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Courses Enrolled</h3>
            <p className="text-gray-600 mb-6">
              Start your learning journey by enrolling in a training program
            </p>
            <Link to="/training">
              <Button className="bg-green-600 hover:bg-green-700">
                Browse Training Programs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">My Courses</h1>
        <p className="text-gray-600 mt-1">
          Track your learning progress and continue your courses
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Enrolled Courses
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEnrolled}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              In Progress
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Target className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Award className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCompleted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg. Progress
            </CardTitle>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageProgress.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Courses</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {enrolledCourses.map((course) => {
            const progress = trainee.courseProgress[course.id] || 0;
            const completedModules = trainee.completedModules[course.id]?.length || 0;
            const isCompleted = progress === 100;

            return (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCompleted && (
                          <Badge className="bg-green-100 text-green-700">
                            Completed
                          </Badge>
                        )}
                        {!isCompleted && progress > 0 && (
                          <Badge className="bg-blue-100 text-blue-700">
                            In Progress
                          </Badge>
                        )}
                        {course.certified && (
                          <Award className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{course.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{course.category}</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">
                      {completedModules} of {course.modules} modules completed
                    </p>
                  </div>

                  {/* Course Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{course.startDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Link to={`/training/${course.id}`} className="flex-1">
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        {isCompleted ? "Review Course" : "Continue Learning"}
                      </Button>
                    </Link>
                    {isCompleted && (
                      <Link to="/certification">
                        <Button variant="outline">
                          <Award className="h-4 w-4 mr-2" />
                          Certificate
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Browse More Courses */}
      <Card>
        <CardContent className="py-8 text-center">
          <h3 className="text-lg font-semibold mb-2">Want to learn more?</h3>
          <p className="text-gray-600 mb-4">
            Explore additional training programs to enhance your skills
          </p>
          <Link to="/training">
            <Button variant="outline">
              Browse All Programs
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
