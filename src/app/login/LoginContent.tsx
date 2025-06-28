
import React from 'react';
import { LoginForm } from '@/app/login/login-form/login-form';
import { extractAuthParams, buildAuthRedirectUrl } from '@/app/auth-components/auth-utils';
import type { AuthParams } from '@/app/auth-components/auth-types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function LoginContent() {
  const searchParams = useSearchParams();
  const { invitacionCode, role }: AuthParams = extractAuthParams(searchParams);

  const signupHref = buildAuthRedirectUrl('/signup', invitacionCode, role);

  return (
    <div className="flex flex-col justify-center w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
        <p className="text-muted-foreground mt-2">
          Ingresa tus credenciales para acceder a tu cuenta.
        </p>
      </div>
      <LoginForm />
      <div className="mt-4 text-center text-sm">
        ¿No tienes cuenta?{' '}
        <Link href={signupHref} className="underline">
          Regístrate
        </Link>
      </div>
    </div>
  );
}
