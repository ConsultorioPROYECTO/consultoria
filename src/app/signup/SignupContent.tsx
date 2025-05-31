import React from 'react';
import { LoginForm } from '@rutas/app/components/login-form/login-form';
import Link from 'next/link';

export function SignupContent() {
  return (
    <div className="flex items-center h-auto min-h-[97vh] w-full py-6 ">
      <div className="flex flex-col h-full w-full items-center justify-between">
        <h1 className="text-4xl font-light text-center text-gray-800 mb-8">Consultoria Logo</h1>
        <LoginForm isSignup={true} />
        <div className="flex flex-col items-center justify-center mt-8">
          <p className="text-base text-gray-600">
            ¿Ya tienes cuenta?
          </p>
          <Link href="/login" className="text-base text-blue-600 underline underline-offset-2 mt-2">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}