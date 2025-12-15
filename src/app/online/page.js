// app/online/page.js
'use client'
import OnlineHome from "@/components/custom/online/OnlineHome";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function OnlinePage() {
  const searchParams = useSearchParams();
  const colegioId = searchParams.get('colegio');
  const [colegio, setColegio] = useState(null);
  const [loadingColegio, setLoadingColegio] = useState(true);

  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) {
        setLoadingColegio(false);
        return;
      }
      
      try {
        setLoadingColegio(true);
        // Usando TU endpoint que ya tienes
        const response = await fetch(`/api/colegios/${colegioId}`);
        
        if (!response.ok) {
          throw new Error('Colegio no encontrado');
        }
        
        const data = await response.json();
        setColegio(data);
      } catch (error) {
        console.error("Error cargando colegio:", error);
        setColegio(null);
      } finally {
        setLoadingColegio(false);
      }
    };

    fetchColegio();
  }, [colegioId]);

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