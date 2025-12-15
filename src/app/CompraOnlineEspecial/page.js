'use client'
import { Suspense } from "react";
import CompraOnlineEspecial from '@/components/custom/compraOnline/CompraOnlineEspecial';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
    </div>
  );
}

export default function CompraOnlineEspecialPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompraOnlineEspecial />
    </Suspense>
  );
}