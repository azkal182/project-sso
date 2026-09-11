import { useLayout } from '@/context/layout-provider'
import { useQuery } from '@tanstack/react-query'
import { currentUser } from '@/lib/pondok-api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { data } = useQuery({ queryKey: ['me'], queryFn: currentUser })
  const user = data?.user
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user?.displayName || user?.username || sidebarData.user.name, email: user?.email || sidebarData.user.email, avatar: sidebarData.user.avatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
