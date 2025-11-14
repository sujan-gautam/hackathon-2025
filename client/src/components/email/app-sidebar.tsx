import { Mail, Inbox, Send, Clock, Settings, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "All Emails",
    url: "/",
    icon: Inbox,
  },
  {
    title: "Unread",
    url: "/unread",
    icon: Mail,
  },
  {
    title: "Pending Review",
    url: "/pending",
    icon: Clock,
  },
  {
    title: "Sent",
    url: "/sent",
    icon: Send,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar data-testid="sidebar-navigation">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2" data-testid="logo-header">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Email AI</h1>
            <p className="text-xs text-muted-foreground">Smart Automation</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wide">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Processed Today</span>
                <span className="text-sm font-semibold" data-testid="stat-processed">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Pending</span>
                <span className="text-sm font-semibold" data-testid="stat-pending">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <SidebarMenuButton asChild data-testid="nav-settings">
          <Link href="/settings">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
