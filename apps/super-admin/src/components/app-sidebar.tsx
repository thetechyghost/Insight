import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Settings,
  ScrollText,
  Flag,
  Dumbbell,
  Trophy,
  Megaphone,
  Shield,
  Key,
  Plug,
  Scale,
  FileText,
  UserCheck,
  ShieldAlert,
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
import { getStoredAuth, clearAuth } from "@/lib/auth";

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
    label: "Content",
    items: [
      { title: "Exercises", url: "/exercises", icon: Dumbbell },
      { title: "Benchmarks", url: "/benchmarks", icon: Trophy },
      { title: "Announcements", url: "/announcements", icon: Megaphone },
      { title: "Moderation", url: "/moderation", icon: ShieldAlert },
    ],
  },
  {
    label: "Compliance",
    items: [
      { title: "Data Requests", url: "/compliance", icon: Scale },
      { title: "Legal Documents", url: "/compliance/legal-documents", icon: FileText },
      { title: "Age Verification", url: "/compliance/age-verification", icon: UserCheck },
    ],
  },
  {
    label: "Security",
    items: [
      { title: "Events", url: "/security", icon: Shield },
      { title: "API Keys", url: "/security/api-keys", icon: Key },
    ],
  },
  {
    label: "Integrations",
    items: [
      { title: "Connections", url: "/integrations", icon: Plug },
    ],
  },
  {
    label: "Platform",
    items: [
      { title: "Feature Flags", url: "/feature-flags", icon: Flag },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const auth = getStoredAuth();
  const email = auth?.email ?? "unknown";
  const name = email.split("@")[0].split("+")[0]; // e.g. "alice" from "alice+t-xxx@test.insight.app"

  function handleLogout() {
    clearAuth();
    window.location.href = "/login";
  }

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
        <NavUser name={name} email={email} onLogout={handleLogout} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
