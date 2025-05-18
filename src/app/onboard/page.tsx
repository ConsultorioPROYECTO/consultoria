'use client'


import { Button } from "@rutas/components/ui/button"
import { useState } from "react"
import { UserCog, Stethoscope, User, ArrowLeft } from "lucide-react" // Zap y CheckCircle pueden ser removidos si no se usan directamente aquí
import { plansData } from "./com/prices"; // NUEVA IMPORTACIÓN
import { motion, AnimatePresence } from 'framer-motion';
import { Step1RoleSelect } from "./com/Step1RoleSelect";
import { Step2ConsultorioOrInvitacion } from "./com/Step2ConsultorioOrInvitacion";
import { Step3PlanSelect } from "./com/Step3PlanSelect";

export default function OnboardingForm() {
    const roles = [{ name: "Master", icon: UserCog },
        { name: "Médico", icon: Stethoscope },
        { name: "Asistente", icon: User }
      ];
    const [selectedRole, setSelectedRole] = useState("");
    const [nameConsultorio, setNameConsultorio] = useState("");
    const [invitationCode, setInvitationCode] = useState("");

    // Nuevo estado para manejar los pasos del formulario
    const [currentStep, setCurrentStep] = useState(1);

    // Nuevos estados para la selección de plan
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plansData.find(p => p.isPopular)?.id || plansData[0]?.id || null);
    const [isAnnualBilling, setIsAnnualBilling] = useState(false);

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
          {/* Términos y Política al final, fuera de la animación si queremos que siempre estén visibles */}
          <div className="text-muted-foreground text-center text-xs text-balance mt-6 w-full">
            Al continuar, aceptas nuestros <a href="#" className="underline hover:text-primary">Términos de Servicio</a>{" "}
            y <a href="#" className="underline hover:text-primary">Política de Privacidad</a>.
          </div>
          </motion.div>
        </AnimatePresence>


      </div>
    </div>
  )
}
