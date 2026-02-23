import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  GraduationCap, 
  Award, 
  BookOpen, 
  ClipboardCheck, 
  BarChart3, 
  Building2, 
  Settings,
  User,
  Clock,
  Menu,
  Shield,
  LogOut,
  Library,
  FolderOpen
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/training", label: "Training Programs", icon: GraduationCap },
  { path: "/my-courses", label: "My Courses", icon: FolderOpen, traineeOnly: true },
  { path: "/certification", label: "Certification", icon: Award },
  { path: "/knowledge", label: "Knowledge Repository", icon: Library },
  { path: "/assessments", label: "Assessments & Exams", icon: ClipboardCheck },
  { path: "/analytics", label: "Progress & Analytics", icon: BarChart3 },
  { path: "/admin", label: "Institutions & Partners", icon: Building2, adminOnly: true },
  { path: "/admin", label: "Admin / Settings", icon: Settings, adminOnly: true },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-PK', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Karachi',
    }) + ' PKT';
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const navItem = navigationItems.find(item => item.path === currentPath);
      breadcrumbs.push({
        label: navItem?.label || path.charAt(0).toUpperCase() + path.slice(1),
        path: currentPath,
      });
    });
    
    return breadcrumbs;
  };

  // Filter navigation based on role
  const filteredNavigation = navigationItems.filter(item => {
    if (item.adminOnly) {
      return user.role === "admin";
    }
    if (item.traineeOnly) {
      return user.role === "trainee";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded flex items-center justify-center">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    NDMA Knowledge, Training & Certification Portal
                  </h1>
                  <p className="text-sm text-gray-600">
                    National Disaster Management Authority, Pakistan
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatTime(currentTime)}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className={`w-8 h-8 ${user.role === "admin" ? "bg-purple-100" : "bg-blue-100"} rounded-full flex items-center justify-center`}>
                      <User className={`h-4 w-4 ${user.role === "admin" ? "text-purple-700" : "text-blue-700"}`} />
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Breadcrumbs */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            {getBreadcrumbs().map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                <Link 
                  to={crumb.path}
                  className={index === getBreadcrumbs().length - 1 ? "text-gray-900 font-medium" : "hover:text-gray-900"}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} lg:w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)] transition-all duration-300 overflow-hidden`}>
          <nav className="p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path + item.label}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}