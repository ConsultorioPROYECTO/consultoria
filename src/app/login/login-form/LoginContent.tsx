
import React, { useState } from 'react';
import { LoginForm } from '@/app/login/login-form/login-form';
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerFooter,
  DrawerClose,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
    <div className="flex flex-col h-full w-full items-center justify-center px-4">

      <div className="flex flex-col gap-4 justify-center max-w-sm">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
          <p className="text-muted-foreground">
            Ingresa tus credenciales para acceder a tu cuenta.
          </p>
        </div>
        <div className="flex flex-col gap-4 w-full">
          {/* Desktop Login Form */}
          <div className="hidden lg:block">
            <LoginForm />
          </div>

          {/* Mobile Drawer for Login Form */}
          <div className="lg:hidden">
            <Drawer open={showLoginForm} onOpenChange={setShowLoginForm}>
              <DrawerTrigger asChild>
                <Button className="w-full h-12 text-base">Continuar con Email</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Iniciar Sesión con Email</DrawerTitle>
                  <DrawerDescription>
                    Ingresa tus credenciales para acceder a tu cuenta.
                  </DrawerDescription>
                </DrawerHeader>
                <LoginForm />
                <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className='h-12'>Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>
            
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-muted-foreground"></div>
            <span className="flex-shrink mx-4 font-light text-sm text-muted-foreground">O CONTINUAR CON</span>
            <div className="flex-grow border-t border-muted-foreground"></div>
          </div>
          <LoginGoogle/>
        </div>
        <div className="text-center text-muted-foreground text-sm mt-4">
          ¿No tienes cuenta?{' '}
          <Link href={signupHref} className="underline">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
}
