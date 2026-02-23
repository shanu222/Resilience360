import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Shield, GraduationCap, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  // Admin login state
  const [adminEmail, setAdminEmail] = useState("");

  // Trainee signup state
  const [traineeData, setTraineeData] = useState({
    name: "",
    email: "",
    qualifications: "",
    university: "",
    cnic: "",
    reason: "",
  });

  // Trainee login state
  const [traineeLoginEmail, setTraineeLoginEmail] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminEmail) {
      setErrors({ adminEmail: "Email is required" });
      return;
    }

    const success = await login(adminEmail);
    
    if (success) {
      toast.success("Welcome back, Admin!");
      navigate("/");
    } else {
      toast.error("Invalid admin credentials");
      setErrors({ adminEmail: "Invalid admin email" });
    }
  };

  const handleTraineeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!traineeData.name) newErrors.name = "Name is required";
    if (!traineeData.email) newErrors.email = "Email is required";
    if (!traineeData.qualifications) newErrors.qualifications = "Qualifications are required";
    if (!traineeData.university) newErrors.university = "University/College is required";
    if (!traineeData.cnic) newErrors.cnic = "CNIC is required";
    if (!traineeData.reason) newErrors.reason = "Please tell us why you want to join";
    
    // Validate CNIC format (13 digits)
    if (traineeData.cnic && !/^\d{13}$/.test(traineeData.cnic.replace(/-/g, ""))) {
      newErrors.cnic = "CNIC must be 13 digits (e.g., 12345-1234567-1)";
    }

    // Validate email
    if (traineeData.email && !/\S+@\S+\.\S+/.test(traineeData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const success = await signup(traineeData);
    
    if (success) {
      toast.success("Registration successful! Welcome to NDMA Portal");
      navigate("/");
    } else {
      toast.error("Email already exists. Please login instead.");
      setErrors({ email: "Email already registered" });
    }
  };

  const handleTraineeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!traineeLoginEmail) {
      setErrors({ traineeLoginEmail: "Email is required" });
      return;
    }

    const success = await login(traineeLoginEmail);
    
    if (success) {
      toast.success("Welcome back!");
      navigate("/");
    } else {
      toast.error("Account not found. Please sign up first.");
      setErrors({ traineeLoginEmail: "Account not found" });
    }
  };

  const handleTraineeInputChange = (field: string, value: string) => {
    setTraineeData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Shield className="h-9 w-9 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-gray-900">NDMA Portal</h1>
              <p className="text-gray-600">Knowledge, Training & Certification</p>
            </div>
          </div>
          <p className="text-gray-700">
            National Disaster Management Authority, Pakistan
          </p>
        </div>

        <Tabs defaultValue="trainee-signup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trainee-signup">Trainee Sign Up</TabsTrigger>
            <TabsTrigger value="trainee-login">Trainee Login</TabsTrigger>
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
          </TabsList>

          {/* Trainee Sign Up */}
          <TabsContent value="trainee-signup">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <CardTitle>Trainee Registration</CardTitle>
                    <CardDescription>
                      Join NDMA's capacity building program
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTraineeSignup} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Muhammad Ahmed"
                        value={traineeData.name}
                        onChange={(e) => handleTraineeInputChange("name", e.target.value)}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ahmed@example.com"
                        value={traineeData.email}
                        onChange={(e) => handleTraineeInputChange("email", e.target.value)}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="qualifications">Qualifications/Degree *</Label>
                      <Input
                        id="qualifications"
                        placeholder="Bachelor in Civil Engineering"
                        value={traineeData.qualifications}
                        onChange={(e) => handleTraineeInputChange("qualifications", e.target.value)}
                      />
                      {errors.qualifications && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.qualifications}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="university">University/College *</Label>
                      <Input
                        id="university"
                        placeholder="NED University of Engineering"
                        value={traineeData.university}
                        onChange={(e) => handleTraineeInputChange("university", e.target.value)}
                      />
                      {errors.university && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.university}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnic">CNIC *</Label>
                      <Input
                        id="cnic"
                        placeholder="12345-1234567-1"
                        value={traineeData.cnic}
                        onChange={(e) => handleTraineeInputChange("cnic", e.target.value)}
                      />
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                        CNIC cannot be changed later. Please make sure this matches your original CNIC.
                      </p>
                      {errors.cnic && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.cnic}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Why do you want to join? *</Label>
                    <Textarea
                      id="reason"
                      placeholder="I want to enhance my skills in disaster risk reduction and contribute to building resilient infrastructure in Pakistan..."
                      rows={4}
                      value={traineeData.reason}
                      onChange={(e) => handleTraineeInputChange("reason", e.target.value)}
                    />
                    {errors.reason && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.reason}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Register as Trainee
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trainee Login */}
          <TabsContent value="trainee-login">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <CardTitle>Trainee Login</CardTitle>
                    <CardDescription>
                      Access your training portal
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTraineeLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="trainee-email">Email Address</Label>
                    <Input
                      id="trainee-email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={traineeLoginEmail}
                      onChange={(e) => {
                        setTraineeLoginEmail(e.target.value);
                        setErrors(prev => ({ ...prev, traineeLoginEmail: "" }));
                      }}
                    />
                    {errors.traineeLoginEmail && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.traineeLoginEmail}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Login
                  </Button>

                  <p className="text-sm text-center text-gray-600">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        const tabsList = document.querySelector('[role="tablist"]');
                        const signupTab = tabsList?.querySelector('[value="trainee-signup"]') as HTMLElement;
                        signupTab?.click();
                      }}
                      className="text-green-600 hover:underline"
                    >
                      Sign up here
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Admin Login */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <CardTitle>Admin Login</CardTitle>
                    <CardDescription>
                      Authorized personnel only
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@ndma.gov.pk"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        setErrors(prev => ({ ...prev, adminEmail: "" }));
                      }}
                    />
                    {errors.adminEmail && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.adminEmail}
                      </p>
                    )}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        Admin access is restricted to authorized NDMA personnel only. 
                        Unauthorized access attempts will be logged and reported.
                      </span>
                    </p>
                  </div>

                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700">
                    Admin Login
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
