import { Button } from "@/components/ui/button";
import React from "react";

export function Step1RoleSelect({ roles, selectedRole, setSelectedRole, nextStep }: {
  roles: { name: string, icon: React.ElementType }[];
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  nextStep: () => void;
}) {
  return (
    <>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-3xl font-bold">Bienvenido/a</h1>
          <p className="text-muted-foreground text-balance">Comencemos por conocer un poco sobre ti.</p>
          <p className="text-md text-center">Selecciona tu rol principal</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {roles.map(({ name, icon: Icon }) => (
            <Button
              variant="outline"
              type="button"
              className={`py-6 text-base flex-col h-auto items-center justify-center gap-2 transition-all ${
                selectedRole === name
                  ? 'bg-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : 'bg-card hover:bg-muted '
              }`}
              onClick={() => setSelectedRole(name)}
              key={name}
            >
              <Icon className="w-6 h-6 mb-1" />
              {name}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          className="w-full py-3 text-base h-12"
          onClick={nextStep}
          disabled={!selectedRole}
        >
        Siguiente
        </Button>
      </div>

    </>
  );
} 