import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  MessageCircle, 
  Megaphone, 
  ListTodo, 
  Eye, 
  Star,
  LogOut,
  Menu,
  Calendar,
  Clock,
  History,
  FileEdit
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import BottomNav, { BottomNavItem } from "./BottomNav";
import { useState } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: any;
}

const navItems: NavItem[] = [
  { path: "/user/overview", label: "Overview", icon: LayoutDashboard },
  { path: "/user/reports", label: "Reports", icon: FileText },
  { path: "/user/messages", label: "Messages", icon: MessageSquare },
  { path: "/user/feedback", label: "Feedback", icon: MessageCircle },
  { path: "/user/tasks", label: "Assigned Tasks", icon: ListTodo },
  { path: "/user/report-view", label: "View Reports", icon: Eye },
  { path: "/user/ratings", label: "Ratings", icon: Star },
  { path: "/user/leaves", label: "Leave Management", icon: Calendar },
  { path: "/user/attendance", label: "Attendance", icon: Clock },
  { path: "/user/attendance-history", label: "Attendance History", icon: History },
  { path: "/user/correction-requests", label: "Correction Requests", icon: FileEdit },
];

const bottomNavItems: BottomNavItem[] = [
  { path: "/user/overview", label: "Home", icon: LayoutDashboard },
  { path: "/user/tasks", label: "Tasks", icon: ListTodo },
  { path: "/user/reports", label: "Reports", icon: FileText },
  { path: "/user/messages", label: "Messages", icon: MessageSquare },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, signOut, loggingOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* User Info */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{user?.displayName}</h3>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                <Link 
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-2">
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
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 border-r bg-card flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-lg">WorkLogix</h1>
          <div className="w-10" /> {/* Spacer for balance */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
            {children}
          </div>
        </div>

        {/* Bottom Navigation for Mobile */}
        <BottomNav items={bottomNavItems} />
      </main>
    </div>
  );
}
