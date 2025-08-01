export interface Plan { // <-- AÑADIDO 'export'
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnually: number; // Precio anual total (podemos calcular el mensual con descuento)
  description: string; // Pequeña descripción o eslogan
  features: string[]; // Lista de características principales
  medicosLimit: string; // Ej: "1 Médico"
  asistentesLimit: string; // Ej: "2 Asistentes"
  isPopular?: boolean; // Para destacar un plan
}

export const plansData: Plan[] = [ // <-- AÑADIDO 'export'
  {
    id: "basico",
    name: "Básico",
    priceMonthly: 150,
    priceAnnually: 1750,
    description: "Ideal para profesionales independientes iniciando.",
    medicosLimit: "1 Médico",
    asistentesLimit: "1 Asistente",
    features: [
      "Agendamiento IA vía WhatsApp",
      "Un número de WhatsApp",
      "Panel de control de citas",
    ],
  },
  {
    id: "profesional",
    name: "Profesional",
    priceMonthly: 270,
    priceAnnually: 2970, // Ahorro de 2 meses
    description: "Para consultorios en crecimiento con múltiples profesionales.",
    medicosLimit: "Hasta 3 Médicos",
    asistentesLimit: "Hasta 3 Asistentes",
    features: [
      "Todo en Básico",
      "Un número de WhatsApp",
      "Recordatorios automáticos de citas",
    ],
    isPopular: true,
  },
  {
    id: "empresarial",
    name: "Empresarial",
    priceMonthly: 149,
    priceAnnually: 1490, // Ahorro de 2 meses
    description: "Soluciones completas para clínicas y organizaciones grandes.",
    medicosLimit: "Médicos ilimitados", // O un límite alto
    asistentesLimit: "Asistentes ilimitados", // O un límite alto
    features: [
      "Todo en Profesional",
      "IA con análisis avanzado (beta)",
      "Múltiples números de WhatsApp (opcional)",
      "Reportes avanzados y personalizables",
      "SLA",
    ],
  },
];