'use client';

import { Suspense, memo } from 'react';
import Link from 'next/link';
import { LoginContent } from './login-form/LoginContent';
import { geistFont } from '../fonts';
import { FeatureCarousel } from '../auth-components/FeatureCarousel';
import { useUserSync } from '../hooks/useUserSync';

function Login() {
    useUserSync();

    return (
        <div className={`flex flex-col h-screen bg-background ${geistFont.className}`}>
            <nav className="flex-shrink-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 pt-3 md:pt-3">
                <Link href="/" className="flex items-center justify-center text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground h-9">
                    Irina
                </Link>
            </nav>
            <main className="flex-grow grid lg:grid-cols-2 w-full overflow-hidden">
                <div className="hidden lg:block">
                    <FeatureCarousel />
                </div>
                <div className="flex flex-col flex-grow overflow-y-auto">
                    <Suspense fallback={<div>Cargando...</div>}>
                        <LoginContent />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

export default memo(Login);