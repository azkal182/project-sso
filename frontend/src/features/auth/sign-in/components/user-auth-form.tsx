import { useState } from 'react'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { keycloakLogin } from '@/lib/pondok-api'

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> { redirectTo?: string }

export function UserAuthForm({ className, redirectTo: _redirectTo, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  return (
    <form
      onSubmit={(event) => { event.preventDefault(); setIsLoading(true); keycloakLogin() }}
      className={cn('grid gap-4', className)}
      {...props}
    >
      <div className='rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground'>
        <ShieldCheck className='mb-2 size-5 text-primary' />
        Authentication is handled securely by the Pondok Keycloak identity provider.
      </div>
      <Button className='mt-2' disabled={isLoading} type='submit'>
        {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
        Continue with Keycloak
      </Button>
    </form>
  )
}
