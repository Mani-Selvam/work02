import { LayoutDashboard, CheckSquare, Users, FileText, Archive, MessageSquare, Star } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Dashboard",
    url: "#dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Tasks",
    url: "#tasks",
    icon: CheckSquare,
  },
  {
    title: "Users",
    url: "#users",
    icon: Users,
  },
  {
    title: "Reports",
    url: "#reports",
    icon: FileText,
  },
  {
    title: "Messages",
    url: "#messages",
    icon: MessageSquare,
  },
  {
    title: "Ratings",
    url: "#ratings",
    icon: Star,
  },
  {
    title: "Archive",
    url: "#archive",
    icon: Archive,
  },
];

export default function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-4 py-4">
            WorkLogix Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`nav-${item.title.toLowerCase()}`}>
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
