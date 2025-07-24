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
        <main className={`grid lg:grid-cols-2 w-full h-screen bg-background ${geistFont.className}`}>
            <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 pt-3 md:pt-3">
                <Link href="/" className="flex items-center justify-center text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground h-9">
                    Irina
                </Link>
            </nav>
            <div className="hidden lg:block">
              <FeatureCarousel />
            </div>
            <Suspense fallback={<div>Cargando...</div>}>
                <LoginContent />
            </Suspense>
        </main>
    );
}

export default memo(Login);