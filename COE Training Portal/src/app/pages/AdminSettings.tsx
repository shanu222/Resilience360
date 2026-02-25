import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  GraduationCap,
  BookOpen,
  Search,
  Mail,
  School,
  CreditCard,
  Award,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface Course {
  id: number;
  title: string;
  category: string;
  level: string;
  mode: string;
  duration: string;
  status: string;
  participants: number;
  certified: boolean;
  description: string;
  startDate: string;
  location: string;
}

export function AdminSettings() {
  const { user, getAllTrainees, deleteTrainee, addTrainee } = useAuth();
  const [trainees, setTrainees] = useState<any[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseSearchTerm, setCourseSearchTerm] = useState("");

  // Add User Dialog State
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    qualifications: "",
    university: "",
    cnic: "",
    reason: "",
  });

  // Add Course Dialog State
  const [addCourseOpen, setAddCourseOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    category: "",
    level: "",
    mode: "",
    duration: "",
    status: "Open",
    certified: false,
    description: "",
    startDate: "",
    location: "",
  });

  // Edit Course Dialog State
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      loadTrainees();
      loadCourses();
    }
  }, [user]);

  const loadTrainees = async () => {
    const allTrainees = await getAllTrainees();
    setTrainees(allTrainees);
  };

  const loadCourses = () => {
    const savedCourses = localStorage.getItem("ndma_courses");
    if (savedCourses) {
      setCourses(JSON.parse(savedCourses));
    } else {
      // Initialize with default courses
      const defaultCourses: Course[] = [
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
      ];
      localStorage.setItem("ndma_courses", JSON.stringify(defaultCourses));
      setCourses(defaultCourses);
    }
  };

  const handleDeleteTrainee = async (traineeId: string) => {
    await deleteTrainee(traineeId);
    await loadTrainees();
    toast.success("Learner removed successfully");
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.cnic) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await addTrainee(newUser);
    if (success) {
      toast.success("New learner added successfully");
      setAddUserOpen(false);
      setNewUser({
        name: "",
        email: "",
        qualifications: "",
        university: "",
        cnic: "",
        reason: "",
      });
      await loadTrainees();
    } else {
      toast.error("Email already exists");
    }
  };

  const handleAddCourse = () => {
    if (!newCourse.title || !newCourse.category || !newCourse.level) {
      toast.error("Please fill in all required fields");
      return;
    }

    const courseToAdd: Course = {
      ...newCourse,
      id: Date.now(),
      participants: 0,
    };

    const updatedCourses = [...courses, courseToAdd];
    setCourses(updatedCourses);
    localStorage.setItem("ndma_courses", JSON.stringify(updatedCourses));
    
    toast.success("Course created successfully");
    setAddCourseOpen(false);
    setNewCourse({
      title: "",
      category: "",
      level: "",
      mode: "",
      duration: "",
      status: "Open",
      certified: false,
      description: "",
      startDate: "",
      location: "",
    });
  };

  const handleEditCourse = () => {
    if (!editingCourse) return;

    const updatedCourses = courses.map((c) =>
      c.id === editingCourse.id ? editingCourse : c
    );
    setCourses(updatedCourses);
    localStorage.setItem("ndma_courses", JSON.stringify(updatedCourses));
    
    toast.success("Course updated successfully");
    setEditCourseOpen(false);
    setEditingCourse(null);
  };

  const handleDeleteCourse = (courseId: number) => {
    const updatedCourses = courses.filter((c) => c.id !== courseId);
    setCourses(updatedCourses);
    localStorage.setItem("ndma_courses", JSON.stringify(updatedCourses));
    toast.success("Course deleted successfully");
  };

  const filteredTrainees = trainees.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.cnic.includes(searchTerm)
  );

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(courseSearchTerm.toLowerCase())
  );

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage users, courses, and system settings
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Learners
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{trainees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Courses
            </CardTitle>
            <BookOpen className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Courses
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {courses.filter((c) => c.status === "Open" || c.status === "Ongoing").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="courses">Course Management</TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Learners</CardTitle>
                <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Learner
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Learner</DialogTitle>
                      <DialogDescription>
                        Create a new learner account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={newUser.name}
                          onChange={(e) =>
                            setNewUser({ ...newUser, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newUser.email}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qualifications">Qualifications</Label>
                        <Input
                          id="qualifications"
                          value={newUser.qualifications}
                          onChange={(e) =>
                            setNewUser({
                              ...newUser,
                              qualifications: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="university">University/College</Label>
                        <Input
                          id="university"
                          value={newUser.university}
                          onChange={(e) =>
                            setNewUser({ ...newUser, university: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnic">CNIC *</Label>
                        <Input
                          id="cnic"
                          value={newUser.cnic}
                          onChange={(e) =>
                            setNewUser({ ...newUser, cnic: e.target.value })
                          }
                          placeholder="XXXXX-XXXXXXX-X"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="reason">Reason for Joining</Label>
                        <Textarea
                          id="reason"
                          value={newUser.reason}
                          onChange={(e) =>
                            setNewUser({ ...newUser, reason: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleAddUser}
                      >
                        Add Learner
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search learners by name, email, or CNIC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Learners Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            CNIC
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Qualifications
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Enrolled Courses
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredTrainees.map((trainee) => (
                          <tr key={trainee.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {trainee.name}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Mail className="h-3 w-3" />
                                {trainee.email}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <CreditCard className="h-3 w-3" />
                                {trainee.cnic}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <School className="h-3 w-3" />
                                {trainee.qualifications || "N/A"}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {trainee.enrolledCourses?.length || 0} courses
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Remove Learner
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove{" "}
                                      <strong>{trainee.name}</strong>? This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteTrainee(trainee.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                        {filteredTrainees.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-gray-500"
                            >
                              No learners found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Management Tab */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Training Courses</CardTitle>
                <Dialog open={addCourseOpen} onOpenChange={setAddCourseOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>
                        Add a new training program
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="title">Course Title *</Label>
                        <Input
                          id="title"
                          value={newCourse.title}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select
                          value={newCourse.category}
                          onValueChange={(value) =>
                            setNewCourse({ ...newCourse, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Structural Safety">
                              Structural Safety
                            </SelectItem>
                            <SelectItem value="Disaster Risk Reduction">
                              Disaster Risk Reduction
                            </SelectItem>
                            <SelectItem value="Climate Resilience">
                              Climate Resilience
                            </SelectItem>
                            <SelectItem value="Emergency Preparedness">
                              Emergency Preparedness
                            </SelectItem>
                            <SelectItem value="Building Codes & Compliance">
                              Building Codes & Compliance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="level">Level *</Label>
                        <Select
                          value={newCourse.level}
                          onValueChange={(value) =>
                            setNewCourse({ ...newCourse, level: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Introductory">Introductory</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mode">Mode</Label>
                        <Select
                          value={newCourse.mode}
                          onValueChange={(value) =>
                            setNewCourse({ ...newCourse, mode: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Online">Online</SelectItem>
                            <SelectItem value="In-person">In-person</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration</Label>
                        <Input
                          id="duration"
                          value={newCourse.duration}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, duration: e.target.value })
                          }
                          placeholder="e.g., 4 weeks"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newCourse.status}
                          onValueChange={(value) =>
                            setNewCourse({ ...newCourse, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Open">Open</SelectItem>
                            <SelectItem value="Ongoing">Ongoing</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          value={newCourse.startDate}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, startDate: e.target.value })
                          }
                          placeholder="e.g., March 15, 2026"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={newCourse.location}
                          onChange={(e) =>
                            setNewCourse({ ...newCourse, location: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newCourse.description}
                          onChange={(e) =>
                            setNewCourse({
                              ...newCourse,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <input
                          type="checkbox"
                          id="certified"
                          checked={newCourse.certified}
                          onChange={(e) =>
                            setNewCourse({
                              ...newCourse,
                              certified: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <Label htmlFor="certified">Certified Course</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setAddCourseOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={handleAddCourse}
                      >
                        Create Course
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search courses..."
                    value={courseSearchTerm}
                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Courses Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredCourses.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{course.title}</CardTitle>
                              {course.certified && (
                                <Award className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{course.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge
                            className={
                              course.status === "Open"
                                ? "bg-green-100 text-green-700"
                                : course.status === "Ongoing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }
                          >
                            {course.status}
                          </Badge>
                          <Badge variant="outline">{course.level}</Badge>
                          <Badge variant="outline">{course.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                          <div>Duration: {course.duration}</div>
                          <div>Mode: {course.mode}</div>
                          <div>Location: {course.location}</div>
                          <div>Participants: {course.participants}</div>
                        </div>
                        <div className="flex gap-2">
                          <Dialog open={editCourseOpen && editingCourse?.id === course.id} onOpenChange={(open) => {
                            setEditCourseOpen(open);
                            if (!open) setEditingCourse(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => setEditingCourse(course)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Course</DialogTitle>
                              </DialogHeader>
                              {editingCourse && (
                                <div className="grid grid-cols-2 gap-4 py-4">
                                  <div className="space-y-2 col-span-2">
                                    <Label htmlFor="edit-title">Course Title *</Label>
                                    <Input
                                      id="edit-title"
                                      value={editingCourse.title}
                                      onChange={(e) =>
                                        setEditingCourse({ ...editingCourse, title: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-category">Category *</Label>
                                    <Select
                                      value={editingCourse.category}
                                      onValueChange={(value) =>
                                        setEditingCourse({ ...editingCourse, category: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Structural Safety">Structural Safety</SelectItem>
                                        <SelectItem value="Disaster Risk Reduction">Disaster Risk Reduction</SelectItem>
                                        <SelectItem value="Climate Resilience">Climate Resilience</SelectItem>
                                        <SelectItem value="Emergency Preparedness">Emergency Preparedness</SelectItem>
                                        <SelectItem value="Building Codes & Compliance">Building Codes & Compliance</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-level">Level *</Label>
                                    <Select
                                      value={editingCourse.level}
                                      onValueChange={(value) =>
                                        setEditingCourse({ ...editingCourse, level: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Introductory">Introductory</SelectItem>
                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                      value={editingCourse.status}
                                      onValueChange={(value) =>
                                        setEditingCourse({ ...editingCourse, status: value })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                                        <SelectItem value="Completed">Completed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Duration</Label>
                                    <Input
                                      value={editingCourse.duration}
                                      onChange={(e) =>
                                        setEditingCourse({ ...editingCourse, duration: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2 col-span-2">
                                    <Label>Description</Label>
                                    <Textarea
                                      value={editingCourse.description}
                                      onChange={(e) =>
                                        setEditingCourse({ ...editingCourse, description: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditCourseOpen(false)}>
                                  Cancel
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700" onClick={handleEditCourse}>
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete{" "}
                                  <strong>{course.title}</strong>? This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredCourses.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-gray-500">
                      No courses found
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
