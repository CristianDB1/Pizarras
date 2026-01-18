'use client'
import { Suspense } from 'react';
import WinnerSraffle from "@/components/custom/winnerSraffle/winnerStra/WinnerSraffle";
import RouteProtectedWinner from "@/middleware/RouteProtectedWinner"

// Esto evita que Next.js intente prerenderizar esta página
export const dynamic = 'force-dynamic';

const WinningSraffle = () => {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-[rgb(38,38,38)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    }>
      <RouteProtectedWinner>
        <div className="w-full h-screen bg-[rgb(38,38,38)]">
          <WinnerSraffle />
        </div>
      </RouteProtectedWinner>
    </Suspense>
  );
}

export default WinningSraffle;