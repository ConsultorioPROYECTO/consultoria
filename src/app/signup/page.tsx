'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '@rutas/app/components/login-form/login-form';
import Link from 'next/link';

export default function Login() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/pages/home');
        }
    }, [user, router]);

    return (
<div className="bg-[#F9F6F1] flex flex-col lg:grid lg:grid-cols-2 gap-1 p-2 max-w-full h-screen">
    {/* Seccion 1 */}
    <div className="hidden lg:block bg-amber-200 rounded-2xl h-50 relative lg:h-auto">
        AQUI VA IMAGEN
    </div>
    {/* Seccion 2 */}
    <div className="flex items-center h-auto min-h-[97vh] w-full py-6 ">
        <div className="flex flex-col h-full w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-center text-gray-950">Consultoria Logo</h1>
        <LoginForm/>
        <div className="flex flex-col items-center justify-center">
            <p className="text-balance text-muted-foreground text-gray-500">
                Ya tienes cuenta??
            </p>
            <Link href="/login" className="text-balance text-muted-foreground underline underline-offset-2 text-gray-950">
                Inicia seccion
            </Link>
        </div>
        </div>
    </div>
</div>
    );
}
