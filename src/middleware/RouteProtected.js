import { NextResponse } from 'next/server';
import useSession from '@/hook/useSession';

export function middleware(request) {
    const session = useSession();
    const isLoggedIn = session.isLoggedIn();
    const userType = session.getUserType();
    
    // Solo permitir vendedores y staff
    if (!isLoggedIn || !(userType === 'vendedor' || userType === 'staff')) {
        // Redirigir al login principal (de vendedores)
        const loginUrl = new URL('/', request.url);
        return NextResponse.redirect(loginUrl);
    }
    
    // Verificar que vendedor acceda solo a su colegio
    const colegioIdUsuario = session.getColegioId();
    if (colegioIdUsuario) {
        const path = request.nextUrl.pathname;
        
        // Si la ruta incluye un colegio_id, verificar que coincida
        const colegioMatch = path.match(/\/colegio\/(\d+)/);
        if (colegioMatch) {
            const colegioIdEnURL = parseInt(colegioMatch[1]);
            if (colegioIdUsuario !== colegioIdEnURL) {
                // Redirigir a su propio dashboard de vendedor
                const dashboardUrl = new URL(`/colegio/${colegioIdUsuario}/vendedor/dashboard`, request.url);
                return NextResponse.redirect(dashboardUrl);
            }
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/ventas/:path*',
        '/corte-caja/:path*',
        '/boletos/:path*',
        '/menu',
        // Agrega otras rutas de vendedores aquí
    ]
};