'use client';

import { Suspense, memo } from 'react';
import Link from 'next/link';
import { LoginContent } from './LoginContent';
import { geistFont } from '../fonts';
import { FeatureCarousel } from '../auth-components/FeatureCarousel';
import { useUserSync } from '../hooks/useUserSync';

function Login() {
    useUserSync();

    return (
        <main className={`grid lg:grid-cols-2 h-screen bg-background ${geistFont.className}`}>
            <Link href="/" className="absolute top-8 left-8 text-xl font-bold z-10">
                Irina
            </Link>
            <div className="hidden lg:block">
              <FeatureCarousel />
            </div>
            <div className="flex items-center justify-center">
                <div className='absolute inset-0 flex items-start justify-center pt-30 lg:hidden pointer-events-none'>
                    <span className="text-[10rem] font-extrabold text-foreground opacity-8 select-none">Irina</span>
                </div>
                <Suspense fallback={<div>Cargando...</div>}>
                    <LoginContent />
                </Suspense>
            </div>
        </main>
    );
}

export default memo(Login);