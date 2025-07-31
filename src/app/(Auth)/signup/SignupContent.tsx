
import React from 'react';
import { SignupForm } from '@/app/(Auth)/signup/signup-form/signup-form';
import { extractAuthParams, buildAuthRedirectUrl } from '@/app/auth-components/auth-utils';
import type { AuthParams } from '@/app/auth-components/auth-types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function SignupContent() {
  const searchParams = useSearchParams();
  const { invitacionCode, role }: AuthParams = extractAuthParams(searchParams);

  const loginHref = buildAuthRedirectUrl('/login', invitacionCode, role);

  return (
    <div className="flex flex-col justify-center w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Crear Cuenta</h1>
        <p className="text-muted-foreground mt-2">
          Regístrate para empezar a gestionar tu clínica.
        </p>
      </div>
      <SignupForm />
      <div className="mt-4 text-center text-sm">
        ¿Ya tienes cuenta?{' '}
        <Link href={loginHref} className="underline">
          Inicia sesión
        </Link>
      </div>
    </div>
  );
}
