export interface Plan { // <-- AÑADIDO 'export'
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnually: number; // Precio anual total (podemos calcular el mensual con descuento)
  description: string; // Pequeña descripción o eslogan
  features: string[]; // Lista de características principales
  tokenLimit: string; // Ej: "50,000 tokens/mes"
  medicosLimit: string; // Ej: "1 Médico"
  asistentesLimit: string; // Ej: "2 Asistentes"
  isPopular?: boolean; // Para destacar un plan
}

export const plansData: Plan[] = [ // <-- AÑADIDO 'export'
  {
    id: "basico",
    name: "Básico",
    priceMonthly: 29,
    priceAnnually: 290, // Ahorro de 2 meses
    description: "Ideal para profesionales independientes iniciando.",
    tokenLimit: "50,000 tokens/mes",
    medicosLimit: "1 Médico",
    asistentesLimit: "1 Asistente",
    features: [
      "Agendamiento IA vía WhatsApp",
      "Panel de control de citas",
      "Soporte por correo electrónico",
    ],
  },
  {
    id: "profesional",
    name: "Profesional",
    priceMonthly: 79,
    priceAnnually: 790, // Ahorro de 2 meses
    description: "Para consultorios en crecimiento con múltiples profesionales.",
    tokenLimit: "200,000 tokens/mes",
    medicosLimit: "Hasta 5 Médicos",
    asistentesLimit: "Hasta 5 Asistentes",
    features: [
      "Todo en Básico",
      "Recordatorios automáticos de citas",
      "Integración con Google Calendar",
      "Reportes básicos de actividad",
      "Soporte prioritario",
    ],
    isPopular: true,
  },
  {
    id: "empresarial",
    name: "Empresarial",
    priceMonthly: 149,
    priceAnnually: 1490, // Ahorro de 2 meses
    description: "Soluciones completas para clínicas y organizaciones grandes.",
    tokenLimit: "1,000,000 tokens/mes",
    medicosLimit: "Médicos ilimitados", // O un límite alto
    asistentesLimit: "Asistentes ilimitados", // O un límite alto
    features: [
      "Todo en Profesional",
      "IA con análisis avanzado (beta)",
      "Múltiples números de WhatsApp (opcional)",
      "Reportes avanzados y personalizables",
      "Soporte dedicado y SLA",
    ],
  },
];