'use client'
import { useRouter } from "next/navigation";

export default function WelcomeBoletosOnline(){
    const router = useRouter();

    const handleIngresar = () => {
        //Lleva a la pagina para elegir el tipo de boleto a comprar si normal o especial
        router.push("/menuOnline");
    };

    return(
        <div className="max-w-sm mx-auto w-full ">
            <div className="flex justify-center -mt-10 text-2xl text-white ">
                <img src="/noSencillo.png" alt="Logo" className="w-full h-[132px]" />
            </div>
            <div className="mb-6 text-white flex justify-center items-center">Bienvenido</div>
            <div>
                <button onClick={handleIngresar} className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-full px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800">Ingresar</button>
            </div>

        </div>


    );


}