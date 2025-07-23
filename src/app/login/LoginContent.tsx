
import React, { useState } from 'react';
import { LoginForm } from '@/app/login/login-form/login-form';
import { Button } from "@/components/ui/button";
import { extractAuthParams, buildAuthRedirectUrl } from '@/app/auth-components/auth-utils';
import type { AuthParams } from '@/app/auth-components/auth-types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import LoginGoogle from '@/app/components/auth/LoginButtonGoogle';

export function LoginContent() {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const searchParams = useSearchParams();
  const { invitacionCode, role }: AuthParams = extractAuthParams(searchParams);

  const signupHref = buildAuthRedirectUrl('/signup', invitacionCode, role);

  return (
    <div className="flex flex-col h-screen items-center justify-center">
      <div className="flex flex-col gap-4 justify-end md:justify-center w-full max-w-sm flex-grow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
          <p className="text-muted-foreground">
            Ingresa tus credenciales para acceder a tu cuenta.
          </p>
        </div>
        {showLoginForm ? (
          <LoginForm />
        ) : (
          <div className="flex flex-col gap-4 w-full">
            <Button className="w-full h-12 text-base" onClick={() => setShowLoginForm(true)}>
              Continuar con Email
            </Button>
            <div className="relative hidden lg:flex items-center">
              <div className="flex-grow border-t border-muted-foreground"></div>
              <span className="flex-shrink mx-4 font-light text-sm text-muted-foreground">O CONTINUAR CON</span>
              <div className="flex-grow border-t border-muted-foreground"></div>
            </div>
            <LoginGoogle />
          </div>
        )}
              <div className="text-center text-muted-foreground text-sm pb-8">
        ¿No tienes cuenta?{' '}
        <Link href={signupHref} className="underline">
          Regístrate
        </Link>
      </div>
      </div>

    </div>
  );
}
