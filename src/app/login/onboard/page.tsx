'use client'

import { cn } from "@rutas/lib/utils"
import { Button } from "@rutas/components/ui/button"
import { Card, CardContent } from "@rutas/components/ui/card"
import { Input } from "@rutas/components/ui/input"
import { Label } from "@rutas/components/ui/label"
import { useState } from "react"
import { UserCog, Stethoscope, User, ArrowLeft, CheckCircle, Zap } from "lucide-react" // Zap y CheckCircle pueden ser removidos si no se usan directamente aquí
import { TInvTable, InvitedRow, InviteStatus } from "../onboard/com/tinvtable"
import { SubscriptionCards } from "./com/SubscriptionCards"; // NUEVA IMPORTACIÓN
import { plansData } from "./com/prices"; // NUEVA IMPORTACIÓN
// import { Switch } from "@rutas/components/ui/switch"; // Switch ya no se usa directamente aquí
import { ToggleGroup, ToggleGroupItem } from "@rutas/components/ui/toggle-group"; // NUEVA IMPORTACIÓN PARA EL SELECTOR DE FACTURACIÓN
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@rutas/components/ui/input-otp"; // NUEVA IMPORTACIÓN PARA INPUT OTP

export default function OnboardingForm({ // Sugerencia: Renombrar LoginForm a OnboardingForm si es más preciso
  className,
  ...props
}: React.ComponentProps<"div">) {
    const roles = [{ name: "Master", icon: UserCog },
        { name: "Médico", icon: Stethoscope },
        { name: "Asistente", icon: User }
      ];
    const [selectedRole, setSelectedRole] = useState("");
    const [nameConsultorio, setNameConsultorio] = useState("");
    const [invitationCode, setInvitationCode] = useState(""); // NUEVO ESTADO
    const roleNames = ["Master", "Médico", "Asistente"];
    const [invitedRows, setInvitedRows] = useState<InvitedRow[]>([]);
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [inviteEmail, setInviteEmail] = useState("");

    // Nuevo estado para manejar los pasos del formulario
    const [currentStep, setCurrentStep] = useState(1);

    // Nuevos estados para la selección de plan
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plansData.find(p => p.isPopular)?.id || plansData[0]?.id || null); // Selecciona el popular por defecto o el primero
    const [isAnnualBilling, setIsAnnualBilling] = useState(false);


    // Validación de correo electrónico
    const isValidEmail = (email: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const addInvite = () => { // <-- AÑADIR ESTA FUNCIÓN
      if (isValidEmail(inviteEmail) && !invitedRows.find(inv => inv.email === inviteEmail)) {
        setInvitedRows(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 15), // ID único simple
            email: inviteEmail,
            status: "Pendiente" as InviteStatus,
            role: roleNames[1] // Rol por defecto, ej: "Médico"
          }
        ]);
        setInviteEmail(""); // Limpiar el input después de añadir
      }
    };

    const handleDelete = (email: string) => { // <-- AÑADIR ESTA FUNCIÓN
      setInvitedRows(prevRows => prevRows.filter(inv => inv.email !== email));
      // Si estabas usando selectedRows para algo relacionado con la tabla original,
      // y la nueva UI de "chips" no lo necesita directamente para la eliminación,
      // podrías simplificar o ajustar esta parte.
      // Por ahora, mantendré la lógica original de selectedRows por si es relevante en otro contexto.
      setSelectedRows(prevSelected => {
        const newSelectedRows = { ...prevSelected };
        const rowToDelete = invitedRows.find(r => r.email === email);
        if (rowToDelete && newSelectedRows[rowToDelete.id]) {
          delete newSelectedRows[rowToDelete.id];
        }
        return newSelectedRows;
      });
    };

    // NUEVA FUNCIÓN: Se ejecuta al seleccionar un plan y debería iniciar el pago
    const handlePlanSelectionAndProceed = (planId: string) => {
      setSelectedPlanId(planId);
      // En un escenario real, aquí se redirigiría a la pasarela de pago
      // o se mostraría un modal de pago.
      console.log(
        "Plan seleccionado:", planId, 
        "Facturación:", isAnnualBilling ? "Anual" : "Mensual",
        "Consultorio:", nameConsultorio,
        "Rol:", selectedRole
      );
      alert(`Has seleccionado el plan ${planId}. El siguiente paso sería el proceso de pago (no implementado en esta demo).`);
      // Ejemplo: router.push('/checkout?planId=' + planId + '&billing=' + (isAnnualBilling ? 'annually' : 'monthly'));
    };

    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => prev - 1);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10 text-foreground relative"> {/* Añadido 'relative' para posicionar el botón de atrás absoluto a este contenedor */}
      
      {/* Botón de Volver Atrás - Posicionado en la esquina superior izquierda de la PÁGINA */}
      {currentStep > 1 && (
        <Button 
          variant="ghost"
          size="icon" 
          className="absolute top-6 left-6 md:top-10 md:left-10 text-muted-foreground hover:text-foreground z-20" // Posición absoluta respecto al div padre. Ajustado z-index
          onClick={prevStep}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="sr-only">Anterior</span>
        </Button>
      )}

      <div className={cn(
        "w-full flex flex-col gap-4", // 'relative' ya no es estrictamente necesario aquí para el botón de atrás
        currentStep === 3 && selectedRole === "Master" ? "max-w-4xl" : "max-w-lg"
      )}>
        
        {/* Paso 1: Bienvenida y Selección de Rol */}
        {currentStep === 1 && (
          <>
            <div className="flex flex-col items-center text-center gap-2"> {/* No necesita margen superior especial ya que no hay botón de atrás */}
              <h1 className="text-3xl font-bold">Bienvenido/a</h1>
              <p className="text-muted-foreground text-balance">
                Comencemos por conocer un poco sobre ti.
              </p>
            </div>
      
            <div className="flex flex-col gap-4">
              <p className="text-md font-medium text-center">Selecciona tu rol principal</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"> {/* Ajuste para mejor responsividad */}
                {roles.map(({ name, icon: Icon }) => 
                  <Button
                    variant="outline"
                    type="button"
                    className={`py-6 text-base flex-col h-auto items-center justify-center gap-2 transition-all ${ // Modificado para botones más grandes y con ícono arriba
                      selectedRole === name
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' // Mejor contraste para selección
                        : 'bg-card hover:bg-muted' // Estilo más sutil para no seleccionados
                    }`}
                    onClick={() => setSelectedRole(name)}
                    key={name}
                  >
                    <Icon className="w-6 h-6 mb-1" /> {/* Icono más grande */}
                    {name}
                  </Button>
                )}
              </div>
            </div>
            <Button 
              type="button" 
              className="w-full mt-4 py-3 text-base" // Botón de acción principal más prominente
              onClick={nextStep} 
              disabled={!selectedRole}
            >
              Siguiente
            </Button>
          </>
        )}
        {/* Paso 2: Nombre del Consultorio (Master) o Código de Invitación (Otros) */}
        {currentStep === 2 && (
          <div key="step2" className="animate-subtle-fade-in flex flex-col gap-4">
            {/* EL BOTÓN DE VOLVER ATRÁS SE HA MOVIDO FUERA DE ESTE BLOQUE */}

            {selectedRole === "Master" ? (
              <>
                <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12"> {/* Ajustado margen superior para el botón de atrás global */}
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
                    className="py-3 text-base"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12"> {/* Ajustado margen superior */}
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
                    onChange={(value) => setInvitationCode(value)}
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
            <div className="flex gap-3 mt-4">
              <Button 
                type="button" 
                className="w-full py-3 text-base" 
                onClick={() => {
                  if (selectedRole === "Master") {
                    nextStep(); // Ir al Paso 3: Selección de Plan
                  } else {
                    // Lógica para Médico/Asistente después de ingresar código
                    console.log("Finalizar para no Master con código:", invitationCode); 
                    // Aquí podrías, por ejemplo, llamar a una función para validar el código y completar el onboarding.
                    // O navegar a una página de "Completado" o al dashboard.
                  }
                }}
                disabled={selectedRole === "Master" ? !nameConsultorio : !invitationCode}
              >
                {selectedRole === "Master" ? "Siguiente" : "Unirse y Finalizar"}
              </Button>
            </div>
          </div>
        )}
        {/* Paso 3: Selección de Plan (Solo para Master) - AHORA ES EL ÚLTIMO PASO PARA MASTER */}
        {currentStep === 3 && selectedRole === "Master" && (
          <div key="step3_plans" className="animate-subtle-fade-in flex flex-col gap-4 w-full">
             {/* EL BOTÓN DE VOLVER ATRÁS SE HA MOVIDO FUERA DE ESTE BLOQUE */}
            <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12"> {/* Ajustado margen superior para el botón de atrás global */}
              <h1 className="text-3xl font-bold">Elige tu Plan</h1>
              <p className="text-muted-foreground text-balance">
                Selecciona el plan que mejor se adapte a las necesidades de {nameConsultorio || "tu consultorio"}.
              </p>
            </div>
            {/* Selector de Ciclo de Facturación Estilo Segmentado */}
            <div className="flex flex-col items-center justify-center">
              <ToggleGroup
                type="single"
                value={isAnnualBilling ? "annual" : "monthly"}
                onValueChange={(value) => {
                  if (value) { 
                    setIsAnnualBilling(value === "annual");
                  }
                }}
                className="inline-flex rounded-full bg-muted p-1 items-stretch" // MODIFICADO: items-center a items-stretch
                aria-label="Seleccionar ciclo de facturación"
              >
                <ToggleGroupItem 
                  value="monthly" 
                  className={cn(
                    "px-5 py-1.5 text-sm font-medium rounded-full first:rounded-full last:rounded-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
                    isAnnualBilling === false 
                      ? "bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90" 
                      : "text-muted-foreground hover:text-foreground/80" 
                  )}
                >
                  Mensual
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="annual" 
                  className={cn(
                    "px-5 py-1.5 text-sm font-medium rounded-none first:rounded-full last:rounded-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
                    isAnnualBilling === true 
                      ? "bg-primary text-primary-foreground rounded-full shadow-sm hover:bg-primary/90" 
                      : "text-muted-foreground hover:text-foreground/80" 
                  )}
                >
                  Anual
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <SubscriptionCards 
              selectedPlanId={selectedPlanId}
              onSelectPlan={handlePlanSelectionAndProceed} // MODIFICADO: Usar la nueva función
              isAnnualBilling={isAnnualBilling}
            />
          </div>
        )}
        {currentStep > 1 && ( // Ejemplo: mostrar solo si no es el primer paso, o ajustar lógica
            <>
            </>
        )}

        <div className="text-muted-foreground text-center text-xs text-balance mt-6"> {/* Movido al final del contenedor del paso */}
          Al continuar, aceptas nuestros <a href="#" className="underline hover:text-primary">Términos de Servicio</a>{" "}
          y <a href="#" className="underline hover:text-primary">Política de Privacidad</a>.
        </div>
      </div>
    </div>
  )
}
