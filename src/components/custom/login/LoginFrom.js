'use client'
import { FaUserCircle } from "react-icons/fa";
import { PiPasswordFill } from "react-icons/pi";
import { useForm } from "react-hook-form"
import useSession from "@/hook/useSession";
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { useState } from "react";

const LoginForm = () => {
  const { login } = useSession();
  const router = useRouter();
  const [isloading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
  } = useForm();

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
    console.log('🔧 Procesando datos del login...', data)
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log('❌ No hay datos o array vacío')
      Swal.fire({
        title: 'Error',
        text: 'Usuario o contraseña incorrectos',
        icon: 'error',
        showConfirmButton: true, // Cambiado a true para debugging
        confirmButtonText: 'OK'
      })
      setLoading(false)
      return;
    }

    // Normalizar datos - manejar tanto array como objeto
    const userData = Array.isArray(data) ? data[0] : data;
    console.log('👤 Datos del usuario:', userData)
    
    // CORRECCIÓN: Definir 'rol' aquí antes de usarlo
    let rol = 'vendedor'; // Valor por defecto
    
    if (userData.rol) {
      rol = userData.rol; // Si viene el campo rol en los datos
    } else if (userData.sucursal === "Loteria") {
      rol = 'staff'; // Compatibilidad con sistema antiguo
    }
    
    console.log('🎭 Rol determinado:', rol)

    // Verificar estatus (ambas versiones por compatibilidad)
    const estatus = userData.Estatus || userData.estatus;
    
    if (estatus === 'baja' || estatus === 'inactivo') {
      console.log('❌ Usuario inactivo')
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
      console.log('❌ Usuario suspendido')
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

    // Estructurar datos para el sistema
    const formattedUserData = {
      id_vendedor: userData.id_vendedor || userData.id,
      nombre: userData.Nombre || userData.nombre,
      usuario: userData.usuario,
      rol: rol, // Usamos la variable 'rol' que definimos arriba
      comision: userData.comision || 0,
      estatus: estatus,
      Estatus: estatus, // Para compatibilidad
      colegio_id: userData.colegio_id,
      Puntos: userData.Puntos || 0,
      sucursal: userData.sucursal,
      mensaje: userData.mensaje
    };

    console.log('💾 Datos formateados:', formattedUserData)

    // Guardar sesión y redirigir
    console.log('🔄 Ejecutando login()...')
    login(formattedUserData)
    
    console.log('🔄 Redirigiendo a /menu...')
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
    <form onSubmit={handleSubmit(enviarDatos)} className="max-w-sm mx-auto w-full ">
      <div className="flex flex-col items-center justify-center -mt-10 mb-6">
        <div className="relative w-24 h-24 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 to-purple-600 rounded-full"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
              TS
            </span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white text-center">
          <span className="bg-gradient-to-r from-red-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            TU SORTEO
          </span>
        </h1>
        <p className="text-gray-300 text-sm mt-2">Sistema de Gestión</p>
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
      <div className="relative z-0 px-8 ">
        <button 
          type="submit" 
          className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-full px-5 py-2.5 text-center"
          disabled={isloading}
        >
          {isloading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </div>
    </form>
  );
}

export default LoginForm;