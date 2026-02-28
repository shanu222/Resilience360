import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div 
      className="flex min-h-screen flex-col lg:flex-row bg-cover bg-center bg-no-repeat lg:bg-fixed"
      style={{
        backgroundImage: 'url(./background.png)',
        backgroundColor: '#F8FAFC'
      }}
    >
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
