import { createFileRoute } from '@tanstack/react-router'
import { ApplicationDetail } from '@/features/applications/detail'

export const Route = createFileRoute('/_authenticated/applications/$applicationId')({ component: ApplicationDetail })
