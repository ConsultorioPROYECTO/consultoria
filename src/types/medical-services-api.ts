// Tipos para la respuesta del método GET de /api/medical-services
import { MedicalService } from "@/hooks/useMedicalServices";

export type GetMedicalServicesResponse = {
  services: MedicalService[];
  categories: string[];
  total: number;
};

// Si quieres el tipo completo de la respuesta HTTP (incluyendo message y success):
export type GetMedicalServicesApiResponse = {
  success: boolean;
  data: GetMedicalServicesResponse;
  message: string;
};
