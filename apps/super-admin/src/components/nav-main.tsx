import { type LucideIcon } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton className="opacity-40 cursor-not-allowed">
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Coming soon</TooltipContent>
                  </Tooltip>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath.startsWith(item.url)}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
