
import React, { useState } from 'react';
import { SignupForm } from '@/app/(Auth)/signup/_components/signup-form';
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

export function SignupContent() {
  const [showSignupForm, setShowSignupForm] = useState(false);
  const searchParams = useSearchParams();
  const { invitacionCode, role }: AuthParams = extractAuthParams(searchParams);

  const loginHref = buildAuthRedirectUrl('/login', invitacionCode, role);

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex flex-col flex-1 justify-end md:justify-center items-center w-full gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Crear Cuenta</h1>
          <p className="text-muted-foreground">
            Regístrate para empezar a gestionar tu clínica.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          {/* Desktop Signup Form */}
          <div className="hidden lg:block">
            <SignupForm />
          </div>

          {/* Mobile Drawer for Signup Form */}
          <div className="lg:hidden">
            <Drawer open={showSignupForm} onOpenChange={setShowSignupForm}>
              <DrawerTrigger asChild>
                <Button className="w-full h-12 text-base">Continuar con Email</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Crear Cuenta con Email</DrawerTitle>
                  <DrawerDescription>
                    Regístrate para empezar a gestionar tu clínica.
                  </DrawerDescription>
                </DrawerHeader>
                <SignupForm />
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
          <LoginGoogle />
        </div>
        <div className="text-center text-muted-foreground text-sm">
          ¿Ya tienes cuenta?{' '}
          <Link href={loginHref} className="underline">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
