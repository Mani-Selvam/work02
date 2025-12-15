import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { TeamLeaderSidebar } from "@/components/TeamLeaderSidebar";
import BottomNav, { BottomNavItem } from "./BottomNav";
import { LayoutDashboard, Users, CheckSquare, MessageSquare } from "lucide-react";

const teamLeaderBottomNavItems: BottomNavItem[] = [
  { path: "/team-leader/dashboard", label: "Home", icon: LayoutDashboard },
  { path: "/team-leader/team", label: "Team", icon: Users },
  { path: "/team-leader/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/team-leader/messages", label: "Messages", icon: MessageSquare },
];

export default function TeamLeaderLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <TeamLeaderSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b md:hidden">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <h1 className="font-semibold text-lg">Team Leader Portal</h1>
            <div className="w-10" />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
              {children}
            </div>
          </main>
          <BottomNav items={teamLeaderBottomNavItems} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
