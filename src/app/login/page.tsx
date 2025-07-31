'use client';

import { Suspense, memo } from 'react';
import Link from 'next/link';
import { LoginContent } from './login-form/LoginContent';
import dynamic from 'next/dynamic';
import { useUserSync } from '../hooks/useUserSync';
import { useIsMobile } from '@/hooks/use-mobile';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

const FeatureCarousel = dynamic(() => import('../auth-components/FeatureCarousel').then(mod => mod.FeatureCarousel), { ssr: false });

function Login() {
    useUserSync();
    const isMobile = useIsMobile();
    // Componente de loading centralizado
    const LoadingSpinner = () => (
    <div className="flex h-dvh flex-col items-center justify-center">
        <WaveformLoader className="w-24 h-auto text-muted-foreground" />
    </div>
    );


    return (
        <div className="flex flex-col h-dvh bg-background">
            <nav className="flex-shrink-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 pt-3 md:pt-3">
                <Link href="/" className="flex items-center justify-center text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground h-9">
                    Irina
                </Link>
            </nav>
            <main className="flex-grow grid lg:grid-cols-2 w-full overflow-hidden">
                {!isMobile && (
                    <div className="hidden lg:block">
                        <FeatureCarousel />
                    </div>
                )}
                <div className="flex flex-col flex-grow overflow-y-auto">
                    <Suspense fallback={<LoadingSpinner />}>
                        <LoginContent />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

export default memo(Login);