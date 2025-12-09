"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import useSession from "@/hook/useSession";

export default function RouteProtected({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const session = useSession();

    useEffect(() => {
        if (!session.isLoggedIn()) {
            router.push("/");
            return;
        }

        const userType = session.getUserType();
        if (!(userType === "vendedor" || userType === "staff")) {
            router.push("/");
            return;
        }

        // Validar colegio
        const colegioIdUsuario = session.getColegioId();
        const match = pathname.match(/\/colegio\/(\d+)/);

        if (match) {
            const colegioIdURL = parseInt(match[1]);
            if (colegioIdURL !== colegioIdUsuario) {
                router.push(`/colegio/${colegioIdUsuario}/vendedor/dashboard`);
            }
        }
    }, [session, router, pathname]);

    return children;
}
