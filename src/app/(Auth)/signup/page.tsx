'use client';

import { Suspense, memo } from 'react';
import Link from 'next/link';
import { SignupContent } from './_components/SignupContent';
import dynamic from 'next/dynamic';
import { useSignupSync } from '../../../hooks/useSignupSync';
import { useIsMobile } from '@/hooks/use-mobile';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

const FeatureCarousel = dynamic(() => import('../_components/FeatureCarousel').then(mod => mod.FeatureCarousel), { ssr: false });

function SignupPageContent() {
    useSignupSync();
    const isMobile = useIsMobile();
    
    // Componente de loading centralizado
    const LoadingSpinner = () => (
        <div className="flex h-dvh flex-col items-center justify-center">
            <WaveformLoader className="w-24 h-auto text-muted-foreground" />
        </div>
    );

    return (
        <div className="flex flex-col h-dvh bg-background">
            <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 h-16">
                <Link href="/" className="text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground">
                    Irina 
                </Link>
            </nav>
            <main className="flex-grow grid lg:grid-cols-2 w-full overflow-hidden">
                {!isMobile && (
                    <div className="hidden lg:block">
                        <FeatureCarousel />
                    </div>
                )}
                <div className="flex flex-col flex-grow overflow-hidden">
                    <Suspense fallback={<LoadingSpinner />}>
                        <SignupContent />
                    </Suspense>
                </div>
            </main>
        </div>
    );
}

export default memo(function SignupPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <SignupPageContent />
        </Suspense>
    );
});
