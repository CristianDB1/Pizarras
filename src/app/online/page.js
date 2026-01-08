// app/online/page.js - VERSIÓN SIMPLE
'use client'
import { Suspense } from "react";
import OnlineHome from "@/components/custom/online/OnlineHome";

// Loading component
function LoadingFallback() {
  return (
    <div className="w-full min-h-screen bg-[rgb(38,38,38)] flex items-center justify-center p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
    </div>
  );
}

// Página principal
export default function OnlinePage() {
  return (
    <div className="w-full min-h-screen bg-[rgb(38,38,38)]">
      <Suspense fallback={<LoadingFallback />}>
        <OnlineHome />
      </Suspense>
    </div>
  );
}