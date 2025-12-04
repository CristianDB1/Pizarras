import { NextResponse } from 'next/server';
import useSession from '@/hook/useSession';

export function middleware(request) {
    console.log('🛡️ Middleware RouteProtectedAdmin ejecutándose para:', request.nextUrl.pathname)
    const session = useSession();
    const isLoggedIn = session.isLoggedIn();
    const userType = session.getUserType();
    
    // Verificar que esté logueado y sea admin
    if (!isLoggedIn || !(userType === 'superadmin' || userType === 'admin_colegio')) {
        // Redirigir al login de administradores
        const loginUrl = new URL('/loginAdmin', request.url);
        return NextResponse.redirect(loginUrl);
    }
    
    // Si es admin_colegio, verificar que solo acceda a su colegio
    if (userType === 'admin_colegio') {
        const path = request.nextUrl.pathname;
        
        // Extraer colegio_id de la URL si está en una ruta de colegio
        const colegioMatch = path.match(/\/colegio\/(\d+)/);
        if (colegioMatch) {
            const colegioIdEnURL = parseInt(colegioMatch[1]);
            const colegioIdUsuario = session.getColegioId();
            
            if (colegioIdUsuario !== colegioIdEnURL) {
                // Redirigir a su propio dashboard
                const dashboardUrl = new URL(`/colegio/${colegioIdUsuario}/admin/dashboard`, request.url);
                return NextResponse.redirect(dashboardUrl);
            }
        }
    }

    const logged = request.cookies.get('logged')?.value
    console.log('🍪 Cookie logged:', logged)
    
    // Si no está logueado, redirigir
    if (!logged || logged !== 'true') {
        console.log('❌ No autenticado, redirigiendo a /loginAdmin')
        const loginUrl = new URL('/loginAdmin', request.url)
        return NextResponse.redirect(loginUrl)
    }

    console.log('✅ Middleware pasado')
    
    return NextResponse.next();
}

// Configurar en qué rutas aplicar este middleware
export const config = {
    matcher: [
        '/admin/:path*',
        '/superadmin/:path*',
        '/colegio/:path*', // Aplica a todas las rutas de colegio
        '/boxcut',
        '/configuracion/:path*'
    ]
};