import { Bug, FileX, LayoutDashboard, Lock, Package, Palette, ServerOff, Settings, Users } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: { name: 'Pondok Administrator', email: 'admin@pondok.local', avatar: '/avatars/shadcn.jpg' },
  teams: [{ name: 'Pondok Identity Platform', logo: LayoutDashboard, plan: 'Account Management' }],
  navGroups: [
    { title: 'Platform', items: [{ title: 'Dashboard', url: '/', icon: LayoutDashboard }, { title: 'Applications', url: '/applications', icon: Package }, { title: 'Users', url: '/users', icon: Users }] },
    { title: 'System', items: [{ title: 'Settings', icon: Settings, items: [{ title: 'Profile', url: '/settings' }, { title: 'Account', url: '/settings/account' }, { title: 'Appearance', url: '/settings/appearance', icon: Palette }, { title: 'Notifications', url: '/settings/notifications' }, { title: 'Display', url: '/settings/display' }] }, { title: 'Errors', icon: Bug, items: [{ title: 'Unauthorized', url: '/errors/unauthorized', icon: Lock }, { title: 'Forbidden', url: '/errors/forbidden' }, { title: 'Not Found', url: '/errors/not-found', icon: FileX }, { title: 'Internal Server Error', url: '/errors/internal-server-error', icon: ServerOff }] }] },
  ],
}
