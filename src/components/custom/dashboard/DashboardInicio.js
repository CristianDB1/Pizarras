'use client'
export default function DashboardInicio({ colegioId }) {
    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Principal</h1>
                <p className="text-gray-600">Estadísticas y resumen del colegio</p>
            </div>
            {/* Aquí irán las estadísticas */}
        </div>
    );
}