// src/lib/knowledge-manager.ts

import { db } from '../db';
import { medicalServices, doctors, doctorServices, organization, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * @fileoverview Gestor de conocimiento para sincronización con pgVector mediante API HTTP
 * @description Maneja la creación, actualización y eliminación de conocimiento en pgVector
 * @author Santiago Prada
 * @version 2.0.0
 */

// Configuración de la API externa
const PGVECTOR_API_URL = 'https://n8n.irinacloud.co/webhook/3b7d5b57-f750-490a-a047-cccee6818c26';
const REQUEST_TIMEOUT = 10000; // 10 segundos
const MAX_RETRIES = 3;

// Tipos para las solicitudes a pgVector
interface VectorRequest {
  vector_table_name: string;
  meta_identificador: {
    identificador_name: string;
    value: string;
  };
  data: {
    plain_text_data: string;
    markdown_text: string;
    base_64_file: string;
    mime_type: string;
  };
}

interface VectorDeleteRequest {
  vector_table_name: string;
  meta_identificador: {
    identificador_name: string;
    value: string;
  };
}

// Tipos de respuesta de la API
interface VectorApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

// Tipos de entidades de conocimiento
type EntityType = 'service' | 'organization' | 'doctor' | 'doctor_service';

// Tipos de operaciones
type OperationType = 'create' | 'update' | 'delete';

// Interfaces para los datos de entidades
interface ServiceKnowledgeData {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  basePrice: string | null;
  organizationId: number;
  organizationName: string;
  organizationCurrency: string | null;
}

interface OrganizationKnowledgeData {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  nit: string | null;
}

interface DoctorServiceKnowledgeData {
  doctorId: number;
  doctorName: string | null;
  serviceId: number;
  serviceName: string;
  serviceDescription: string | null;
  serviceDurationMinutes: number;
  serviceBasePrice: string;
  customPrice: string | null;
  organizationId: number;
  organizationName: string;
}

export class KnowledgeManager {
  private readonly vectorTableName = 'general';
  private readonly identificadorName = 'unique_id';

  /**
   * Crea el conocimiento de un servicio médico en pgVector
   */
  async createServiceKnowledge(
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    await this.processServiceKnowledge(serviceId, organizationId, 'POST');
  }

  /**
   * Actualiza el conocimiento de un servicio médico en pgVector
   * Nota: El método PUT sobrescribe completamente los datos existentes
   */
  async updateServiceKnowledge(
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    await this.processServiceKnowledge(serviceId, organizationId, 'PUT');
  }

  /**
   * Crea o actualiza el conocimiento de un servicio médico (compatibilidad hacia atrás)
   * Detecta automáticamente si debe crear o actualizar
   * Nota: La actualización (PUT) sobrescribe completamente los datos existentes
   */
  async createOrUpdateServiceKnowledge(
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    try {
      // Intentar actualizar primero, si falla, crear
      try {
        await this.updateServiceKnowledge(serviceId, organizationId);
      } catch {
        console.log(`🔄 [KnowledgeManager] Actualizacion falló, creando nuevo conocimiento para servicio ${serviceId}`);
        await this.createServiceKnowledge(serviceId, organizationId);
      }
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error en createOrUpdateServiceKnowledge para servicio ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa el conocimiento de un servicio médico (crear o actualizar)
   */
  private async processServiceKnowledge(
    serviceId: number,
    organizationId: number,
    method: 'POST' | 'PUT'
  ): Promise<void> {
    try {
      const action = method === 'POST' ? 'Creando' : 'Actualizando';
      console.log(`🔄 [KnowledgeManager] ${action} servicio ${serviceId} para organización ${organizationId}`);

      // Obtener datos del servicio
      const serviceData = await this.getServiceData(serviceId, organizationId);
      if (!serviceData) {
        throw new Error(`Servicio ${serviceId} no encontrado para la organización ${organizationId}`);
      }

      // Generar identificador único
      const uniqueId = this.generateUniqueId(organizationId, 'service', serviceId);

      // Construir texto plano
      const plainText = this.buildServicePlainText(serviceData);

      // Preparar solicitud para pgVector
      const request: VectorRequest = {
        vector_table_name: this.vectorTableName,
        meta_identificador: {
          identificador_name: this.identificadorName,
          value: uniqueId
        },
        data: {
          plain_text_data: plainText,
          markdown_text: '',
          base_64_file: '',
          mime_type: ''
        }
      };

      // Hacer petición a la API de pgVector
      await this.makeVectorRequest(request, organizationId, method);
      
      const actionCompleted = method === 'POST' ? 'creado' : 'actualizado';
      console.log(`✅ [KnowledgeManager] Servicio ${serviceId} ${actionCompleted} exitosamente`);
    } catch (error) {
      const action = method === 'POST' ? 'creando' : 'actualizando';
      console.error(`❌ [KnowledgeManager] Error ${action} servicio ${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Crea el conocimiento de una organización en pgVector
   */
  async createOrganizationKnowledge(organizationId: number): Promise<void> {
    await this.processOrganizationKnowledge(organizationId, 'POST');
  }

  /**
   * Actualiza el conocimiento de una organización en pgVector
   * Nota: El método PUT sobrescribe completamente los datos existentes
   */
  async updateOrganizationKnowledge(organizationId: number): Promise<void> {
    await this.processOrganizationKnowledge(organizationId, 'PUT');
  }

  /**
   * Crea o actualiza el conocimiento de una organización (compatibilidad hacia atrás)
   * Detecta automáticamente si debe crear o actualizar
   * Nota: La actualización (PUT) sobrescribe completamente los datos existentes
   */
  async createOrUpdateOrganizationKnowledge(organizationId: number): Promise<void> {
    try {
      // Intentar actualizar primero, si falla, crear
      try {
        await this.updateOrganizationKnowledge(organizationId);
      } catch {
        console.log(`🔄 [KnowledgeManager] Actualizacion falló, creando nuevo conocimiento para organización ${organizationId}`);
        await this.createOrganizationKnowledge(organizationId);
      }
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error en createOrUpdateOrganizationKnowledge para organización ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa el conocimiento de una organización (crear o actualizar)
   */
  private async processOrganizationKnowledge(
    organizationId: number,
    method: 'POST' | 'PUT'
  ): Promise<void> {
    try {
      const action = method === 'POST' ? 'Creando' : 'Actualizando';
      console.log(`🔄 [KnowledgeManager] ${action} organización ${organizationId}`);

      // Obtener datos de la organización
      const orgData = await this.getOrganizationData(organizationId);
      if (!orgData) {
        throw new Error(`Organización ${organizationId} no encontrada`);
      }

      // Generar identificador único
      const uniqueId = this.generateUniqueId(organizationId, 'organization', organizationId);

      // Construir texto plano
      const plainText = this.buildOrganizationPlainText(orgData);

      // Preparar solicitud para pgVector
      const request: VectorRequest = {
        vector_table_name: this.vectorTableName,
        meta_identificador: {
          identificador_name: this.identificadorName,
          value: uniqueId
        },
        data: {
          plain_text_data: plainText,
          markdown_text: '',
          base_64_file: '',
          mime_type: ''
        }
      };

      // Hacer petición a la API de pgVector
      await this.makeVectorRequest(request, organizationId, method);
      
      const actionCompleted = method === 'POST' ? 'creada' : 'actualizada';
      console.log(`✅ [KnowledgeManager] Organización ${organizationId} ${actionCompleted} exitosamente`);
    } catch (error) {
      const action = method === 'POST' ? 'creando' : 'actualizando';
      console.error(`❌ [KnowledgeManager] Error ${action} organización ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Crea el conocimiento de una relación doctor-servicio en pgVector
   */
  async createDoctorServiceKnowledge(
    doctorId: number,
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    await this.processDoctorServiceKnowledge(doctorId, serviceId, organizationId, 'POST');
  }

  /**
   * Actualiza el conocimiento de una relación doctor-servicio en pgVector
   * Nota: El método PUT sobrescribe completamente los datos existentes
   */
  async updateDoctorServiceKnowledge(
    doctorId: number,
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    await this.processDoctorServiceKnowledge(doctorId, serviceId, organizationId, 'PUT');
  }

  /**
   * Crea o actualiza el conocimiento de una relación doctor-servicio (compatibilidad hacia atrás)
   * Detecta automáticamente si debe crear o actualizar
   * Nota: La actualización (PUT) sobrescribe completamente los datos existentes
   */
  async createOrUpdateDoctorServiceKnowledge(
    doctorId: number,
    serviceId: number,
    organizationId: number
  ): Promise<void> {
    try {
      // Intentar actualizar primero, si falla, crear
      try {
        await this.updateDoctorServiceKnowledge(doctorId, serviceId, organizationId);
      } catch {
        console.log(`🔄 [KnowledgeManager] Actualizacion falló, creando nuevo conocimiento para doctor-servicio ${doctorId}-${serviceId}`);
        await this.createDoctorServiceKnowledge(doctorId, serviceId, organizationId);
      }
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error en createOrUpdateDoctorServiceKnowledge para doctor-servicio ${doctorId}-${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa el conocimiento de una relación doctor-servicio (crear o actualizar)
   */
  private async processDoctorServiceKnowledge(
    doctorId: number,
    serviceId: number,
    organizationId: number,
    method: 'POST' | 'PUT'
  ): Promise<void> {
    try {
      const action = method === 'POST' ? 'Creando' : 'Actualizando';
      console.log(`🔄 [KnowledgeManager] ${action} doctor-servicio ${doctorId}-${serviceId} para organización ${organizationId}`);

      // Obtener datos de la relación doctor-servicio
      const doctorServiceData = await this.getDoctorServiceData(doctorId, serviceId, organizationId);
      if (!doctorServiceData) {
        throw new Error(`Relación doctor-servicio ${doctorId}-${serviceId} no encontrada para la organización ${organizationId}`);
      }

      // Generar identificador único
      const uniqueId = this.generateUniqueId(organizationId, 'doctor_service', doctorId, serviceId);

      // Construir texto plano
      const plainText = this.buildDoctorServicePlainText(doctorServiceData);

      // Preparar solicitud para pgVector
      const request: VectorRequest = {
        vector_table_name: this.vectorTableName,
        meta_identificador: {
          identificador_name: this.identificadorName,
          value: uniqueId
        },
        data: {
          plain_text_data: plainText,
          markdown_text: '',
          base_64_file: '',
          mime_type: ''
        }
      };

      // Hacer petición a la API de pgVector
      await this.makeVectorRequest(request, organizationId, method);
      
      const actionCompleted = method === 'POST' ? 'creado' : 'actualizado';
      console.log(`✅ [KnowledgeManager] Doctor-servicio ${doctorId}-${serviceId} ${actionCompleted} exitosamente`);
    } catch (error) {
      const action = method === 'POST' ? 'creando' : 'actualizando';
      console.error(`❌ [KnowledgeManager] Error ${action} doctor-servicio ${doctorId}-${serviceId}:`, error);
      throw error;
    }
  }

  /**
   * Elimina conocimiento de pgVector
   */
  async deleteKnowledge(uniqueId: string, organizationId: number): Promise<void> {
    try {
      console.log(`🗑️ [KnowledgeManager] Eliminando conocimiento: ${uniqueId}`);

      // Preparar solicitud de eliminación
      const request: VectorDeleteRequest = {
        vector_table_name: this.vectorTableName,
        meta_identificador: {
          identificador_name: this.identificadorName,
          value: uniqueId
        }
      };

      // Hacer petición DELETE a la API de pgVector
      await this.makeVectorDeleteRequest(request, organizationId);
      
      console.log(`✅ [KnowledgeManager] Conocimiento ${uniqueId} eliminado exitosamente`);
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error eliminando conocimiento ${uniqueId}:`, error);
      throw error;
    }
  }

  /**
   * Genera un identificador único para pgVector
   */
  generateUniqueId(
    organizationId: number,
    entityType: EntityType,
    entityId: number,
    subType?: number
  ): string {
    if (subType !== undefined) {
      return `${organizationId}_${entityType}_${entityId}_${subType}`;
    }
    return `${organizationId}_${entityType}_${entityId}`;
  }

  /**
   * Hace una petición HTTP a la API de pgVector con reintentos
   */
  private async makeVectorRequest(request: VectorRequest, organizationId: number, method: 'POST' | 'PUT' = 'POST'): Promise<void> {
    let lastError: Error | null = null;
    
    // Obtener el API Key de la organización
    const apiKey = await this.getOrganizationApiKey(organizationId);
    if (!apiKey) {
      throw new Error(`API Key no encontrada para la organización ${organizationId}`);
    }
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`📤 [KnowledgeManager] Intento ${attempt}/${MAX_RETRIES} - Enviando a pgVector:`, {
          uniqueId: request.meta_identificador.value,
          textLength: request.data.plain_text_data.length,
          organizationId
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        const response = await fetch(PGVECTOR_API_URL, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: VectorApiResponse = await response.json();
        
        if (result.error) {
          throw new Error(`API Error: ${result.error}`);
        }

        console.log(`✅ [KnowledgeManager] Petición exitosa en intento ${attempt}`);
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ [KnowledgeManager] Intento ${attempt} falló:`, lastError.message);
        
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Backoff exponencial
          console.log(`⏳ [KnowledgeManager] Esperando ${delay}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Falló después de ${MAX_RETRIES} intentos. Último error: ${lastError?.message}`);
  }

  /**
   * Hace una petición DELETE a la API de pgVector
   */
  private async makeVectorDeleteRequest(request: VectorDeleteRequest, organizationId: number): Promise<void> {
    let lastError: Error | null = null;
    
    // Obtener el API Key de la organización
    const apiKey = await this.getOrganizationApiKey(organizationId);
    if (!apiKey) {
      throw new Error(`API Key no encontrada para la organización ${organizationId}`);
    }
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🗑️ [KnowledgeManager] Intento ${attempt}/${MAX_RETRIES} - Eliminando de pgVector:`, {
          uniqueId: request.meta_identificador.value,
          organizationId
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        // Nota: Asumiendo que la API acepta DELETE con body JSON
        // Si no es así, se puede cambiar a POST con un flag de eliminación
        const response = await fetch(PGVECTOR_API_URL, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(request),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: VectorApiResponse = await response.json();
        
        if (result.error) {
          throw new Error(`API Error: ${result.error}`);
        }

        console.log(`✅ [KnowledgeManager] Eliminación exitosa en intento ${attempt}`);
        return;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ [KnowledgeManager] Intento ${attempt} de eliminación falló:`, lastError.message);
        
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Backoff exponencial
          console.log(`⏳ [KnowledgeManager] Esperando ${delay}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Eliminación falló después de ${MAX_RETRIES} intentos. Último error: ${lastError?.message}`);
  }

  /**
   * Obtiene el API Key de una organización
   */
  private async getOrganizationApiKey(organizationId: number): Promise<string | null> {
    try {
      const result = await db
        .select({
          apiKey: organization.apiKey
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      return result[0]?.apiKey || null;
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error obteniendo API Key de la organización ${organizationId}:`, error);
      return null;
    }
  }

  // Métodos privados para obtener datos de la base de datos

  /**
   * Obtiene los datos de un servicio médico
   */
  private async getServiceData(serviceId: number, organizationId: number): Promise<ServiceKnowledgeData | null> {
    try {
      const result = await db
        .select({
          id: medicalServices.id,
          name: medicalServices.name,
          description: medicalServices.description,
          durationMinutes: medicalServices.durationMinutes,
          basePrice: medicalServices.basePrice,
          organizationId: medicalServices.organizationId,
          organizationName: organization.name,
          organizationCurrency: organization.currency
        })
        .from(medicalServices)
        .innerJoin(organization, eq(medicalServices.organizationId, organization.id))
        .where(
          and(
            eq(medicalServices.id, serviceId),
            eq(medicalServices.organizationId, organizationId)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error obteniendo datos del servicio ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene los datos de una organización
   */
  private async getOrganizationData(organizationId: number): Promise<OrganizationKnowledgeData | null> {
    try {
      const result = await db
        .select({
          id: organization.id,
          name: organization.name,
          address: organization.address,
          phone: organization.phone,
          email: organization.email,
          nit: organization.nit
        })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error obteniendo datos de la organización ${organizationId}:`, error);
      return null;
    }
  }

  /**
   * Obtiene los datos de una relación doctor-servicio
   */
  private async getDoctorServiceData(
    doctorId: number,
    serviceId: number,
    organizationId: number
  ): Promise<DoctorServiceKnowledgeData | null> {
    try {
      const result = await db
        .select({
          doctorId: doctors.idDoctor,
          doctorName: users.displayName,
          serviceId: medicalServices.id,
          serviceName: medicalServices.name,
          serviceDescription: medicalServices.description,
          serviceDurationMinutes: medicalServices.durationMinutes,
          serviceBasePrice: medicalServices.basePrice,
          customPrice: doctorServices.customPrice,
          organizationId: organization.id,
          organizationName: organization.name
        })
        .from(doctorServices)
        .innerJoin(doctors, eq(doctorServices.doctorId, doctors.idDoctor))
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(medicalServices, eq(doctorServices.serviceId, medicalServices.id))
        .innerJoin(organization, eq(medicalServices.organizationId, organization.id))
        .where(
          and(
            eq(doctorServices.doctorId, doctorId),
            eq(doctorServices.serviceId, serviceId),
            eq(organization.id, organizationId)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error(`❌ [KnowledgeManager] Error obteniendo datos doctor-servicio ${doctorId}-${serviceId}:`, error);
      return null;
    }
  }

  // Métodos para construir texto plano

  /**
   * Construye el texto plano para un servicio médico
   */
  private buildServicePlainText(data: ServiceKnowledgeData): string {
    const parts = [
      `Servicio Médico: ${data.name}`,
      `ID del Servicio: ${data.id}`,
      `Organización: ${data.organizationName} (ID: ${data.organizationId})`,
    ];

    if (data.description) {
      parts.push(`Descripción: ${data.description}`);
    }

    if (data.durationMinutes) {
      parts.push(`Duración: ${data.durationMinutes} minutos`);
    }

    if (data.basePrice) {
      const currency = data.organizationCurrency || 'COP';
      parts.push(`Precio: ${data.basePrice} ${currency}`);
    }

    return parts.join('\n');
  }

  /**
   * Construye el texto plano para una organización
   */
  private buildOrganizationPlainText(data: OrganizationKnowledgeData): string {
    const parts = [
      `Empresa: ${data.name}`,
      `Nombre de la organización: ${data.name}`,
    ];

    if (data.address) {
      parts.push(`Dirección de la empresa: ${data.address}`);
      parts.push(`Ubicación: ${data.address}`);
    }

    if (data.phone) {
      parts.push(`Teléfono de contacto: ${data.phone}`);
      parts.push(`Número telefónico: ${data.phone}`);
    }

    if (data.email) {
      parts.push(`Correo electrónico: ${data.email}`);
      parts.push(`Email de contacto: ${data.email}`);
    }

    // Información adicional para búsquedas
    parts.push(`Información de contacto de ${data.name}`);
    if (data.address && data.phone && data.email) {
      parts.push(`Datos completos de contacto: ${data.name} - ${data.address} - ${data.phone} - ${data.email}`);
    }

    return parts.join('\n');
  }

  /**
   * Construye el texto plano para una relación doctor-servicio
   */
  private buildDoctorServicePlainText(data: DoctorServiceKnowledgeData): string {
    const parts = [
      `Doctor: ${data.doctorName || 'Sin nombre'} (ID: ${data.doctorId})`,
      `Servicio: ${data.serviceName} (ID: ${data.serviceId})`,
      `Organización: ${data.organizationName} (ID: ${data.organizationId})`,
    ];

    if (data.serviceDescription) {
      parts.push(`Descripción del Servicio: ${data.serviceDescription}`);
    }

    parts.push(`Duración del Servicio: ${data.serviceDurationMinutes} minutos`);
    
    // Usar precio personalizado si existe, sino usar precio base del servicio
    const finalPrice = data.customPrice || data.serviceBasePrice;
    parts.push(`Precio del Servicio: $${finalPrice}`);

    return parts.join('\n');
  }


}

// Función de utilidad para sincronización automática
export async function syncKnowledgeAfterCRUD(
  entityType: EntityType,
  operation: OperationType,
  entityData: Record<string, unknown>
): Promise<void> {
  try {
    const knowledgeManager = new KnowledgeManager();
    
    console.log(`🔄 [syncKnowledgeAfterCRUD] ${operation} ${entityType}:`, entityData);

    switch (entityType) {
      case 'service':
        if (operation === 'delete') {
          const uniqueId = knowledgeManager.generateUniqueId(
            entityData.organizationId as number,
            'service',
            entityData.id as number
          );
          await knowledgeManager.deleteKnowledge(uniqueId, entityData.organizationId as number);
        } else if (operation === 'create') {
           await knowledgeManager.createServiceKnowledge(
             entityData.id as number,
             entityData.organizationId as number
           );
         } else if (operation === 'update') {
           await knowledgeManager.updateServiceKnowledge(
             entityData.id as number,
             entityData.organizationId as number
           );
         } else {
           // Compatibilidad hacia atrás para operaciones no específicas
           await knowledgeManager.createOrUpdateServiceKnowledge(
             entityData.id as number,
             entityData.organizationId as number
           );
        }
        break;

      case 'organization':
        if (operation === 'delete') {
          const uniqueId = knowledgeManager.generateUniqueId(
            entityData.id as number,
            'organization',
            entityData.id as number
          );
          await knowledgeManager.deleteKnowledge(uniqueId, entityData.id as number);
        } else if (operation === 'create') {
           await knowledgeManager.createOrganizationKnowledge(
             entityData.id as number
           );
         } else if (operation === 'update') {
           await knowledgeManager.updateOrganizationKnowledge(
             entityData.id as number
           );
         } else {
           // Compatibilidad hacia atrás para operaciones no específicas
           await knowledgeManager.createOrUpdateOrganizationKnowledge(
             entityData.id as number
           );
        }
        break;

      case 'doctor_service':
        if (operation === 'delete') {
          const uniqueId = knowledgeManager.generateUniqueId(
            entityData.organizationId as number,
            'doctor_service',
            entityData.doctorId as number,
            entityData.serviceId as number
          );
          await knowledgeManager.deleteKnowledge(uniqueId, entityData.organizationId as number);
        } else if (operation === 'create') {
           await knowledgeManager.createDoctorServiceKnowledge(
             entityData.doctorId as number,
             entityData.serviceId as number,
             entityData.organizationId as number
           );
         } else if (operation === 'update') {
           await knowledgeManager.updateDoctorServiceKnowledge(
             entityData.doctorId as number,
             entityData.serviceId as number,
             entityData.organizationId as number
           );
         } else {
           // Compatibilidad hacia atrás para operaciones no específicas
           await knowledgeManager.createOrUpdateDoctorServiceKnowledge(
             entityData.doctorId as number,
             entityData.serviceId as number,
             entityData.organizationId as number
           );
        }
        break;

      default:
        console.warn(`⚠️ [syncKnowledgeAfterCRUD] Tipo de entidad no soportado: ${entityType}`);
    }
  } catch (error) {
    console.error(`❌ [syncKnowledgeAfterCRUD] Error en sincronización:`, error);
    // No lanzar el error para evitar que afecte la operación principal
  }
}

// Instancia singleton del gestor de conocimiento
export const knowledgeManager = new KnowledgeManager();