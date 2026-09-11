import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Search, UserPlus } from 'lucide-react'
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
import { pondokApi } from '@/lib/pondok-api'

type KeycloakUser = { id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled: boolean; localStatus?: string | null }
type UserForm = { username: string; email: string; firstName: string; lastName: string; password: string; enabled: boolean }
const emptyForm: UserForm = { username: '', email: '', firstName: '', lastName: '', password: '', enabled: true }

export function Users() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editing, setEditing] = useState<KeycloakUser | null>(null)
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<KeycloakUser | null>(null)
  const users = useQuery({ queryKey: ['users', search], queryFn: () => pondokApi<KeycloakUser[]>(`/api/users?limit=100&search=${encodeURIComponent(search)}`) })
  const save = useMutation({
    mutationFn: () => pondokApi(`/api/users${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, password: form.password || undefined }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setOpen(false); toast.success(editing ? 'User updated' : 'User created') },
    onError: (error: Error) => toast.error(error.message || 'Unable to save user'),
  })
  const remove = useMutation({ mutationFn: () => pondokApi(`/api/users/${deleting?.id}`, { method: 'DELETE' }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setDeleting(null); toast.success('User deleted') }, onError: (error: Error) => toast.error(error.message || 'Unable to delete user') })
  const toggle = useMutation({ mutationFn: (user: KeycloakUser) => pondokApi(`/api/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !user.enabled }) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User status updated') }, onError: (error: Error) => toast.error(error.message || 'Unable to update status') })
  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true) }
  const openEdit = (user: KeycloakUser) => { setEditing(user); setForm({ username: user.username, email: user.email || '', firstName: user.firstName || '', lastName: user.lastName || '', password: '', enabled: user.enabled }); setOpen(true) }
  const update = (key: keyof UserForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }))

  return <>
    <Header><GlobalSearch /><ThemeSwitch /></Header>
    <Main>
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'><div><h1 className='text-2xl font-bold tracking-tight'>Users</h1><p className='text-muted-foreground'>Manage identity accounts, profile data, and access status.</p></div><Button onClick={openCreate}><UserPlus className='me-2 size-4' />Create user</Button></div>
      <Card><CardHeader><div className='flex flex-wrap items-center justify-between gap-3'><div><CardTitle>Directory</CardTitle><CardDescription>Changes are applied to Keycloak and the local account reference.</CardDescription></div><div className='relative w-full max-w-sm'><Search className='absolute start-2.5 top-2.5 size-4 text-muted-foreground' /><Input className='ps-8' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search username or email...' /></div></div></CardHeader><CardContent>
        {users.isLoading ? <p className='py-8 text-center text-sm text-muted-foreground'>Loading users…</p> : users.isError ? <p className='py-8 text-center text-sm text-destructive'>Unable to load users. Try again.</p> : <div className='overflow-x-auto'><table className='w-full text-sm'><thead><tr className='border-b text-start'><th className='p-3 text-start'>User</th><th className='p-3 text-start'>Email</th><th className='p-3 text-start'>Status</th><th className='p-3 text-start'>Identity</th><th className='p-3 text-end'>Actions</th></tr></thead><tbody>{(users.data || []).map((user) => <tr className='border-b last:border-0' key={user.id}><td className='p-3'><div className='font-medium'>{user.username}</div><div className='text-xs text-muted-foreground'>{[user.firstName, user.lastName].filter(Boolean).join(' ') || 'No display name'}</div></td><td className='p-3'>{user.email || '—'}</td><td className='p-3'><Badge variant={user.enabled ? 'default' : 'secondary'}>{user.enabled ? 'Enabled' : 'Disabled'}</Badge></td><td className='p-3 text-muted-foreground'>{user.localStatus || 'Not mapped locally'}</td><td className='p-3 text-end'><div className='flex justify-end gap-2'><Button size='sm' variant='outline' onClick={() => openEdit(user)}>Edit</Button><Button size='sm' variant='ghost' onClick={() => toggle.mutate(user)} disabled={toggle.isPending}>{user.enabled ? 'Disable' : 'Enable'}</Button><Button size='sm' variant='ghost' className='text-destructive' onClick={() => setDeleting(user)}><MoreHorizontal className='size-4' /></Button></div></td></tr>)}</tbody></table>{!users.data?.length && <div className='py-10 text-center text-sm text-muted-foreground'>No users match your search.</div>}</div>}
      </CardContent></Card>
    </Main>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? 'Edit user' : 'Create user'}</DialogTitle><DialogDescription>{editing ? 'Update profile and account status.' : 'Create a Keycloak identity and local account reference.'}</DialogDescription></DialogHeader><form id='user-form' className='grid gap-4' onSubmit={(event) => { event.preventDefault(); save.mutate() }}><div className='grid gap-2'><Label htmlFor='username'>Username</Label><Input id='username' value={form.username} onChange={(event) => update('username', event.target.value)} required disabled={Boolean(editing)} /></div><div className='grid gap-2'><Label htmlFor='email'>Email</Label><Input id='email' type='email' value={form.email} onChange={(event) => update('email', event.target.value)} /></div><div className='grid grid-cols-2 gap-3'><div className='grid gap-2'><Label htmlFor='firstName'>First name</Label><Input id='firstName' value={form.firstName} onChange={(event) => update('firstName', event.target.value)} /></div><div className='grid gap-2'><Label htmlFor='lastName'>Last name</Label><Input id='lastName' value={form.lastName} onChange={(event) => update('lastName', event.target.value)} /></div></div>{!editing && <div className='grid gap-2'><Label htmlFor='password'>Initial password <span className='text-muted-foreground'>(optional, minimum 12 characters)</span></Label><Input id='password' type='password' value={form.password} onChange={(event) => update('password', event.target.value)} /></div>}<label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} /> Account enabled</label></form><DialogFooter><Button variant='outline' onClick={() => setOpen(false)}>Cancel</Button><Button type='submit' form='user-form' disabled={save.isPending}>{save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.username}?</DialogTitle><DialogDescription>This permanently removes the Keycloak identity and its local reference. This action cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant='outline' onClick={() => setDeleting(null)}>Cancel</Button><Button variant='destructive' onClick={() => remove.mutate()} disabled={remove.isPending}>{remove.isPending ? 'Deleting…' : 'Delete user'}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
