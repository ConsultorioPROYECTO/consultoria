import { ToggleGroup, ToggleGroupItem } from "@rutas/components/ui/toggle-group";
import { SubscriptionCards } from "./SubscriptionCards";
import React from "react";
import { cn } from "@rutas/lib/utils";

export function Step3PlanSelect({
  nameConsultorio,
  isAnnualBilling,
  setIsAnnualBilling,
  selectedPlanId,
  handlePlanSelectionAndProceed
}: {
  nameConsultorio: string;
  isAnnualBilling: boolean;
  setIsAnnualBilling: (v: boolean) => void;
  selectedPlanId: string | null;
  handlePlanSelectionAndProceed: (planId: string) => void;
}) {
  return (
    <div key="step3_plans" className="animate-subtle-fade-in flex flex-col gap-4 w-full">
      <div className="flex flex-col items-center text-center gap-2 mt-10 md:mt-12">
        <h1 className="text-3xl font-bold">Elige tu Plan</h1>
        <p className="text-muted-foreground text-balance">
          Selecciona el plan que mejor se adapte a las necesidades de {nameConsultorio || "tu consultorio"}.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center">
        <ToggleGroup
          type="single"
          value={isAnnualBilling ? "annual" : "monthly"}
          onValueChange={value => {
            if (value) setIsAnnualBilling(value === "annual");
          }}
          className="inline-flex rounded-full bg-muted p-1 items-stretch"
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
        onSelectPlan={handlePlanSelectionAndProceed}
        isAnnualBilling={isAnnualBilling}
      />
    </div>
  );
} 