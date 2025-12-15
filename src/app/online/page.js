// app/online/page.js - VERSIÓN CORREGIDA
'use client'
import { Suspense } from "react";
import OnlineHome from "@/components/custom/online/OnlineHome";

// Componente que SOLO renderiza, NO usa hooks
function OnlinePageContent({ colegioId, colegio, loadingColegio }) {
  return (
    <div className="w-full min-h-screen bg-[rgb(38,38,38)]">
      {/* Header del colegio */}
      {colegioId && (
        <div className="bg-white shadow-lg">
          <div className="max-w-6xl mx-auto p-4 flex items-center justify-center space-x-4">
            {colegio?.logo_url && (
              <img 
                src={colegio.logo_url} 
                alt={colegio.nombre}
                className="h-16 w-16 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold text-gray-800">
              {colegio?.nombre || `Colegio ${colegioId}`}
            </h1>
          </div>
        </div>
      )}
      
      {/* Spinner mientras carga */}
      {colegioId && loadingColegio && (
        <div className="bg-white shadow-lg py-4">
          <div className="max-w-6xl mx-auto flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-center p-6">
        <OnlineHome colegioId={colegioId} />
      </div>
    </div>
  );
}

// Componente que SÍ puede usar useSearchParams() porque está DENTRO de Suspense
function OnlinePageWithParams() {
  // Este componente NO puede existir directamente, debe estar envuelto
  return null;
}

// Loading component
function LoadingFallback() {
  return (
    <div className="w-full min-h-screen bg-[rgb(38,38,38)] flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
    </div>
  );
}

// Página principal - SEGUNDA OPCIÓN MÁS SIMPLE
export default function OnlinePage() {
  return (
    <div className="w-full min-h-screen bg-[rgb(38,38,38)]">
      {/* El header del colegio lo manejamos en OnlineHome */}
      <div className="flex items-center justify-center p-6">
        <Suspense fallback={<LoadingFallback />}>
          <OnlineHome />
        </Suspense>
      </div>
    </div>
  );
}