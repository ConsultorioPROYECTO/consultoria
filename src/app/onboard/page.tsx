'use client'

import { Button } from "@rutas/components/ui/button"
import { useEffect, useState, Suspense } from "react"
import { UserCog, Stethoscope, User, ArrowLeft } from "lucide-react" // Zap y CheckCircle pueden ser removidos si no se usan directamente aquí
import { motion, AnimatePresence } from 'framer-motion';
import { Step1RoleSelect } from "./com/Step1RoleSelect";
import { Step2ConsultorioOrInvitacion } from "./com/Step2ConsultorioOrInvitacion";
import { Step3PlanSelect } from "./com/Step3PlanSelect";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@rutas/app/context/AuthContext";
import { getFirebaseAuthToken } from "../lib/firebase/clientUtils";

function OnboardContent() {
    const roles = [
        { name: "Admin", icon: UserCog },
        { name: "medico", icon: Stethoscope },
        { name: "asistente", icon: User }
      ];
    const [selectedRole, setSelectedRole] = useState("");
    const [nameConsultorio, setNameConsultorio] = useState("");
    const [invitationCode, setInvitationCode] = useState("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialInvitationCode = searchParams.get('invitacionCode');
    const initialRole = searchParams.get('role');
    const { signOut } = useAuth();

    useEffect(() => {
        if (initialInvitationCode) {
            setInvitationCode(initialInvitationCode);
        }
        if (initialRole) {
            setSelectedRole(initialRole);
        }
        // Si ambos parámetros existen, saltar al paso 2 automáticamente
        if (initialInvitationCode && initialRole) {
            setCurrentStep(2);
        }
    }, [initialInvitationCode, initialRole]);

    // Toasts globales para mostrar mensajes de ejemplo
    // useEffect(() => {
    //     toast.success("¡Bienvenido a bordo!", {
    //         description: "Has sido añadido a la organización.",
    //     });
    //     toast.error("Error al unirse a la organización.", {
    //         description: "Por favor, verifica el código de invitación o contacta al administrador.",
    //     });
    //     toast.error("Error al unirse a la organización.", {
    //         description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
    //     });
    // }, []);

    // const { toast } = useToast(); // Eliminamos esta línea

    // Nuevo estado para manejar los pasos del formulario
    const [currentStep, setCurrentStep] = useState(1);

    // Nuevos estados para la selección de plan
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null); // Inicializar como null
    const [isAnnualBilling, setIsAnnualBilling] = useState(false);
    // const [isLoading, setIsLoading] = useState(false); // Eliminado isLoading

    const handlePlanSelectionAndProceed = async (planId: string) => {
      if (!planId) {
        toast.error('Por favor, selecciona un plan para continuar.');
        return;
      }
      
      // Actualizar el estado del plan seleccionado
      setSelectedPlanId(planId);
      // La validación de consultorioName para Admin se movió a Step2ConsultorioOrInvitacion
      // if (role === 'Admin' && !consultorioName.trim()) { 
      //   toast.error('Por favor, ingresa el nombre del consultorio.');
      //   return;
      // }

      // setIsLoading(true); // Eliminado
      try {
        const token = await getFirebaseAuthToken();
        let organizationResponse;
        if (selectedRole === 'Admin') { // Asegúrate de usar selectedRole aquí
          // Crear organización para el Admin
          organizationResponse = await fetch('/api/organization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
              organizationName: nameConsultorio, // Asegúrate de usar nameConsultorio
              planId: planId // Usar el planId recibido como parámetro
            }), 
          });
        } else {
          // Para otros roles, la unión a la organización ya se manejó en Step2ConsultorioOrInvitacion
          // Simplemente redirigir al dashboard si ya seleccionaron un plan (aunque este flujo es más para Admin)
          router.push('/dashboard');
          // setIsLoading(false); // Eliminado
          return;
        }

        if (!organizationResponse.ok) {
          const contentType = organizationResponse.headers.get('content-type');
          if (contentType && contentType.indexOf('application/json') !== -1) {
            const errorData = await organizationResponse.json();
            throw new Error(errorData.error || `Error del servidor: ${organizationResponse.status}`);
          } else {
            const errorText = await organizationResponse.text();
            throw new Error(`Respuesta no JSON del servidor: ${errorText}`);
          }
        }

        toast.success(
          selectedRole === 'Admin' // Asegúrate de usar selectedRole aquí
            ? '¡Organización creada y plan seleccionado!'
            : '¡Plan seleccionado!'
        );
        router.push('/dashboard');
      } catch (error) {
        console.error('Error al procesar el plan y la organización:', error);
        toast.error((error as Error).message || 'Ocurrió un error desconocido.');
      } 
      // finally { // Eliminado
      //   setIsLoading(false);
      // }
    };
    const nextStep = () => setCurrentStep(prev => prev + 1);
    const prevStep = () => setCurrentStep(prev => prev - 1);
    
    const handleBackAction = async () => {
      if (currentStep === 1) {
        // Si estamos en el paso 1, cerrar sesión y borrar credenciales
        try {
          await signOut();
          toast.success("Sesión cerrada correctamente");
          router.push('/login'); // Redirigir al login después del logout
        } catch (error) {
          console.error('Error al cerrar sesión:', error);
          toast.error("Error al cerrar sesión");
        }
      } else {
        // Para otros pasos, simplemente retroceder
        prevStep();
      }
    };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10 text-foreground relative"> {/* Añadido 'relative' para posicionar el botón de atrás absoluto a este contenedor */}
      
      {/* Botón de Volver Atrás - Posicionado en la esquina superior izquierda de la PÁGINA */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-6 md:top-10 md:left-10 text-muted-foreground hover:text-foreground z-20"
        onClick={handleBackAction}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="sr-only">{currentStep === 1 ? "Cerrar sesión" : "Anterior"}</span>
      </Button>

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
                nextStep={async () => {
                  if (selectedRole === "Admin") {
                    if (!nameConsultorio.trim()) {
                      toast.error("Nombre del consultorio requerido", {
                        description: "Por favor, ingresa un nombre para tu consultorio.",
                      });
                      return;
                    }
                    // Solo avanza al siguiente paso, la creación se hará después de seleccionar el plan
                    nextStep(); 
                  } else {
                    // Lógica para Médico o Asistente: enviar código de invitación al backend
                    if (!invitationCode) {
                      toast.error("Por favor, introduce un código de invitación.", {
                        description: "El código de invitación no puede estar vacío.",
                      });
                      return;
                    }

                    try {
                      const response = await fetch('/api/organization/join', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ invitationCode: invitationCode, role : selectedRole }),
                      });

                      // Intentar parsear como JSON solo si la respuesta parece ser JSON
                      if (response.headers.get("content-type")?.includes("application/json")) {
                        const data = await response.json();
                        if (response.ok) {
                          toast.success("¡Bienvenido a bordo!", {
                            description: data.message || "Te has unido a la organización exitosamente.",
                          });
                          router.push('/dashboard'); // Redirigir al dashboard en caso de éxito
                        } else {
                          toast.error("Error al unirse a la organización.", {
                            description: data.message || "No se pudo unir a la organización. Inténtalo de nuevo.",
                          });
                        }
                      } else {
                        const textError = await response.text();
                        console.error("Respuesta no JSON del servidor (unión):", textError);
                        toast.error("Error del servidor", {
                            description: "El servidor devolvió una respuesta inesperada al intentar unirse. Por favor, inténtalo más tarde.",
                        });
                      }
                    } catch (error) {
                      console.error("Error al enviar la solicitud de unión:", error);
                      toast.error("Error de conexión o procesamiento", {
                        description: "No se pudo conectar con el servidor o procesar la respuesta al unirse. Inténtalo de nuevo más tarde.",
                      });
                    }
                  }
                }}
              />
            )}
            {/* Paso 3: Selección de Plan (Solo para Admin) */}
            {currentStep === 3 && selectedRole === "Admin" && (
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

export default function OnboardingForm() {
    return (
        <Suspense fallback={null}>
            <OnboardContent />
        </Suspense>
    );
}
