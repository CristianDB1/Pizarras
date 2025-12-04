'use client'
import { useState, useEffect, useCallback } from 'react'

const useSession = () => {
    const [isClient, setIsClient] = useState(false)
    
    useEffect(() => {
        setIsClient(true)
    }, [])

    const isBrowser = typeof window !== 'undefined'

    const login = useCallback((userData) => {
        if (isBrowser) {
            if (userData.Estatus === 'activo') {
                localStorage.setItem('logged', 'true')
                localStorage.setItem('userType', 'vendedor')
                localStorage.setItem('userData', JSON.stringify(userData))
            } else {
                localStorage.setItem('logged', 'false')
                localStorage.removeItem('userData')
                localStorage.removeItem('userType')
            }
        }
    }, [isBrowser])

    const loginAdmin = useCallback((userData) => {
        if (isBrowser) {
            localStorage.setItem('logged', 'true')
            localStorage.setItem('userType', userData.rol)
            localStorage.setItem('userData', JSON.stringify(userData))
            localStorage.setItem('userDataAdmin', JSON.stringify(userData))
        }
    }, [isBrowser])

    const loginWinner = useCallback((userData) => {
        if (isBrowser) {
            localStorage.setItem('logged', 'true')
            localStorage.setItem('userType', 'winner')
            localStorage.setItem('userData', JSON.stringify(userData))
            localStorage.setItem('userDataWinner', JSON.stringify(userData))
        }
    }, [isBrowser])

    const logout = useCallback(() => {
        if (isBrowser) {
            localStorage.clear()
        }
    }, [isBrowser])

    const getUserData = useCallback(() => {
        if (isBrowser) {
            const userData = localStorage.getItem('userData')
            return userData ? JSON.parse(userData) : null
        }
        return null
    }, [isBrowser])

    // AGREGAR ESTA FUNCIÓN NUEVA
    const getUserName = useCallback(() => {
        if (isBrowser) {
            const userData = getUserData()
            return userData?.nombre || userData?.usuario || ''
        }
        return ''
    }, [isBrowser, getUserData])

    const getUserType = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('userType')
        }
        return null
    }, [isBrowser])

    const isLoggedIn = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('logged') === 'true'
        }
        return false
    }, [isBrowser])

    const isSuperAdmin = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('userType') === 'superadmin'
        }
        return false
    }, [isBrowser])

    const isAdminColegio = useCallback(() => {
        if (isBrowser) {
            return localStorage.getItem('userType') === 'admin_colegio'
        }
        return false
    }, [isBrowser])

    const isVendedor = useCallback(() => {
        if (isBrowser) {
            const userType = localStorage.getItem('userType')
            return userType === 'vendedor' || userType === 'staff'
        }
        return false
    }, [isBrowser])

    const getColegioId = useCallback(() => {
        const userData = getUserData()
        return userData?.colegio_id || null
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

export default useSession