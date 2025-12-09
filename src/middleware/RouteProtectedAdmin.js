"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useSession from "@/hook/useSession";

export default function RouteProtectedAdmin({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const session = useSession();

    useEffect(() => {
        if (!session.isLoggedIn()) {
            router.push("/loginAdmin");
            return;
        }

        const userType = session.getUserType();
        if (!(userType === "superadmin" || userType === "admin_colegio")) {
            router.push("/loginAdmin");
            return;
        }

        // Validar colegio
        if (userType === "admin_colegio") {
            const match = pathname.match(/\/colegio\/(\d+)/);
            if (match) {
                const colegioIdURL = parseInt(match[1]);
                const colegioIdUsuario = session.getColegioId();

                if (colegioIdURL !== colegioIdUsuario) {
                    router.push(`/colegio/${colegioIdUsuario}/admin/dashboard`);
                }
            }
        }

        // Validar cookie
        const logged = document.cookie.includes("logged=true");
        if (!logged) {
            router.push("/loginAdmin");
        }
    }, [session, router, pathname]);

    return children;
}
