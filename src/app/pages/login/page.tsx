'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from '@rutas/app/components/login-form/login-form';

export default function Login() {
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/pages/home');
        }
    }, [user, router]);

    return (
<div className="bg-gray-800 grid grid-cols-2 gap-1 p-2 max-w-full h-screen">
    {/* Seccion 1 */}
    <div className="bg-pink-200 rounded-2xl">
        AQUI VA IMAGEN
    </div>
    {/* Seccion 2 */}
    <div className="bg-gray-800">
        
        <LoginForm/>
    </div>
</div>
    );
}
