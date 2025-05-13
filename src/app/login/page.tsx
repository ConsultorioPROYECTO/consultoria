'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '@rutas/app/components/login-form/login-form';
import Link from 'next/link';
import Image from 'next/image';
import PhotoLogin from '../img/photologin.png';

export default function Login() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/dashboard');
        }
    }, [user, router]);

    return (
<div className="bg-[#F9F6F1] flex flex-col lg:grid lg:grid-cols-2 gap-1 p-2 max-w-full h-screen">
    {/* Seccion 1 */}
    <div className="hidden lg:block bg-[#f0e9de] rounded-2xl h-50 relative lg:h-auto overflow-hidden">
        <Image 
            src={PhotoLogin}
            alt="Login" 
            width={1200}
            height={1200}
            className='object-contain w-full h-full'
            priority
         />
    </div>
    {/* Seccion 2 */}
    <div className="flex items-center h-auto min-h-[97vh] w-full py-6 ">
        <div className="flex flex-col h-full w-full items-center justify-between">
        <h1 className="text-3xl font-bold text-center text-gray-950">Consultoria Logo</h1>
        <LoginForm/>
        <div className="flex flex-col items-center justify-center">
            <p className="text-balance text-gray-500">
                No tienes una cuenta?
            </p>
            <Link href="/signup" className="text-balance text-gray-950 underline underline-offset-2">
                Registrate
            </Link>
        </div>
        </div>
    </div>
</div>
    );
}
