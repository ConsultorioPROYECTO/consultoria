import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@rutas/components/ui/input-otp";
import React from "react";
import { getAuthTokenAndEmail } from "@lib/firebase/clientUtils";
import { useRouter } from "next/navigation";

interface AdminSetupProps {
  nameConsultorio: string;
  setNameConsultorio: (v: string) => void;
  nextStep: () => void;
}

interface JoinOrganizationProps {
  invitationCode: string;
  setInvitationCode: (v: string) => void;
  nextStep: () => void;
  selectedRole: string;
}

function AdminSetup({ nameConsultorio, setNameConsultorio, nextStep }: AdminSetupProps) {
  const handleValidateAndProceed = () => {
    if (!nameConsultorio.trim()) {
      alert("Por favor, ingresa el nombre del consultorio.");
      return;
    }
    // Solo validar y avanzar al siguiente paso
    // La creación de la organización se hará en el paso 3 después de seleccionar el plan
    nextStep();
  };

  return (
    <>
      <div className="flex flex-col items-center text-center gap-2">
        <h1 className="text-3xl font-bold">Configura tu Consultorio</h1>
        <p className="text-muted-foreground text-balance">
          Ingresa el nombre de tu consultorio u organización.
        </p>
      </div>
      <div className="flex justify-center items-center gap-2">
        <Label htmlFor="nameConsultorio" className="text-md sr-only">Nombre del Consultorio</Label>
        <Input
          id="nameConsultorio"
          type="text"
          placeholder="Ej: Clínica Bienestar Total"
          value={nameConsultorio}
          onChange={e => setNameConsultorio(e.target.value)}
          className="py-3 text-base text-center h-12"
        />
      </div>
      <div className="w-full">
        <Button
          type="button"
          className="w-full py-3 text-base h-12"
          onClick={handleValidateAndProceed}
          disabled={!nameConsultorio}
        >
          Siguiente
        </Button>
      </div>
    </>
  );
}

function JoinOrganization({ invitationCode, setInvitationCode, selectedRole, nextStep }: JoinOrganizationProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleJoinOrganization = async () => {
    if (!invitationCode || invitationCode.length !== 6) {
      alert("Por favor, ingresa un código de invitación válido de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    
    try {
      const { token, email } = await getAuthTokenAndEmail();
      
      if (!token) {
        alert("No se pudo obtener el token de autenticación. Por favor, inicia sesión nuevamente.");
        setIsLoading(false);
        return;
      }

      if (!email) {
        alert("No se pudo obtener el email del usuario. Por favor, verifica tu cuenta.");
        setIsLoading(false);
        return;
      }

      // Primero intentamos unirse directamente (si ya tiene una invitación aprobada)
      const joinResponse = await fetch("/api/organization/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          invitationCode: invitationCode,
          role: selectedRole.toLowerCase()
        })
      });

      const joinData = await joinResponse.json();

      if (joinResponse.ok) {
        alert("¡Te has unido exitosamente a la organización!");
        // Avanzar al siguiente paso en lugar de ir directamente al dashboard
        nextStep();
        return;
      }

      // Si no puede unirse directamente, crear una solicitud de invitación
      if (joinResponse.status === 403 && joinData.message?.includes('No invitation found')) {
        const requestResponse = await fetch("/api/organization/request-join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ 
            email: email,
            role: selectedRole.toLowerCase(),
            message: `Solicitud de unión con código de invitación: ${invitationCode}`
          })
        });

        const requestData = await requestResponse.json();

        if (requestResponse.ok) {
          alert("Solicitud de unión enviada correctamente. Recibirás un correo electrónico cuando sea aprobada por un administrador.");
          router.push('/dashboard');
        } else {
          handleRequestError(requestResponse.status, requestData);
        }
      } else {
        handleJoinError(joinResponse.status, joinData);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de red. Por favor, verifica tu conexión e intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinError = (status: number, data: { error?: string; message?: string }) => {
    switch (status) {
      case 404:
        alert("Código de invitación incorrecto. Verifica el código e intenta nuevamente.");
        break;
      case 400:
        alert(data.error || "Código de invitación inválido.");
        break;
      case 403:
        if (data.message?.includes('expired')) {
          alert("La invitación ha expirado. Solicita una nueva invitación.");
        } else if (data.message?.includes('not pending')) {
          alert("Esta invitación ya ha sido procesada.");
        } else {
          alert(data.message || "No tienes permisos para unirte a esta organización.");
        }
        break;
      case 500:
      case 502:
      case 503:
        alert("Error del servidor. Por favor, intenta más tarde.");
        break;
      default:
        alert(data.error || data.message || "Error al unirse a la organización.");
    }
  };

  const handleRequestError = (status: number, data: { error?: string; message?: string }) => {
    switch (status) {
      case 404:
        alert("Usuario u organización no encontrada.");
        break;
      case 400:
        alert(data.error || "Datos de solicitud inválidos.");
        break;
      case 500:
      case 502:
      case 503:
        alert("Error del servidor. Por favor, intenta más tarde.");
        break;
      default:
        alert(data.error || "Error al enviar la solicitud de unión.");
    }
  };

  return (
    <>
      <div className="flex flex-col items-center text-center gap-2">
        <h1 className="text-3xl font-bold">Unirse a una Organización</h1>
        <p className="text-muted-foreground text-balance">
          Ingresa el código de invitación que te proporcionaron.
        </p>
      </div>
      <div className="flex justify-center items-center gap-3">
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
      <div className="w-full">
        <Button
          type="button"
          className="w-full py-3 text-base"
          onClick={handleJoinOrganization}
          disabled={!invitationCode || invitationCode.length !== 6 || isLoading}
        >
          {isLoading ? "Procesando..." : "Unirse y Finalizar"}
        </Button>
      </div>
    </>
  );
}

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
    <div className="flex flex-col gap-4">
      {selectedRole === "Admin" ? (
        <AdminSetup
          nameConsultorio={nameConsultorio}
          setNameConsultorio={setNameConsultorio}
          nextStep={nextStep}
        />
      ) : (
        <JoinOrganization
          invitationCode={invitationCode}
          setInvitationCode={setInvitationCode}
          nextStep={nextStep}
          selectedRole={selectedRole}
        />
      )}
    </div>
  );
}