import { Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  FileText, 
  Calculator,
  CheckCircle2,
  Activity
} from "lucide-react";
import { motion } from "motion/react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FileText, label: "Detection Result", path: "/detection" },
  { icon: Calculator, label: "Cost Breakdown", path: "/cost-breakdown" },
  { icon: CheckCircle2, label: "Final Report", path: "/final-report" },
];

export function Sidebar() {
  const location = useLocation();
  
  return (
    <div className="w-72 bg-[#0F172A] text-white flex flex-col border-r border-slate-800/50">
      <div className="p-8 border-b border-slate-800/50">
        <motion.div 
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center w-10 h-10 bg-[#2563EB] rounded-lg">
            <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white text-[19px] font-semibold tracking-tight">Retrofit Pro</h1>
            <p className="text-slate-400 text-xs font-medium">Engineering Suite</p>
          </div>
        </motion.div>
      </div>
      
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-lg shadow-blue-900/30"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  <span className="text-[15px] font-medium">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>
      
      <div className="p-6 border-t border-slate-800/50">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-slate-300 text-sm font-medium">System Status</p>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">AI Model</span>
              <span className="text-green-400 font-medium">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Database</span>
              <span className="text-green-400 font-medium">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
