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
            const syncUser = async () => {
                try {
                    // Extraer los datos relevantes del objeto user de Firebase
                    // Asegúrate de que estos campos coincidan con lo que esperas de Firebase Auth
                    const userData = {
                        firebaseUid: user.uid, // Asumiendo que user.uid es el firebaseUid
                        email: user.email,
                        emailVerified: user.emailVerified,
                        phoneNumber: user.phoneNumber,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        providerId: user.providerData?.[0]?.providerId || 'password', // O el primer providerId disponible
                    };

                    const response = await fetch('/api/auth/sync-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(userData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Error al sincronizar usuario:', errorData.details || response.statusText);
                        // Opcional: manejar el error en la UI, por ejemplo, no redirigir o mostrar un mensaje
                    } else {
                        const successData = await response.json();
                        console.log('Usuario sincronizado:', successData.message);
                    }
                } catch (error) {
                    console.error('Error en la llamada de sincronización:', error);
                }
                // Redirigir independientemente del resultado de la sincronización (o decidir según el caso de uso)
                router.push('/dashboard');
            };

            syncUser();
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
