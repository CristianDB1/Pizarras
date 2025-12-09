'use client'
import SuperAdminColegioDetalle from '@/components/custom/dashboard/SuperAdminColegioDetalle'
import { useParams } from 'next/navigation'

export default function ColegioDetallePage() {
    const params = useParams()
    const colegioId = params.id
    
    return <SuperAdminColegioDetalle colegioId={colegioId} />
}