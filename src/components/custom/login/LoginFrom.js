'use client'
import { FaUserCircle } from "react-icons/fa";
import { PiPasswordFill } from "react-icons/pi";
import { useForm } from "react-hook-form"
import useSession from "@/hook/useSession";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { useState } from "react";
import { FaShieldAlt } from "react-icons/fa";
import Image from 'next/image';

const LoginForm = () => {
  const { login } = useSession();
  const router = useRouter();
  const [isloading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
  } = useForm();

  // Función para redirigir al login de administración
  const goToAdminLogin = () => {
    router.push('/loginAdmin'); 
  };

  const enviarDatos = async (dataUser) => {
    setLoading(true)
    
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataUser)
      }
      
      const response = await fetch("/api/login", options)
      const data = await response.json()
      
      processData(data)
      
    } catch (error) {
      console.error('Error en login:', error)
      Swal.fire({
        position: 'top-center',
        title: 'Error',
        text: 'Error de conexión con el servidor',
        icon: 'error',
        showConfirmButton: false,
        timer: 2500
      })
      setLoading(false)
    }
  }

  const processData = (data) => {
    //console.log('🔧 Procesando datos del login...', data)
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      //console.log('❌ No hay datos o array vacío')
      Swal.fire({
        title: 'Error',
        text: 'Usuario o contraseña incorrectos',
        icon: 'error',
        showConfirmButton: true,
        confirmButtonText: 'OK'
      })
      setLoading(false)
      return;
    }

    const userData = Array.isArray(data) ? data[0] : data;
    //console.log('👤 Datos del usuario:', userData)
    
    let rol = 'vendedor';
    
    if (userData.rol) {
      rol = userData.rol;
    } else if (userData.sucursal === "Loteria") {
      rol = 'staff';
    }
    
    //console.log('🎭 Rol determinado:', rol)

    const estatus = userData.Estatus || userData.estatus;
    
    if (estatus === 'baja' || estatus === 'inactivo') {
      //console.log('❌ Usuario inactivo')
      Swal.fire({
        title: 'Error',
        text: 'Usuario bloqueado por el administrador',
        icon: 'error',
        showConfirmButton: true,
        confirmButtonText: 'OK'
      })
      setLoading(false)
      return;
    }

    if (estatus === 'suspendido') {
      //console.log('❌ Usuario suspendido')
      Swal.fire({
        title: 'Cuenta suspendida',
        html: `
          <div style="font-size:18px; font-weight:bold; color:#b91c1c;">
            🚫 Usuario suspendido
          </div>
          <div style="margin-top:10px; font-size:14px; color:#444;">
            Tu cuenta ha sido suspendida.<br/>
            Contacta con el administrador para más información.
          </div>
        `,
        background: '#fff3f3',   
        iconHtml: '⛔',             
        customClass: {
          icon: 'no-border'        
        },
        showConfirmButton: true,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b91c1c',
      });
      setLoading(false);
      return;
    }

    const formattedUserData = {
      id_vendedor: userData.id_vendedor || userData.id,
      nombre: userData.Nombre || userData.nombre,
      usuario: userData.usuario,
      rol: rol,
      comision: userData.comision || 0,
      estatus: estatus,
      Estatus: estatus,
      colegio_id: userData.colegio_id,
      Puntos: userData.Puntos || 0,
      sucursal: userData.sucursal,
      mensaje: userData.mensaje
    };

    //console.log('💾 Datos formateados:', formattedUserData)

    //console.log('🔄 Ejecutando login()...')
    login(formattedUserData)
    
    //console.log('🔄 Redirigiendo a /menu...')
    router.push('/menu')
    
    setLoading(false)
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
    );
  }

  return (
    <div className="max-w-sm mx-auto w-full">
      <form onSubmit={handleSubmit(enviarDatos)} className="w-full">
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
          <p className="text-gray-300 text-sm mt-1">Sistema de Gestión</p>
        </div>
        <div className="relative z-0 w-full px-8 mb-5 group">
          <div className="relative">
            <input 
              {...register("user", { required: true })} 
              className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 relative pl-12" 
              placeholder="Usuario" 
              required 
            />
            <FaUserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 text-gray-500" />
          </div>
          <div className="relative mt-6">
            <input 
              {...register("pass", { required: true })} 
              type="password" 
              className="block py-2.5 px-0 w-full text-sm text-white bg-transparent border-0 border-b-2 border-gray-300 appearance-none focus:outline-none focus:ring-0 pl-12" 
              placeholder="Contraseña" 
              required 
            />
            <PiPasswordFill className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 text-gray-500" />
          </div>
        </div>
        <div className="relative z-0 px-8 mb-4">
          <button 
            type="submit" 
            className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-full px-5 py-2.5 text-center transition duration-200"
            disabled={isloading}
          >
            {isloading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
      </form>

      {/* Botón para login de administración */}
      <div className="relative z-0 px-8">
        <button 
          type="button"
          onClick={goToAdminLogin}
          className="text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-lg text-sm w-full px-5 py-2.5 text-center transition duration-200 flex items-center justify-center gap-2"
        >
          <FaShieldAlt className="h-4 w-4" />
          <span>Acceso Administración</span>
        </button>
        <p className="text-gray-400 text-xs text-center mt-2">
          Solo para administradores del sistema
        </p>
      </div>
    </div>
  );
}

export default LoginForm;