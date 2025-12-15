import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MessageSquare,
  Star,
  MessageCircle,
  Calendar,
  Clock,
  TrendingUp,
  FileEdit,
  UserCheck,
  LogOut,
  Mail,
  Megaphone,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

const teamLeaderNavItems: NavItem[] = [
  { path: "/team-leader/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/team-leader/team", label: "My Team", icon: Users },
  { path: "/team-leader/tasks", label: "Team Tasks", icon: CheckSquare },
  { path: "/team-leader/messages", label: "Messages", icon: MessageSquare },
  { path: "/team-leader/ratings", label: "Team Ratings", icon: Star },
  { path: "/team-leader/feedback", label: "Team Feedback", icon: MessageCircle },
  { path: "/team-leader/leave-requests", label: "My Leave Requests", icon: Calendar },
  { path: "/team-leader/leaves", label: "Leave Approval", icon: Calendar },
  { path: "/team-leader/corrections", label: "Correction Requests", icon: FileEdit },
  { path: "/team-leader/attendance", label: "My Attendance", icon: UserCheck },
  { path: "/team-leader/attendance-monitor", label: "Team Attendance", icon: Clock },
  { path: "/team-leader/attendance-reports", label: "Attendance Reports", icon: TrendingUp },
];

export function TeamLeaderSidebar() {
  const [location] = useLocation();
  const { user, signOut, loggingOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.displayName?.[0] || "T"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{user?.displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <p className="text-xs font-medium text-primary">Team Leader</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Team Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teamLeaderNavItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.path}
                        data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t space-y-2">
        <ThemeToggle />
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
          disabled={loggingOut}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
