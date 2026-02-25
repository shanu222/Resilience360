import { Card, CardContent } from "../components/ui/card";
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
import { 
  Search, 
  Download, 
  Eye, 
  FileText, 
  Video, 
  Presentation,
  BookOpen,
  Calendar,
  User,
  FileCheck
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const resources = [
  {
    id: 1,
    title: "Building Safety Assessment Guidelines",
    category: "Guidelines",
    format: "PDF",
    year: "2025",
    uploadedBy: "NDMA Technical Division",
    size: "2.5 MB",
    downloads: 1247,
    hazardType: "Earthquake",
    sector: "Infrastructure",
    region: "National",
    description: "Comprehensive guidelines for post-earthquake building safety assessment",
  },
  {
    id: 2,
    title: "Flood Response Standard Operating Procedures",
    category: "SOPs",
    format: "PDF",
    year: "2024",
    uploadedBy: "Emergency Response Unit",
    size: "1.8 MB",
    downloads: 2134,
    hazardType: "Flood",
    sector: "Emergency Response",
    region: "Punjab",
    description: "Standardized procedures for flood emergency response operations",
  },
  {
    id: 3,
    title: "Infrastructure Resilience Planning Manual",
    category: "Manuals",
    format: "PDF",
    year: "2025",
    uploadedBy: "World Bank Pakistan",
    size: "5.2 MB",
    downloads: 876,
    hazardType: "Multi-Hazard",
    sector: "Infrastructure",
    region: "National",
    description: "Comprehensive manual for planning resilient infrastructure",
  },
  {
    id: 4,
    title: "2022 Sindh Floods: Lessons Learned",
    category: "Case Studies",
    format: "PDF",
    year: "2023",
    uploadedBy: "NDMA Research Wing",
    size: "8.7 MB",
    downloads: 1567,
    hazardType: "Flood",
    sector: "Multi-Sector",
    region: "Sindh",
    description: "Detailed analysis and lessons from 2022 flood response",
  },
  {
    id: 5,
    title: "Seismic Risk Assessment Methodology",
    category: "Research Papers",
    format: "PDF",
    year: "2024",
    uploadedBy: "NED University",
    size: "3.4 MB",
    downloads: 934,
    hazardType: "Earthquake",
    sector: "Research",
    region: "National",
    description: "Advanced methodology for seismic risk assessment in Pakistan",
  },
  {
    id: 6,
    title: "Community Preparedness Training Video",
    category: "Training Materials",
    format: "Video",
    year: "2025",
    uploadedBy: "NDMA Training Wing",
    size: "156 MB",
    downloads: 2341,
    hazardType: "Multi-Hazard",
    sector: "Community Development",
    region: "National",
    description: "Video guide for community-based disaster preparedness",
  },
  {
    id: 7,
    title: "National Building Code 2025",
    category: "Guidelines",
    format: "PDF",
    year: "2025",
    uploadedBy: "Ministry of Housing",
    size: "12.3 MB",
    downloads: 3421,
    hazardType: "Multi-Hazard",
    sector: "Infrastructure",
    region: "National",
    description: "Updated national building code with disaster resilience provisions",
  },
  {
    id: 8,
    title: "Hospital Preparedness Presentation",
    category: "Presentations",
    format: "PPT",
    year: "2024",
    uploadedBy: "Health Emergency Unit",
    size: "45 MB",
    downloads: 567,
    hazardType: "Multi-Hazard",
    sector: "Health",
    region: "National",
    description: "Hospital disaster preparedness and response guidelines",
  },
];

export function KnowledgeRepository() {
  const [searchTerm, setSearchTerm] = useState("");
  const [hazardFilter, setHazardFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");

  const handleDownload = (resourceTitle: string) => {
    toast.success(`Downloading "${resourceTitle}"...`);
    // In a real app, this would trigger actual file download
  };

  const handlePreview = (resourceTitle: string) => {
    toast.info(`Opening preview for "${resourceTitle}"...`);
    // In a real app, this would open a preview modal or new window
  };

  const handleUploadResource = () => {
    toast.info("Upload resource form will be available soon. Please contact the administrator.");
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesHazard = hazardFilter === "all" || resource.hazardType === hazardFilter;
    const matchesSector = sectorFilter === "all" || resource.sector === sectorFilter;
    const matchesFormat = formatFilter === "all" || resource.format === formatFilter;
    
    return matchesSearch && matchesHazard && matchesSector && matchesFormat;
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "PDF": return FileText;
      case "Video": return Video;
      case "PPT": return Presentation;
      default: return FileText;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case "PDF": return "bg-red-100 text-red-700";
      case "Video": return "bg-purple-100 text-purple-700";
      case "PPT": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Guidelines": "bg-blue-100 text-blue-700",
      "SOPs": "bg-green-100 text-green-700",
      "Manuals": "bg-purple-100 text-purple-700",
      "Case Studies": "bg-orange-100 text-orange-700",
      "Research Papers": "bg-indigo-100 text-indigo-700",
      "Training Materials": "bg-teal-100 text-teal-700",
      "Presentations": "bg-pink-100 text-pink-700",
    };
    return colors[category] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Knowledge Repository</h1>
          <p className="text-gray-600 mt-1">
            Digital library of disaster management resources and documentation
          </p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700" onClick={handleUploadResource}>
          Upload Resource
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{resources.length}</div>
                <div className="text-sm text-gray-600">Total Resources</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">47</div>
                <div className="text-sm text-gray-600">Guidelines & SOPs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">23</div>
                <div className="text-sm text-gray-600">Case Studies</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Download className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <div className="text-2xl font-semibold">12.4K</div>
                <div className="text-sm text-gray-600">Total Downloads</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={hazardFilter} onValueChange={setHazardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Hazard Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hazards</SelectItem>
                <SelectItem value="Earthquake">Earthquake</SelectItem>
                <SelectItem value="Flood">Flood</SelectItem>
                <SelectItem value="Cyclone">Cyclone</SelectItem>
                <SelectItem value="Multi-Hazard">Multi-Hazard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
                <SelectItem value="Emergency Response">Emergency Response</SelectItem>
                <SelectItem value="Community Development">Community Development</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="PPT">Presentation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="text-sm text-gray-600">
        Showing {filteredResources.length} of {resources.length} resources
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredResources.map((resource) => {
          const FormatIcon = getFormatIcon(resource.format);
          
          return (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${getFormatColor(resource.format)}`}>
                    <FormatIcon className="h-7 w-7" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{resource.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {resource.description}
                        </p>
                      </div>
                      <Badge className={getCategoryColor(resource.category)}>
                        {resource.category}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {resource.year}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {resource.uploadedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {resource.downloads} downloads
                      </span>
                      <span>{resource.size}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="text-xs">
                        {resource.hazardType}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {resource.sector}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {resource.region}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleDownload(resource.title)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePreview(resource.title)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}