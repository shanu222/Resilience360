import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Trophy,
  Target,
  Calendar,
  RotateCcw
} from "lucide-react";

const assessments = [
  {
    id: 1,
    title: "Infrastructure Damage Assessment - Module 1 Quiz",
    course: "Infrastructure Damage Assessment",
    type: "Quiz",
    duration: "15 minutes",
    questions: 10,
    passingScore: 70,
    status: "passed",
    score: 85,
    attempts: 1,
    maxAttempts: 3,
    lastAttempt: "Feb 5, 2026",
    dueDate: null,
  },
  {
    id: 2,
    title: "Structural Safety Evaluation - Final Exam",
    course: "Structural Safety Evaluation",
    type: "Exam",
    duration: "120 minutes",
    questions: 50,
    passingScore: 70,
    status: "passed",
    score: 78,
    attempts: 2,
    maxAttempts: 2,
    lastAttempt: "Jan 28, 2026",
    dueDate: null,
  },
  {
    id: 3,
    title: "Field Assessment Techniques - Quiz",
    course: "Infrastructure Damage Assessment",
    type: "Quiz",
    duration: "20 minutes",
    questions: 15,
    passingScore: 70,
    status: "failed",
    score: 65,
    attempts: 1,
    maxAttempts: 3,
    lastAttempt: "Feb 8, 2026",
    dueDate: null,
  },
  {
    id: 4,
    title: "Climate Resilience Planning - Midterm Assessment",
    course: "Climate Resilience Planning",
    type: "Assessment",
    duration: "90 minutes",
    questions: 30,
    passingScore: 70,
    status: "pending",
    score: null,
    attempts: 0,
    maxAttempts: 2,
    lastAttempt: null,
    dueDate: "Feb 20, 2026",
  },
  {
    id: 5,
    title: "Emergency Response Coordination - Module 2 Quiz",
    course: "Emergency Response Coordination",
    type: "Quiz",
    duration: "15 minutes",
    questions: 12,
    passingScore: 70,
    status: "pending",
    score: null,
    attempts: 0,
    maxAttempts: 3,
    lastAttempt: null,
    dueDate: "Feb 15, 2026",
  },
  {
    id: 6,
    title: "DRR Fundamentals - Final Exam",
    course: "Disaster Risk Reduction Fundamentals",
    type: "Exam",
    duration: "120 minutes",
    questions: 60,
    passingScore: 70,
    status: "passed",
    score: 92,
    attempts: 1,
    maxAttempts: 2,
    lastAttempt: "Jan 10, 2026",
    dueDate: null,
  },
];

export function Assessments() {
  const passedCount = assessments.filter(a => a.status === "passed").length;
  const failedCount = assessments.filter(a => a.status === "failed").length;
  const pendingCount = assessments.filter(a => a.status === "pending").length;
  const averageScore = assessments
    .filter(a => a.score !== null)
    .reduce((sum, a) => sum + (a.score || 0), 0) / assessments.filter(a => a.score !== null).length;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "passed":
        return {
          color: "bg-green-100 text-green-700 border-green-200",
          icon: CheckCircle2,
          iconColor: "text-green-600",
        };
      case "failed":
        return {
          color: "bg-red-100 text-red-700 border-red-200",
          icon: XCircle,
          iconColor: "text-red-600",
        };
      case "pending":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-200",
          icon: AlertCircle,
          iconColor: "text-blue-600",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700 border-gray-200",
          icon: AlertCircle,
          iconColor: "text-gray-600",
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Assessments & Exams</h1>
          <p className="text-gray-600 mt-1">
            Track your quizzes, assessments, and exam performance
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{passedCount}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{pendingCount}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{failedCount}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{averageScore.toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Avg. Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments List */}
      <div className="space-y-4">
        {assessments.map((assessment) => {
          const statusConfig = getStatusConfig(assessment.status);
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={assessment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${statusConfig.color}`}>
                    <StatusIcon className="h-7 w-7" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{assessment.title}</h3>
                        <p className="text-sm text-gray-600">{assessment.course}</p>
                      </div>
                      <Badge className={statusConfig.color}>
                        {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>{assessment.questions} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{assessment.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>Pass: {assessment.passingScore}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <RotateCcw className="h-4 w-4" />
                        <span>
                          {assessment.attempts}/{assessment.maxAttempts} attempts
                        </span>
                      </div>
                    </div>

                    {assessment.score !== null && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Your Score</span>
                          <span className={`font-semibold ${
                            assessment.score >= assessment.passingScore
                              ? "text-green-600"
                              : "text-red-600"
                          }`}>
                            {assessment.score}%
                          </span>
                        </div>
                        <Progress 
                          value={assessment.score} 
                          className="h-2"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        {assessment.lastAttempt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Last attempt: {assessment.lastAttempt}
                          </span>
                        )}
                        {assessment.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {assessment.dueDate}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {assessment.status === "pending" && (
                          <Button className="bg-green-600 hover:bg-green-700">
                            Start Assessment
                          </Button>
                        )}
                        {assessment.status === "failed" && 
                          assessment.attempts < assessment.maxAttempts && (
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        )}
                        {assessment.status === "passed" && (
                          <Button variant="outline">
                            View Results
                          </Button>
                        )}
                        {assessment.status === "failed" && (
                          <>
                            <Button variant="outline">
                              View Results
                            </Button>
                            {assessment.attempts >= assessment.maxAttempts && (
                              <Badge variant="outline" className="text-red-600">
                                Max attempts reached
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assessment Guidelines */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Assessment Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>All assessments must be completed within the specified time limit</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>A minimum score of 70% is required to pass most assessments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Limited attempts are available for each assessment - use them wisely</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Review course materials before attempting assessments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Final exams require completion of all prerequisite modules</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
