import React from 'react';
import { LoginForm } from '@rutas/app/components/login-form/login-form';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export function SignupContent() {
  const searchParams = useSearchParams();
  const invitacionCode = searchParams.get('invitacionCode');
  const role = searchParams.get('role');

  let loginHref = '/login';
  if (invitacionCode || role) {
    const params = new URLSearchParams();
    if (invitacionCode) params.set('invitacionCode', invitacionCode);
    if (role) params.set('role', role);
    loginHref += `?${params.toString()}`;
  }

  return (
    <div className="flex items-center h-auto min-h-[97vh] w-full py-6 ">
      <div className="flex flex-col h-full w-full items-center justify-between">
        <h1 className="text-4xl font-light text-center text-gray-800 mb-8">Consultoria Logo</h1>
        <LoginForm isSignup={true} />
        <div className="flex flex-col items-center justify-center mt-8">
          <p className="text-base text-gray-600">
            ¿Ya tienes cuenta?
          </p>
          <Link href={loginHref} className="text-base text-blue-600 underline underline-offset-2 mt-2">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}