'use client';

import { Suspense, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AuthImage } from '../auth-components/AuthImage';
import { LoginContent } from './LoginContent';
import { sendEmailVerification } from 'firebase/auth';

function Login() {
    const { user } = useAuth();
    const router = useRouter();
    const syncUser = useCallback(async (currentUser: typeof user) => {
        if (!currentUser) return;
        
        if (!currentUser.emailVerified) {
            try {
                await sendEmailVerification(currentUser);
                alert('Te hemos enviado un correo de verificación. Por favor, verifica tu correo antes de continuar.');
            } catch (error) {
                console.error('Error al enviar correo de verificación:', error);
            }
            return;
        }
        try {
            // Extraer los datos relevantes del objeto user de Firebase
            const userData = {
                firebaseUid: currentUser.uid,
                email: currentUser.email,
                emailVerified: currentUser.emailVerified,
                phoneNumber: currentUser.phoneNumber,
                displayName: currentUser.displayName,
                photoURL: currentUser.photoURL,
                providerId: currentUser.providerData?.[0]?.providerId || 'password',
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
                return;
            }
            
            const successData = await response.json();
            console.log('Usuario sincronizado:', successData.message);

            // Verificar el rol del usuario después de la sincronización
            const token = await currentUser.getIdToken();
            const roleResponse = await fetch('/api/users/rol', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (roleResponse.ok) {
                const roleData = await roleResponse.json();
                // Si el rol es N/A o no tiene organización, redirigir al onboard
                if (roleData.role === 'N/A' || roleData.organizationId === null) {
                    router.push('/onboard');
                } else {
                    // Si tiene un rol válido y organización, redirigir al dashboard
                    router.push('/dashboard');
                }
            } else {
                console.error('Error al obtener el rol del usuario');
                // En caso de error, redirigir al onboard por seguridad
                router.push('/onboard');
            }
        } catch (error) {
            console.error('Error en la llamada de sincronización:', error);
            // En caso de error, redirigir al onboard por seguridad
            router.push('/onboard');
        }
    }, [router]);

    useEffect(() => {
        if (user) {
            syncUser(user);
        }
    }, [user, syncUser]);

    // No mostrar pantalla de carga completa, solo el spinner en el botón

    return (
        <div className="bg-white flex flex-col lg:grid lg:grid-cols-2 gap-1 p-2 max-w-full h-screen">
            <AuthImage />
            <Suspense fallback={null}>
                <LoginContent />
            </Suspense>
        </div>
    );
}

export default memo(Login);