import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Package, FileText, AlertTriangle, BarChart3, LogOut, Bot } from "lucide-react";
import { getCurrentSession, onAuthStateChanged, signOutAdmin } from "../services/authService";
import { useLiveHubData } from "../hooks/useLiveHubData";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { hubs } = useLiveHubData();
  
  const isActive = (path: string) => {
    return location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));
  };

  const handleLogout = async () => {
    await signOutAdmin();
    navigate('/login');
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const session = await getCurrentSession();
        if (!session) {
          navigate('/login');
          return;
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    void bootstrap();

    const unsubscribe = onAuthStateChanged((hasSession) => {
      if (!hasSession) {
        navigate('/login');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        Checking admin session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-600 to-blue-600 p-2 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-600">Material Hub Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                View Public Portal
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-1">
            <Link
              to="/admin"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin') && location.pathname === '/admin'
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              to="/admin/inventory"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/inventory')
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="h-5 w-5" />
              <span>Inventory Management</span>
            </Link>
            
            <Link
              to="/admin/issuance"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/issuance')
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span>Issuance Workflow</span>
            </Link>
            
            <Link
              to="/admin/damage"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/damage')
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
              <span>Damage Monitoring</span>
            </Link>
            
            <Link
              to="/admin/analytics"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/analytics')
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Analytics</span>
            </Link>

            <Link
              to="/admin/ai-agent"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/admin/ai-agent')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bot className="h-5 w-5" />
              <span>AI Agent</span>
            </Link>
          </nav>

          <div className="p-4 mt-8 border-t border-gray-200">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-emerald-900 mb-2">Quick Stats</p>
              <div className="space-y-2 text-xs text-emerald-700">
                <div className="flex justify-between">
                  <span>Total Hubs:</span>
                  <span className="font-bold">{hubs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Requests:</span>
                  <span className="font-bold">12</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Stock:</span>
                  <span className="font-bold">71%</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
