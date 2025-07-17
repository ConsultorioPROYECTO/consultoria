'use client';

import { Suspense, useEffect, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { LoginContent } from './LoginContent';
import { sendEmailVerification } from 'firebase/auth';
import { geistFont } from '../fonts';
import { FeatureCarousel } from '../auth-components/FeatureCarousel';

function Login() {
    const { user, userRole, organizationId } = useAuth();
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error al sincronizar usuario:', errorData.details || response.statusText);
                return;
            }
            
            await response.json();

            // Usar userRole y organizationId del contexto si están disponibles
            if (userRole === 'N/A' || organizationId === null) {
                router.push('/onboard');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            console.error('Error en la llamada de sincronización:', error);
            router.push('/onboard');
        }
    }, [router]);

    useEffect(() => {
        if (user) {
            syncUser(user);
        }
    }, [user, syncUser]);

    return (
        <main className={`grid lg:grid-cols-2 h-screen bg-background ${geistFont.className}`}>
            <Link href="/" className="absolute top-8 left-8 text-xl font-bold z-10">
                Irina
            </Link>
            <div className="hidden lg:block">
              <FeatureCarousel />
            </div>
            <div className="flex items-center justify-center">
              <Suspense fallback={<div>Cargando...</div>}>
                  <LoginContent />
              </Suspense>
            </div>
        </main>
    );
}

export default memo(Login);