'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { SignupContent } from './SignupContent';
import { sendEmailVerification } from "firebase/auth";
import { geistFont } from '../fonts';
import { FeatureCarousel } from '../auth-components/FeatureCarousel';

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
                return;
            }
            const syncUser = async () => {
                try {
                    const userData = {
                        firebaseUid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        phoneNumber: user.phoneNumber,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        providerId: user.providerData?.[0]?.providerId || 'password',
                    };

                    const response = await fetch('/api/auth/sync-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Error al sincronizar usuario tras registro:', errorData.details || response.statusText);
                    } else {
                        await response.json();
                    }
                } catch (error) {
                    console.error('Error en la llamada de sincronización tras registro:', error);
                }
                
                const onboardUrl = new URL('/onboard', window.location.origin);
                if (invitacionCode) onboardUrl.searchParams.append('invitacionCode', invitacionCode);
                if (role) onboardUrl.searchParams.append('role', role);
                router.push(onboardUrl.toString());
            };

            syncUser();
        }
    }, [user, router, invitacionCode, role]);

    return (
        <main className={`grid lg:grid-cols-2 h-screen bg-background ${geistFont.className}`}>
            <Link href="/" className="absolute top-8 left-8 text-xl font-bold z-10">
                Irina
            </Link>
            <div className="hidden lg:block">
              <FeatureCarousel />
            </div>
            <div className="flex items-center justify-center">
                <SignupContent />
            </div>
        </main>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SignupPageContent />
        </Suspense>
    );
}
