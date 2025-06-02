'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { LoginImage } from './LoginImage';
import { LoginContent } from './LoginContent';

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
        <div className="bg-white flex flex-col lg:grid lg:grid-cols-2 gap-1 p-2 max-w-full h-screen">
            <LoginImage />
            <Suspense fallback={null}>
                <LoginContent />
            </Suspense>
        </div>
    );
}