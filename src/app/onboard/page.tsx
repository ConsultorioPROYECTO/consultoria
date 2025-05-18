'use client'

import { cn } from "@rutas/lib/utils"
import { Button } from "@rutas/components/ui/button"
import { Card, CardContent } from "@rutas/components/ui/card"
import { Input } from "@rutas/components/ui/input"
import { Label } from "@rutas/components/ui/label"
import { useState } from "react"
import { UserCog, Stethoscope, User, ArrowLeft, CheckCircle, Zap } from "lucide-react" // Zap y CheckCircle pueden ser removidos si no se usan directamente aquí
import { TInvTable, InvitedRow, InviteStatus } from "./com/tinvtable"
import { SubscriptionCards } from "./com/SubscriptionCards"; // NUEVA IMPORTACIÓN
import { plansData } from "./com/prices"; // NUEVA IMPORTACIÓN
// import { Switch } from "@rutas/components/ui/switch"; // Switch ya no se usa directamente aquí
import { ToggleGroup, ToggleGroupItem } from "@rutas/components/ui/toggle-group"; // NUEVA IMPORTACIÓN PARA EL SELECTOR DE FACTURACIÓN
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@rutas/components/ui/input-otp"; // NUEVA IMPORTACIÓN PARA INPUT OTP
import { motion, AnimatePresence } from 'framer-motion';
import { Step1RoleSelect } from "./com/Step1RoleSelect";
import { Step2ConsultorioOrInvitacion } from "./com/Step2ConsultorioOrInvitacion";
import { Step3PlanSelect } from "./com/Step3PlanSelect";

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
          className="absolute top-6 left-6 md:top-10 md:left-10 text-muted-foreground hover:text-foreground z-20"
          onClick={prevStep}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="sr-only">Anterior</span>
        </Button>
      )}

      {/* Contenedor principal con ancho fijo para evitar saltos */}
      <div className="max-w-4xl mx-auto flex flex-col gap-4">

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -40, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="w-full"
            
          >
            {/* Paso 1: Bienvenida y Selección de Rol */}
            {currentStep === 1 && (
              <Step1RoleSelect
                roles={roles}
                selectedRole={selectedRole}
                setSelectedRole={setSelectedRole}
                nextStep={nextStep}
              />
            )}
            {/* Paso 2: Nombre del Consultorio (Master) o Código de Invitación (Otros) */}
            {currentStep === 2 && (
              <Step2ConsultorioOrInvitacion
                selectedRole={selectedRole}
                nameConsultorio={nameConsultorio}
                setNameConsultorio={setNameConsultorio}
                invitationCode={invitationCode}
                setInvitationCode={setInvitationCode}
                nextStep={() => {
                  if (selectedRole === "Master") {
                    nextStep();
                  } else {
                    console.log("Finalizar para no Master con código:", invitationCode);
                  }
                }}
              />
            )}
            {/* Paso 3: Selección de Plan (Solo para Master) */}
            {currentStep === 3 && selectedRole === "Master" && (
              <Step3PlanSelect
                nameConsultorio={nameConsultorio}
                isAnnualBilling={isAnnualBilling}
                setIsAnnualBilling={setIsAnnualBilling}
                selectedPlanId={selectedPlanId}
                handlePlanSelectionAndProceed={handlePlanSelectionAndProceed}
              />
            )}
            {currentStep > 1 && (
                <>
                </>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Términos y Política al final, fuera de la animación si queremos que siempre estén visibles */}
        <div className="text-muted-foreground text-center text-xs text-balance mt-6 w-full">
          Al continuar, aceptas nuestros <a href="#" className="underline hover:text-primary">Términos de Servicio</a>{" "}
          y <a href="#" className="underline hover:text-primary">Política de Privacidad</a>.
        </div>
      </div>
    </div>
  )
}
