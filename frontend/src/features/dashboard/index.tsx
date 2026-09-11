import { useQuery } from '@tanstack/react-query'
import { Activity, AppWindow, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { pondokApi, type Application } from '@/lib/pondok-api'

export function Dashboard() {
  const users = useQuery({ queryKey: ['users'], queryFn: () => pondokApi<unknown[]>('/api/users') })
  const applications = useQuery({ queryKey: ['applications'], queryFn: () => pondokApi<Application[]>('/api/applications') })
  const cards = [{ title: 'Directory users', value: users.data?.length ?? '—', icon: Users }, { title: 'Applications', value: applications.data?.length ?? '—', icon: AppWindow }, { title: 'Platform status', value: 'Healthy', icon: Activity }]
  return <><Header><Search /><ThemeSwitch /></Header><Main><div className='mb-6'><p className='text-sm font-medium text-primary'>Pondok Identity Platform</p><h1 className='text-2xl font-bold tracking-tight'>Account Management</h1><p className='text-muted-foreground'>A secure overview of your identity platform.</p></div><div className='grid gap-4 md:grid-cols-3'>{cards.map(({ title, value, icon: Icon }) => <Card key={title}><CardHeader className='flex flex-row items-center justify-between pb-2'><CardTitle className='text-sm font-medium'>{title}</CardTitle><Icon className='size-4 text-muted-foreground' /></CardHeader><CardContent><div className='text-2xl font-bold'>{value}</div></CardContent></Card>)}</div><Card className='mt-6'><CardHeader><CardTitle className='flex items-center gap-2'><ShieldCheck className='size-5 text-primary' />Operational posture</CardTitle></CardHeader><CardContent className='flex flex-wrap gap-2'><Badge>OIDC active</Badge><Badge>PostgreSQL persistence</Badge><Badge>Server-side authorization</Badge><Badge>Keycloak service account</Badge></CardContent></Card></Main></>
}
