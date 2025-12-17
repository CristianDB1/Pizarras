'use client'
import { FaHome, FaUserCircle } from "react-icons/fa"
import { PiPasswordFill } from "react-icons/pi"
import { useForm } from "react-hook-form"
import useSession from "@/hook/useSession"
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { useState } from "react"
import { error } from "../alerts/menu/Alerts"
import updateInfo from "../validation/updateInfo"
import Image from 'next/image';

const LoginAdmin = () => {
    const { loginAdmin, getUserData } = useSession()
    const userData = getUserData()
    const router = useRouter()
    const [isloading, setLoading] = useState(false)
    
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm()

    const enviarDatos = async (dataUser) => {
        setLoading(true)
        
        try {
            //console.log('🚀 Enviando datos de login:', dataUser)
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataUser)
            }
            
            const response = await fetch("/api/login/admin", options)
            const data = await response.json()
            
            //console.log('📥 Respuesta del servidor:', data)
            
            if (!response.ok) {
                throw new Error(data.error || 'Error en la autenticación')
            }
            
            // PASO 1: Verificar datos recibidos
            if (!data || data.length === 0) {
                //console.log('❌ No hay datos en la respuesta')
                Swal.fire({
                    position: 'top-center',
                    title: 'Error',
                    text: 'Usuario o contraseña incorrectos',
                    icon: 'error',
                    showConfirmButton: false,
                    timer: 2500
                })
                setLoading(false)
                return
            }

            const usuario = data[0]
            //console.log('📋 Usuario recibido:', usuario)
            
            // Validar que tenga los campos necesarios
            if (!usuario.rol) {
                console.error('❌ Error: usuario no tiene campo rol', usuario)
                Swal.fire({
                    title: 'Error',
                    text: 'Datos de usuario incompletos',
                    icon: 'error'
                })
                setLoading(false)
                return
            }
            
            // PASO 2: Guardar sesión INMEDIATAMENTE
            //console.log('💾 Guardando sesión con loginAdmin...')
            loginAdmin(usuario)
            
            // PASO 3: Verificar que se guardó correctamente
            /*console.log('🔍 Verificando localStorage:')
            console.log('logged:', localStorage.getItem('logged'))
            console.log('userType:', localStorage.getItem('userType'))
            console.log('userData:', localStorage.getItem('userData'))*/
            
            // PASO 4: Pequeño delay para asegurar persistencia
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // PASO 5: Verificar hora (si es necesario)
            let time = usuario.requestTime?.indexOf('T') > 0 
                ? usuario.requestTime.split('T')[1].split('.')[0] 
                : usuario.requestTime || ''
            let hour = time ? parseInt(time.split(':')[0]) : 12
            
            const verificarHora = false // Cambia a true si necesitas verificar hora

            if (!verificarHora || (hour < 18 && hour >= 0)) {
                //console.log('✅ Autenticación exitosa, redirigiendo...')
                
                // PASO 6: Redirigir según rol - CORREGIDO
                if (usuario.rol === 'superadmin') {
                    //console.log('👑 Redirigiendo a superadmin dashboard')
                    router.push('/superadmin/dashboard')
                } else if (usuario.rol === 'admin_colegio') {
                    if (usuario.colegio_id) {
                        //console.log('🏫 Redirigiendo a dashboard del colegio:', usuario.colegio_id)
                        router.push(`/colegio/${usuario.colegio_id}/admin/dashboard`)
                    } else {
                        //console.log('⚠️ Admin colegio sin colegio_id')
                        Swal.fire({
                            title: 'Error',
                            text: 'No tienes un colegio asignado',
                            icon: 'error'
                        })
                    }
                } else {
                    // Si llega aquí, es un rol no reconocido
                    //console.log(`❌ Rol no reconocido: ${usuario.rol}, redirigiendo a home`)
                    router.push('/')
                }
            } else {
                //console.log('⏰ Hora no permitida')
                error()
            }
            
        } catch (err) {
            console.error('❌ Error en login:', err)
            Swal.fire({
                position: 'top-center',
                title: 'Error',
                text: err.message || 'Usuario o contraseña incorrectos',
                icon: 'error',
                showConfirmButton: false,
                timer: 2500
            })
        } finally {
            setLoading(false)
        }
    }

    if (isloading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="relative w-32 h-32">
                    <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500"></div>
                    <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                        <span className="text-white text-sm">Cargando...</span>
                    </div>
                </div>
            </div>
        )
    }

    const goToMenu = () => {
        if (userData && userData.Idvendedor) {
            updateInfo(userData.Idvendedor).then(() => {
                router.push('/menu')
            })
        } else {
            router.push('/')
        }
    }

    return (
        <form onSubmit={handleSubmit(enviarDatos)} className="max-w-sm mx-auto w-full">
            <div className="flex flex-col items-center justify-center -mt-10 mb-6">
                <div className="relative w-64 h-64 mb-1">
                    <Image
                        src="/Logo_tu_sorteo_digital.png"
                        alt="Logo TU SORTEO DIGITAL"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <p className="text-gray-300 text-sm mt-1">Panel Administrativo</p>
            </div>
            
            <div className="relative z-0 w-full px-8 mb-5 group">
                <div className="relative mb-6">
                    <input 
                        {...register("user", { 
                            required: "Usuario es requerido",
                            minLength: {
                                value: 3,
                                message: "Usuario debe tener al menos 3 caracteres"
                            }
                        })} 
                        className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 relative pl-12" 
                        placeholder="Usuario" 
                    />
                    <FaUserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 text-gray-500" />
                    {errors.user && (
                        <p className="text-red-500 text-xs mt-1">{errors.user.message}</p>
                    )}
                </div>
                
                <div className="relative">
                    <input 
                        {...register("pass", { 
                            required: "Contraseña es requerida",
                            minLength: {
                                value: 4,
                                message: "Contraseña debe tener al menos 4 caracteres"
                            }
                        })} 
                        type="password" 
                        className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 pl-12" 
                        placeholder="Contraseña" 
                    />
                    <PiPasswordFill className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 text-gray-500" />
                    {errors.pass && (
                        <p className="text-red-500 text-xs mt-1">{errors.pass.message}</p>
                    )}
                </div>
            </div>
            
            <div className="relative z-0 px-8">
                <button 
                    type="submit" 
                    className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center"
                    disabled={isloading}
                >
                    {isloading ? 'Verificando...' : 'Ingresar'}
                </button>
            </div>
            
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-400">
                    Acceso para Super Admin y Administradores de Colegio
                </p>
            </div>

            <button
                type="button"
                onClick={goToMenu}
                className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center rounded-full w-[60px] h-[60px] text-3xl hover:bg-red-800"
            >
                <FaHome />
            </button>
        </form>
    )
}

export default LoginAdmin