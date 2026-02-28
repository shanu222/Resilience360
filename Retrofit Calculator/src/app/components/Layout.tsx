import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div 
      className="flex min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: 'url(./background.png)',
        backgroundColor: '#F8FAFC'
      }}
    >
      <Sidebar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
