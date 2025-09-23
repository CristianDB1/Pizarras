'use client'
import { useRouter } from "next/navigation";
import { IoTicketSharp } from "react-icons/io5";
import { ImStatsDots } from "react-icons/im";
import { FaClover } from "react-icons/fa6";
import { FaHome } from "react-icons/fa";
import Swal from "sweetalert2";


export default function MenuOnline(){
    const router = useRouter();

    const handleTypeDrawOnline = () => {
        router.push("/typeDrawOnline");
    }

    const handleWinnerSraffleOnline = () => {
        router.push("");
    }

    const goToWelcomeBoletosOnline = () => {
        router.push("/welcomeOnline")
    };

    return(
        <div className="w-full bg-[rgb(38,38,38)]">
            <div className="w-full flex justify-center items-center text-2xl pt-6 pb-2">
                <FaClover className="h-10 mr-2 text-green-700" />
                <label className="text-[#FFF113]">El Trebol De La Suerte</label>
            </div>
            <div className="w-full flex flex-col space-y-6 pt-6 px-10 ">
                <div className="relative">
                    <button className="w-full rounded-lg bg-red-700 text-white text-2xl  h-[66px] relative" onClick={handleTypeDrawOnline}>
                        Boletos
                        <IoTicketSharp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                    </button>
                </div>
                <div className="relative">
                    <button
                        onClick={() => handleWinnerSraffleOnline()}
                        className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative">
                        Resultados
                        <ImStatsDots className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10"/>   
                    </button>
                </div>
            </div>
            <button
            onClick={goToWelcomeBoletosOnline}
            className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center rounded-full w-[70px] h-[70px] text-3xl">
                <FaHome/>
            </button>
        </div>
    );
}
