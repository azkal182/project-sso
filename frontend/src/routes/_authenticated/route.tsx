import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { currentUser } from '@/lib/pondok-api'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const result = await currentUser()
    if (!result.user) throw redirect({ to: '/sign-in' })
    return { user: result.user }
  },
  component: AuthenticatedLayout,
})
