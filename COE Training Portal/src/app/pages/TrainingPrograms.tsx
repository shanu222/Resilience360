import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Search, Filter, Clock, Users, MapPin, Award, Calendar, CheckCircle } from "lucide-react";
import { Link } from "react-router";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export function TrainingPrograms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [trainingPrograms, setTrainingPrograms] = useState<any[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = () => {
    const savedCourses = localStorage.getItem("ndma_courses");
    if (savedCourses) {
      setTrainingPrograms(JSON.parse(savedCourses));
    } else {
      // Initialize with default courses if not exists
      const defaultCourses = [
        {
          id: 1,
          title: "Infrastructure Damage Assessment",
          category: "Structural Safety",
          level: "Intermediate",
          mode: "Hybrid",
          duration: "6 weeks",
          status: "Open",
          participants: 245,
          certified: true,
          description: "Learn comprehensive techniques for assessing infrastructure damage post-disaster",
          startDate: "March 15, 2026",
          location: "Islamabad",
        },
        {
          id: 2,
          title: "Disaster Risk Reduction Fundamentals",
          category: "Disaster Risk Reduction",
          level: "Introductory",
          mode: "Online",
          duration: "4 weeks",
          status: "Open",
          participants: 512,
          certified: true,
          description: "Foundation course in disaster risk reduction principles and practices",
          startDate: "March 1, 2026",
          location: "Online",
        },
        {
          id: 3,
          title: "Climate Resilience Planning",
          category: "Climate Resilience",
          level: "Advanced",
          mode: "In-person",
          duration: "8 weeks",
          status: "Ongoing",
          participants: 87,
          certified: true,
          description: "Advanced strategies for climate adaptation and resilience planning",
          startDate: "February 5, 2026",
          location: "Karachi",
        },
        {
          id: 4,
          title: "Emergency Response Coordination",
          category: "Emergency Preparedness",
          level: "Intermediate",
          mode: "Hybrid",
          duration: "5 weeks",
          status: "Open",
          participants: 334,
          certified: true,
          description: "Coordination and management of emergency response operations",
          startDate: "March 20, 2026",
          location: "Lahore",
        },
        {
          id: 5,
          title: "Building Codes & Compliance",
          category: "Building Codes & Compliance",
          level: "Advanced",
          mode: "In-person",
          duration: "10 weeks",
          status: "Completed",
          participants: 156,
          certified: true,
          description: "Comprehensive study of building codes and compliance requirements",
          startDate: "January 10, 2026",
          location: "Islamabad",
        },
        {
          id: 6,
          title: "Flood Risk Management",
          category: "Disaster Risk Reduction",
          level: "Intermediate",
          mode: "Online",
          duration: "5 weeks",
          status: "Open",
          participants: 423,
          certified: true,
          description: "Managing and mitigating flood risks in urban and rural areas",
          startDate: "March 8, 2026",
          location: "Online",
        },
        {
          id: 7,
          title: "Seismic Safety Assessment",
          category: "Structural Safety",
          level: "Advanced",
          mode: "In-person",
          duration: "7 weeks",
          status: "Open",
          participants: 198,
          certified: true,
          description: "Earthquake safety evaluation and retrofit techniques",
          startDate: "March 25, 2026",
          location: "Peshawar",
        },
        {
          id: 8,
          title: "Community-Based Disaster Preparedness",
          category: "Emergency Preparedness",
          level: "Introductory",
          mode: "Hybrid",
          duration: "3 weeks",
          status: "Open",
          participants: 678,
          certified: false,
          description: "Grassroots disaster preparedness and community engagement",
          startDate: "March 10, 2026",
          location: "Multiple Cities",
        },
      ];
      localStorage.setItem("ndma_courses", JSON.stringify(defaultCourses));
      setTrainingPrograms(defaultCourses);
    }
  };

  const filteredPrograms = trainingPrograms.filter((program) => {
    const matchesSearch = program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || program.category === categoryFilter;
    const matchesLevel = levelFilter === "all" || program.level === levelFilter;
    const matchesStatus = statusFilter === "all" || program.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open": return "bg-green-100 text-green-700 border-green-200";
      case "Ongoing": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Completed": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Introductory": return "bg-blue-100 text-blue-700";
      case "Intermediate": return "bg-orange-100 text-orange-700";
      case "Advanced": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const { user, enrollInCourse } = useAuth();

  const handleEnroll = async (programId: number) => {
    if (!user) {
      toast.error("Please log in to enroll in a training program.");
      return;
    }
    
    if (user.role === "trainee") {
      const trainee = user as any;
      if (trainee.enrolledCourses?.includes(programId)) {
        toast.info("You are already enrolled in this program!");
        return;
      }
    }
    
    await enrollInCourse(programId);
    toast.success("Successfully enrolled! Access your course from the dashboard.");
  };

  const isEnrolled = (programId: number) => {
    if (!user || user.role !== "trainee") return false;
    const trainee = user as any;
    return trainee.enrolledCourses?.includes(programId);
  };

  const handleRequestTraining = () => {
    toast.info("Your training request has been submitted. Our team will contact you soon.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Training Programs</h1>
          <p className="text-gray-600 mt-1">
            Browse and enroll in disaster management training courses
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={handleRequestTraining}>
          Request New Training
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search training programs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Structural Safety">Structural Safety</SelectItem>
                <SelectItem value="Disaster Risk Reduction">Disaster Risk Reduction</SelectItem>
                <SelectItem value="Climate Resilience">Climate Resilience</SelectItem>
                <SelectItem value="Emergency Preparedness">Emergency Preparedness</SelectItem>
                <SelectItem value="Building Codes & Compliance">Building Codes & Compliance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Introductory">Introductory</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Ongoing">Ongoing</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredPrograms.length} of {trainingPrograms.length} programs
      </div>

      {/* Training Programs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPrograms.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{program.title}</CardTitle>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {program.description}
                  </p>
                </div>
                {program.certified && (
                  <Award className="h-5 w-5 text-green-600 ml-2 flex-shrink-0" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={getStatusColor(program.status)}>
                  {program.status}
                </Badge>
                <Badge className={getLevelColor(program.level)}>
                  {program.level}
                </Badge>
                <Badge variant="outline">{program.category}</Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{program.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>{program.participants} enrolled</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{program.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{program.startDate}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={`/training/${program.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Details
                  </Button>
                </Link>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={program.status === "Completed" || isEnrolled(program.id)}
                  onClick={() => handleEnroll(program.id)}
                >
                  {program.status === "Completed" ? "Completed" : isEnrolled(program.id) ? "Enrolled" : "Enroll Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}