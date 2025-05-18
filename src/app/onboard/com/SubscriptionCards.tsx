'use client'

import { Plan, plansData } from "./prices"; // Importamos los datos y el tipo
import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Check, Zap } from "lucide-react"; // Iconos para características y plan popular
import { cn } from "@rutas/lib/utils";

interface SubscriptionCardsProps {
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  isAnnualBilling: boolean; // Para mostrar precio anual o mensual
}

export function SubscriptionCards({ selectedPlanId, onSelectPlan, isAnnualBilling }: SubscriptionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {plansData.map((plan) => {
        const price = isAnnualBilling ? plan.priceAnnually / 12 : plan.priceMonthly;
        const billingCycle = isAnnualBilling ? "/mes (fact. anual)" : "/mes";
        const isProfesionalPlan = plan.name === "Profesional"; // Variable para identificar el plan Profesional

        return (
          <Card 
            key={plan.id} 
            className={cn(
              "flex flex-col transition-all duration-300 ease-in-out bg-card", 
              selectedPlanId === plan.id ? "shadow-lg" : "hover:shadow-md", // MODIFICADO: Eliminado ring-2 ring-primary
              plan.isPopular && !isProfesionalPlan ? "relative" : "", 
              !isProfesionalPlan ? "border" : "" 
            )}
          >
            {plan.isPopular && !isProfesionalPlan && ( 
              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                <Zap size={14} />
              </div>
            )}
            <CardHeader className="pb-1 pt-2 px-3"> {/* Reducido pb a 1, pt a 2 */}
              <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
              <CardDescription className="text-xs text-muted-foreground min-h-[28px] leading-tight">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col gap-1.5 px-3 pb-1"> {/* Reducido gap a 1.5, pb a 1 */}
              <div className="text-2xl font-bold flex items-baseline"> {/* Añadido flex e items-baseline para alinear los precios */}
                <span>${price.toFixed(0)}</span> {/* Precio principal (mensual o anual/12) */}
                
                {/* Mostrar precio mensual original tachado si es facturación anual y no es plan empresarial */}
                {isAnnualBilling && plan.id !== "empresarial" && (
                  <span className="text-sm font-normal text-muted-foreground line-through ml-1.5">
                    ${plan.priceMonthly.toFixed(0)}
                  </span>
                )}

                <span className="text-xs font-normal text-muted-foreground ml-1">{billingCycle}</span>
              </div>
              
              {/* La siguiente línea de texto de ahorro ha sido eliminada: */}
              {/* 
              {isAnnualBilling && plan.id !== "empresarial" && (
                 <p className="text-xs text-green-600 leading-tight">
                   Ahorra 2 meses (Total: ${plan.priceAnnually})
                 </p>
              )}
              */}

              <ul className="space-y-0.5 text-xs">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start leading-tight">
                    <Check className="w-3.5 h-3.5 text-muted-foreground mr-1 flex-shrink-0 mt-0.5 stroke-4" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="text-xs text-muted-foreground mt-auto pt-1 leading-tight"> {/* Reducido pt a 1 */}
                <p>{plan.tokenLimit}</p>
                <p>{plan.medicosLimit}</p>
                <p>{plan.asistentesLimit}</p>
              </div>
            </CardContent>
            <CardFooter className="px-3 pb-2 pt-1"> {/* Reducido pb a 2 */}
              <Button 
                className="w-full py-1.5 text-xs h-auto"
                variant={selectedPlanId === plan.id ? "default" : "outline"}
                onClick={() => onSelectPlan(plan.id)}
              >
                {selectedPlanId === plan.id ? "Seleccionado" : "Seleccionar"}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}