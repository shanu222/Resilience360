import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Upload,
  Brain,
  Calculator,
  FileText,
  Database,
  Users,
  Truck,
  AlertTriangle,
  FileBarChart,
  Settings as SettingsIcon,
  Menu,
  X,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { AIAssistant } from "./AIAssistant";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/upload", label: "Upload Drawings", icon: Upload },
  { path: "/ai-takeoff", label: "AI Quantity Takeoff", icon: Brain },
  { path: "/cost-estimation", label: "Cost Estimation", icon: Calculator },
  { path: "/boq", label: "Bill of Quantities (BOQ)", icon: FileText },
  { path: "/materials", label: "Materials Database", icon: Database },
  { path: "/labor", label: "Labor Cost Database", icon: Users },
  { path: "/equipment", label: "Equipment Cost", icon: Truck },
  { path: "/risk-analysis", label: "Risk Analysis", icon: AlertTriangle },
  { path: "/reports", label: "Reports", icon: FileBarChart },
  { path: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold">AI Construction</h1>
                <p className="text-xs text-muted-foreground">Cost Estimator</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <input
                type="search"
                placeholder="Search projects..."
                className="w-64 px-4 py-2 rounded-lg bg-input-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <span className="text-sm">JD</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Assistant Panel */}
      <AIAssistant open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
