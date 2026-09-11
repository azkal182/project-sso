import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppWindow, ArrowRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search as GlobalSearch } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { pondokApi, type Application } from '@/lib/pondok-api'

type ApplicationForm = { code: string; name: string; description: string }
const emptyForm: ApplicationForm = { code: '', name: '', description: '' }

export function Applications() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)
  const [deleting, setDeleting] = useState<Application | null>(null)
  const [form, setForm] = useState(emptyForm)
  const applications = useQuery({ queryKey: ['applications', search], queryFn: () => pondokApi<Application[]>(`/api/applications?search=${encodeURIComponent(search)}`) })
  const save = useMutation({ mutationFn: () => pondokApi(`/api/applications${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['applications'] }); setOpen(false); toast.success(editing ? 'Application updated' : 'Application created') }, onError: (error: Error) => toast.error(error.message || 'Unable to save application') })
  const remove = useMutation({ mutationFn: () => pondokApi(`/api/applications/${deleting?.id}`, { method: 'DELETE' }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['applications'] }); setDeleting(null); toast.success('Application deleted') }, onError: (error: Error) => toast.error(error.message || 'Unable to delete application') })
  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (app: Application) => { setEditing(app); setForm({ code: app.code, name: app.name, description: app.description || '' }); setOpen(true) }

  return <>
    <Header><GlobalSearch /><ThemeSwitch /></Header>
    <Main>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><p className='text-sm font-medium text-primary'>Platform catalog</p><h1 className='text-2xl font-bold tracking-tight'>Applications</h1><p className='text-muted-foreground'>Manage applications, OAuth clients, roles, and delegated access.</p></div><Button onClick={openCreate}><Plus className='me-2 size-4' />Create application</Button></div>
      <div className='mb-4 flex max-w-sm items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search applications...' /></div>
      {applications.isLoading ? <p className='py-10 text-center text-sm text-muted-foreground'>Loading applications…</p> : applications.isError ? <p className='py-10 text-center text-sm text-destructive'>Unable to load applications.</p> : <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>{(applications.data || []).map((app) => <Card key={app.id} className='flex flex-col'><CardHeader><div className='flex items-start justify-between gap-3'><div className='flex items-center gap-3'><div className='rounded-lg bg-primary/10 p-2 text-primary'><AppWindow className='size-5' /></div><div><CardTitle className='text-base'>{app.name}</CardTitle><CardDescription>{app.code}</CardDescription></div></div><Badge variant={app.status === 'active' ? 'default' : 'secondary'}>{app.status}</Badge></div></CardHeader><CardContent className='flex flex-1 flex-col'><p className='min-h-12 text-sm text-muted-foreground'>{app.description || 'No description provided.'}</p><div className='mt-5 flex flex-wrap gap-2'><Button asChild size='sm'><Link to='/applications/$applicationId' params={{ applicationId: app.id }}>Manage <ArrowRight className='ms-2 size-4' /></Link></Button><Button size='sm' variant='outline' onClick={() => openEdit(app)}><Pencil className='me-2 size-4' />Edit</Button><Button size='sm' variant='ghost' className='text-destructive' onClick={() => setDeleting(app)}><Trash2 className='size-4' /></Button></div></CardContent></Card>)}</div>}
      {!applications.isLoading && !applications.data?.length && <div className='rounded-lg border border-dashed p-12 text-center'><AppWindow className='mx-auto mb-3 size-8 text-muted-foreground' /><p className='font-medium'>No applications found</p><p className='mt-1 text-sm text-muted-foreground'>Create the first application to start managing access.</p></div>}
    </Main>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit application' : 'Create application'}</DialogTitle><DialogDescription>Application codes are stable identifiers used by integrations.</DialogDescription></DialogHeader><form id='application-form' className='grid gap-4' onSubmit={(event) => { event.preventDefault(); save.mutate() }}><div className='grid gap-2'><Label htmlFor='app-code'>Code</Label><Input id='app-code' placeholder='finance-portal' value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required disabled={Boolean(editing)} /></div><div className='grid gap-2'><Label htmlFor='app-name'>Name</Label><Input id='app-name' placeholder='Finance Portal' value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></div><div className='grid gap-2'><Label htmlFor='app-description'>Description</Label><Input id='app-description' placeholder='What is this application for?' value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div></form><DialogFooter><Button variant='outline' onClick={() => setOpen(false)}>Cancel</Button><Button type='submit' form='application-form' disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create application'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.name}?</DialogTitle><DialogDescription>This deletes the application mapping and its related access configuration.</DialogDescription></DialogHeader><DialogFooter><Button variant='outline' onClick={() => setDeleting(null)}>Cancel</Button><Button variant='destructive' onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? 'Deleting…' : 'Delete application'}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
