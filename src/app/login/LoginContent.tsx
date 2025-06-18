import React from 'react';
import { LoginForm } from '@/app/login/login-form/login-form';
import { AuthLogo } from '@/app/auth-components/AuthLogo';
import { extractAuthParams, buildAuthRedirectUrl } from '@/app/auth-components/auth-utils';
import type { AuthParams } from '@/app/auth-components/auth-types';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function LoginContent() {
  const searchParams = useSearchParams();
  const { invitacionCode, role }: AuthParams = extractAuthParams(searchParams);

  const signupHref = buildAuthRedirectUrl('/signup', invitacionCode, role);

  return (
    <div className="flex items-center h-auto min-h-[97vh] w-full py-6 ">
      <div className="flex flex-col h-full w-full items-center justify-between">
        <AuthLogo />
        <LoginForm />
        <div className="flex flex-col items-center justify-center mt-8">
          <p className="text-base text-gray-600">
            ¿No tienes cuenta?
          </p>
          <Link href={signupHref} className="text-base text-blue-600 underline underline-offset-2 mt-2">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}