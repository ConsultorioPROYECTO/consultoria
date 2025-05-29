// Tipos para la respuesta del método GET de /api/medical-services
import { MedicalService } from "@/hooks/useMedicalServices";

/**
 *  @fileoverview Tipos para la respuesta del método GET de /api/medical-services
 *  @version 1.0.0
 *  @author Santiago Prada
 *  @date 2025-05-28
 *  @description
 *  Define los tipos utilizados en la respuesta de la API para obtener servicios médicos.
 *  Incluye el tipo `MedicalService` que representa un servicio médico y el tipo
 *  `GetMedicalServicesResponse` que representa la respuesta completa de la API.
 */
export type GetMedicalServicesResponse = {
  services: MedicalService[];
  categories: string[];
  total: number;
};

/**
 *  @fileoverview Tipo para la respuesta de la API de servicios médicos
 *  @version 1.0.0
 *  @author Santiago Prada
 *  @date 2025-05-28
 *  @description define el tipo de respuesta de la API para obtener servicios médicos.
 *  Incluye un campo `success` para indicar el éxito de la operación, un campo `data`
 *  que contiene los servicios médicos y un campo `message` para mensajes adicionales.
 *  Este tipo se utiliza para estructurar la respuesta de la API de manera consistente.
 *  @requires GetMedicalServicesResponse - Tipo que define la estructura de los servicios médicos.
 *  @requires MedicalService - Tipo que define la estructura de un servicio médico.
 */
export type GetMedicalServicesApiResponse = {
  success: boolean;
  data: GetMedicalServicesResponse;
  message: string;
};
