'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AuthImage } from '../auth-components/AuthImage';
import { SignupContent } from './SignupContent';
import { sendEmailVerification } from "firebase/auth";

function SignupPageContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const invitacionCode = searchParams.get('invitacionCode');
    const role = searchParams.get('role');


    useEffect(() => {
        if (user) {
            if (!user.emailVerified) {
                sendEmailVerification(user).then(() => {
                    alert("Te hemos enviado un correo de verificación. Por favor, verifica tu correo antes de continuar.");
                });
                // Opcional: puedes mostrar un mensaje en la UI y no redirigir hasta que el usuario verifique su correo
                return;
            }
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
                router.push('/onboard?invitacionCode=' + invitacionCode + '&role=' + role);
            };

            syncUser();
        }
    }, [user, router, invitacionCode, role]);

    return (
        <div className="bg-white flex flex-col lg:grid lg:grid-cols-2 gap-1 p-2 max-w-full h-screen">
            <AuthImage />
            <SignupContent />
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={null}>
            <SignupPageContent />
        </Suspense>
    );
}
