import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  ScrollText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain, type NavGroup } from "./nav-main";
import { NavUser } from "./nav-user";

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Tenants", url: "/tenants", icon: Building2 },
      { title: "Billing", url: "/billing", icon: CreditCard, disabled: true },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings, disabled: true },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText, disabled: true },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  // DEFERRED: Replace with usePlatformAdmin() hook when Convex Auth is configured
  const user = { name: "Platform Admin", email: "admin@insight.com" };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            I
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Platform Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={user.name} email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
