import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@rutas/components/ui/input-otp";
import React from "react";
import { getFirebaseAuthToken } from "@lib/firebase/clientUtils";

export function Step2ConsultorioOrInvitacion({
  selectedRole,
  nameConsultorio,
  setNameConsultorio,
  invitationCode,
  setInvitationCode,
  nextStep
}: {
  selectedRole: string;
  nameConsultorio: string;
  setNameConsultorio: (v: string) => void;
  invitationCode: string;
  setInvitationCode: (v: string) => void;
  nextStep: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {selectedRole === "Admin" ? (
        <>
          <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12">
            <h1 className="text-3xl font-bold">Configura tu Consultorio</h1>
            <p className="text-muted-foreground text-balance">
              Ingresa el nombre de tu consultorio u organización.
            </p>
          </div>
          <div className="flex justify-center items-center gap-2 mt-4">
            <Label htmlFor="nameConsultorio" className="text-md sr-only">Nombre del Consultorio</Label>
            <Input
              id="nameConsultorio"
              type="text"
              placeholder="Ej: Clínica Bienestar Total"
              value={nameConsultorio}
              onChange={e => setNameConsultorio(e.target.value)}
              className="py-3 text-base text-center"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12">
            <h1 className="text-3xl font-bold">Unirse a una Organización</h1>
            <p className="text-muted-foreground text-balance">
              Ingresa el código de invitación que te proporcionaron.
            </p>
          </div>
          <div className="flex justify-center items-center gap-3 mt-4">
            <Label htmlFor="invitationCode" className="text-md sr-only">Código de Invitación</Label>
            <InputOTP
              maxLength={6}
              value={invitationCode}
              onChange={setInvitationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </>
      )}
      <div className="w-full mt-4">
        <Button
          type="button"
          className="w-full py-3 text-base"
          onClick={async () => {
            if (selectedRole === "Admin") {
              const token = await getFirebaseAuthToken();
              if (!token) {
                alert("No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.");
                return;
              }
              try {
                const response = await fetch("/api/organization", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                  },
                  body: JSON.stringify({ organizationName: nameConsultorio})
                });
                const data = await response.json();
                if (!response.ok) {
                  alert(data.error || "Error al crear la organización.");
                  return;
                }
                nextStep();
              } catch (error) {
                console.error("Error:", error);
                alert("Error de red al crear la organización.");
              }
            } else {
              nextStep();
            }
          }}
          disabled={selectedRole === "Admin" ? !nameConsultorio : !invitationCode}
        >
          {selectedRole === "Admin" ? "Siguiente" : "Unirse y Finalizar"}
        </Button>
      </div>
    </div>
  );
}