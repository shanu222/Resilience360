import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Award, 
  CheckCircle2, 
  Download, 
  QrCode, 
  Calendar,
  FileCheck,
  BookOpen,
  ClipboardCheck,
  Shield,
  Clock
} from "lucide-react";

const availableCertifications = [
  {
    id: 1,
    title: "Certified Infrastructure Damage Assessor",
    description: "Professional certification for conducting post-disaster infrastructure assessments",
    requiredCourses: [
      "Infrastructure Damage Assessment",
      "Structural Safety Evaluation",
      "Field Assessment Techniques"
    ],
    assessmentMethod: "Written Exam + Practical Assessment",
    validity: "3 years",
    issuingAuthority: "NDMA Pakistan",
    eligibility: [
      "Bachelor's degree in Civil Engineering",
      "2+ years relevant experience",
      "Completion of required courses"
    ],
    status: "eligible",
  },
  {
    id: 2,
    title: "Certified DRR Engineer",
    description: "Specialized certification in disaster risk reduction engineering practices",
    requiredCourses: [
      "Disaster Risk Reduction Fundamentals",
      "Climate Resilience Planning",
      "Risk Assessment Methodologies"
    ],
    assessmentMethod: "Comprehensive Exam + Case Study",
    validity: "3 years",
    issuingAuthority: "NDMA Pakistan",
    eligibility: [
      "Engineering degree (any discipline)",
      "1+ years in disaster management",
      "Completion of required courses"
    ],
    status: "in-progress",
  },
  {
    id: 3,
    title: "Certified Building Safety Auditor",
    description: "Expert-level certification for building safety audits and compliance verification",
    requiredCourses: [
      "Building Codes & Compliance",
      "Seismic Safety Assessment",
      "Structural Analysis"
    ],
    assessmentMethod: "Written Exam + Field Audit",
    validity: "5 years",
    issuingAuthority: "NDMA Pakistan",
    eligibility: [
      "Professional Engineering License",
      "5+ years structural engineering experience",
      "Completion of required courses"
    ],
    status: "not-eligible",
  },
  {
    id: 4,
    title: "Certified Emergency Planning Officer",
    description: "Professional certification for emergency response planning and coordination",
    requiredCourses: [
      "Emergency Response Coordination",
      "Community-Based Disaster Preparedness",
      "Incident Command System"
    ],
    assessmentMethod: "Simulation Exercise + Written Exam",
    validity: "3 years",
    issuingAuthority: "NDMA Pakistan",
    eligibility: [
      "Relevant bachelor's degree",
      "Experience in emergency management",
      "Completion of required courses"
    ],
    status: "eligible",
  },
];

const myCertifications = [
  {
    id: 1,
    name: "Disaster Risk Reduction Fundamentals",
    issueDate: "January 15, 2026",
    expiryDate: "January 15, 2029",
    certificateNumber: "NDMA-DRR-2026-1543",
    status: "active",
  },
  {
    id: 2,
    name: "Structural Safety Evaluation",
    issueDate: "December 10, 2025",
    expiryDate: "December 10, 2028",
    certificateNumber: "NDMA-SSE-2025-8932",
    status: "active",
  },
  {
    id: 3,
    name: "Emergency Response Basics",
    issueDate: "August 5, 2023",
    expiryDate: "August 5, 2026",
    certificateNumber: "NDMA-ERB-2023-3421",
    status: "expiring-soon",
  },
];

export function Certification() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "eligible": return "bg-green-100 text-green-700 border-green-200";
      case "in-progress": return "bg-blue-100 text-blue-700 border-blue-200";
      case "not-eligible": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getCertStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "expiring-soon": return "bg-orange-100 text-orange-700";
      case "expired": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Certification</h1>
          <p className="text-gray-600 mt-1">
            Professional certifications for disaster management professionals
          </p>
        </div>
      </div>

      <Tabs defaultValue="available" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="available">Available Certifications</TabsTrigger>
          <TabsTrigger value="my-certs">My Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-6 mt-6">
          {/* Overview */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">NDMA Professional Certifications</h3>
                  <p className="text-sm text-green-800 mt-1">
                    All certifications are nationally recognized and issued by the National Disaster Management Authority, Government of Pakistan. These credentials validate your expertise and commitment to professional excellence in disaster management.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Certifications List */}
          <div className="space-y-6">
            {availableCertifications.map((cert) => (
              <Card key={cert.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="h-6 w-6 text-blue-700" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">{cert.title}</CardTitle>
                        <p className="text-sm text-gray-600">{cert.description}</p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(cert.status)}>
                      {cert.status === "eligible" && "Eligible to Apply"}
                      {cert.status === "in-progress" && "In Progress"}
                      {cert.status === "not-eligible" && "Not Eligible"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-gray-600" />
                          Required Courses
                        </h4>
                        <ul className="space-y-1">
                          {cert.requiredCourses.map((course) => (
                            <li key={course} className="text-sm text-gray-700 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              {course}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <ClipboardCheck className="h-4 w-4 text-gray-600" />
                          Assessment Method
                        </h4>
                        <p className="text-sm text-gray-700">{cert.assessmentMethod}</p>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-2">
                          <FileCheck className="h-4 w-4 text-gray-600" />
                          Eligibility Criteria
                        </h4>
                        <ul className="space-y-1">
                          {cert.eligibility.map((criteria, index) => (
                            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5">•</span>
                              {criteria}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Validity Period</div>
                          <div className="text-sm font-medium">{cert.validity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Issuing Authority</div>
                          <div className="text-sm font-medium">{cert.issuingAuthority}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={cert.status === "not-eligible"}
                    >
                      {cert.status === "eligible" && "Apply for Certification"}
                      {cert.status === "in-progress" && "Continue Application"}
                      {cert.status === "not-eligible" && "Complete Requirements First"}
                    </Button>
                    <Button variant="outline">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-certs" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {myCertifications.filter(c => c.status === "active").length}
                    </div>
                    <div className="text-sm text-gray-600">Active Certificates</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {myCertifications.filter(c => c.status === "expiring-soon").length}
                    </div>
                    <div className="text-sm text-gray-600">Expiring Soon</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileCheck className="h-6 w-6 text-blue-700" />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">
                      {myCertifications.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificates List */}
          <div className="space-y-4">
            {myCertifications.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{cert.name}</h3>
                          <p className="text-sm text-gray-600">
                            Certificate No: {cert.certificateNumber}
                          </p>
                        </div>
                        <Badge className={getCertStatusColor(cert.status)}>
                          {cert.status === "active" && "Active"}
                          {cert.status === "expiring-soon" && "Expiring Soon"}
                          {cert.status === "expired" && "Expired"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <span className="text-gray-500">Issued: </span>
                            {cert.issueDate}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <span className="text-gray-500">Valid Until: </span>
                            {cert.expiryDate}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                        <Button size="sm" variant="outline">
                          <QrCode className="h-4 w-4 mr-2" />
                          Verify QR Code
                        </Button>
                        {cert.status === "expiring-soon" && (
                          <Button size="sm" variant="outline">
                            Renew Certificate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Certificate Verification</h3>
                  <p className="text-sm text-blue-800 mt-1">
                    All NDMA certificates include a QR code for instant verification. Employers and institutions can scan the code or visit our verification portal to confirm authenticity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
