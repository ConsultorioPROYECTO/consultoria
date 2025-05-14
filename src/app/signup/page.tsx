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
            const syncUser = async () => {
                try {
                    // Extraer los datos relevantes del objeto user de Firebase
                    // Asegúrate de que estos campos coincidan con lo que esperas de Firebase Auth
                    const userData = {
                        firebaseUid: user.uid,
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
                        console.error('Error al sincronizar usuario tras registro:', errorData.details || response.statusText);
                        // Opcional: manejar el error en la UI
                    } else {
                        const successData = await response.json();
                        console.log('Usuario sincronizado tras registro:', successData.message);
                    }
                } catch (error) {
                    console.error('Error en la llamada de sincronización tras registro:', error);
                }
                // Redirigir independientemente del resultado de la sincronización
                router.push('/dashboard');
            };

            syncUser();
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
        <LoginForm isSignup={true} />
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
