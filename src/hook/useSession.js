'use client'
import { useState, useEffect, useCallback } from 'react'

const useSession = () => {
    const [isClient, setIsClient] = useState(false)
    
    useEffect(() => {
        setIsClient(true)
    }, [])

    const isBrowser = typeof window !== 'undefined'

    const login = useCallback((userData) => {
        console.log('🔄 useSession.login() ejecutándose con:', userData);
        
        if (isBrowser) {
            // CORRECCIÓN: Verificar estatus (ambas versiones por compatibilidad)
            const estatus = userData.estatus || userData.Estatus;
            console.log('📋 Estatus del usuario:', estatus);
            
            if (estatus === 'activo') {
                console.log('✅ Usuario activo, guardando sesión...');
                localStorage.setItem('logged', 'true');
                
                // Determinar userType basado en rol
                let userType = 'vendedor'; // Por defecto
                if (userData.rol === 'staff') {
                    userType = 'staff';
                } else if (userData.rol === 'vendedor') {
                    userType = 'vendedor';
                }
                
                localStorage.setItem('userType', userType);
                localStorage.setItem('userData', JSON.stringify(userData));
                
                console.log('💾 Sesión guardada:', {
                    logged: 'true',
                    userType: userType,
                    userData: userData
                });
            } else {
                console.log('❌ Usuario no activo, limpiando sesión...');
                localStorage.setItem('logged', 'false');
                localStorage.removeItem('userData');
                localStorage.removeItem('userType');
            }
        }
    }, [isBrowser])

    const loginAdmin = useCallback((userData) => {
        console.log('🔄 useSession.loginAdmin() ejecutándose');
        if (isBrowser) {
            localStorage.setItem('logged', 'true');
            localStorage.setItem('userType', userData.rol || 'admin');
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userDataAdmin', JSON.stringify(userData));
        }
    }, [isBrowser])

    const loginWinner = useCallback((userData) => {
        console.log('🔄 useSession.loginWinner() ejecutándose');
        if (isBrowser) {
            localStorage.setItem('logged', 'true');
            localStorage.setItem('userType', 'winner');
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userDataWinner', JSON.stringify(userData));
        }
    }, [isBrowser])

    const logout = useCallback(() => {
        console.log('🔄 useSession.logout() ejecutándose');
        if (isBrowser) {
            localStorage.clear();
            console.log('✅ Sesión limpiada');
        }
    }, [isBrowser])

    const getUserData = useCallback(() => {
        if (isBrowser) {
            const userData = localStorage.getItem('userData');
            const parsed = userData ? JSON.parse(userData) : null;
            console.log('📋 getUserData():', parsed);
            return parsed;
        }
        return null;
    }, [isBrowser])

    const getUserName = useCallback(() => {
        if (isBrowser) {
            const userData = getUserData();
            return userData?.nombre || userData?.usuario || '';
        }
        return '';
    }, [isBrowser, getUserData])

    const getUserType = useCallback(() => {
        if (isBrowser) {
            const userType = localStorage.getItem('userType');
            console.log('📋 getUserType():', userType);
            return userType;
        }
        return null;
    }, [isBrowser])

    const isLoggedIn = useCallback(() => {
        if (isBrowser) {
            const logged = localStorage.getItem('logged') === 'true';
            console.log('📋 isLoggedIn():', logged);
            return logged;
        }
        return false;
    }, [isBrowser])

    const isSuperAdmin = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('userType') === 'superadmin';
        }
        return false;
    }, [isBrowser])

    const isAdminColegio = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('userType') === 'admin_colegio';
        }
        return false;
    }, [isBrowser])

    const isVendedor = useCallback(() => {
        if (isBrowser) {
            const userType = localStorage.getItem('userType');
            return userType === 'vendedor' || userType === 'staff';
        }
        return false;
    }, [isBrowser])

    const getColegioId = useCallback(() => {
        const userData = getUserData();
        return userData?.colegio_id || null;
    }, [getUserData])

    return { 
        isClient,
        login, 
        logout, 
        getUserData, 
        getUserName,
        loginAdmin, 
        loginWinner,
        getUserType,
        isLoggedIn,
        isSuperAdmin,
        isAdminColegio,
        isVendedor,
        getColegioId
    }
}

export default useSession;