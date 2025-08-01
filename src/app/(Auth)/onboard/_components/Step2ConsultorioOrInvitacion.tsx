import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@rutas/components/ui/input-otp";
import React from "react";
import { getAuthTokenAndEmail } from "@lib/firebase/clientUtils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@rutas/app/context/AuthContext";

interface AdminSetupProps {
  nameConsultorio: string;
  setNameConsultorio: (v: string) => void;
  nextStep: () => void;
}

interface JoinOrganizationProps {
  invitationCode: string;
  setInvitationCode: (v: string) => void;
  selectedRole: string;
}

function AdminSetup({ nameConsultorio, setNameConsultorio, nextStep }: AdminSetupProps) {
  const handleValidateAndProceed = () => {
    if (!nameConsultorio.trim()) {
      toast.error("Por favor, ingresa el nombre del consultorio.");
      return;
    }
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

function JoinOrganization({ invitationCode, setInvitationCode, selectedRole }: JoinOrganizationProps) {
  const router = useRouter();
  const { refreshUserInfo } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleJoinOrganization = async () => {
    if (!invitationCode || invitationCode.length !== 6) {
      toast.error("Código de invitación inválido", { description: "Por favor, ingresa un código válido de 6 dígitos." });
      return;
    }

    setIsLoading(true);
    
    try {
      const { token, email } = await getAuthTokenAndEmail();
      
      if (!token) {
        toast.error("Error de autenticación", { description: "No se pudo obtener el token. Por favor, inicia sesión nuevamente." });
        setIsLoading(false);
        return;
      }

      if (!email) {
        toast.error("Error de usuario", { description: "No se pudo obtener el email del usuario. Por favor, verifica tu cuenta." });
        setIsLoading(false);
        return;
      }

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
        toast.success("¡Bienvenido a bordo!", { description: "Te has unido exitosamente a la organización." });
        await refreshUserInfo();
        router.push('/dashboard');
        return;
      }

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
          toast.info("Solicitud de unión enviada", { description: "Recibirás un correo electrónico cuando sea aprobada por un administrador." });
          router.push('/dashboard');
        } else {
          handleRequestError(requestResponse.status, requestData);
        }
      } else {
        handleJoinError(joinResponse.status, joinData);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error de red", { description: "Por favor, verifica tu conexión e intenta nuevamente." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinError = (status: number, data: { error?: string; message?: string }) => {
    const description = data.error || data.message || "Ocurrió un error desconocido.";
    switch (status) {
      case 404:
        toast.error("Código incorrecto", { description: "Verifica el código e intenta nuevamente." });
        break;
      case 400:
        toast.error("Código inválido", { description });
        break;
      case 403:
        if (data.message?.includes('expired')) {
          toast.error("Invitación expirada", { description: "Solicita una nueva invitación." });
        } else if (data.message?.includes('not pending')) {
          toast.error("Invitación ya procesada", { description: "Esta invitación ya ha sido utilizada o cancelada." });
        } else {
          toast.error("Sin permisos", { description });
        }
        break;
      default:
        toast.error("Error al unirse", { description });
    }
  };

  const handleRequestError = (status: number, data: { error?: string; message?: string }) => {
    const description = data.error || "Ocurrió un error desconocido al enviar la solicitud.";
    switch (status) {
      case 404:
        toast.error("No encontrado", { description: "Usuario u organización no encontrada." });
        break;
      case 400:
        toast.error("Solicitud inválida", { description });
        break;
      default:
        toast.error("Error en la solicitud", { description });
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
          selectedRole={selectedRole}
        />
      )}
    </div>
  );
}