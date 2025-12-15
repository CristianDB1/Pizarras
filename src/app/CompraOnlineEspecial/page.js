'use client'
import { useSearchParams } from "next/navigation";
import CompraOnlineEspecial from '@/components/custom/compraOnline/CompraOnlineEspecial';

export default function CompraOnlineEspecialPage() {
  const searchParams = useSearchParams();
  const colegioId = searchParams.get('colegio');
  
  return <CompraOnlineEspecial colegioId={colegioId} />;
}