/**
 * @fileoverview API endpoint to list R2 objects (attachments) with filtering and pagination
 * @route GET /api/attachments/list
 * @auth Required - withOptimizedAuthentication
 */

import { NextRequest } from 'next/server';
import { withOptimizedAuthentication, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/types/api';
import { db } from '@/db';
import { r2Objects, doctors, patients, appointments, medicalServices } from '@/db/schema';
import { and, eq, desc, asc, sql, gte, lte, or } from 'drizzle-orm';

interface AttachmentListItem {
  id: number;
  objectKey: string;
  objectName: string;
  contentType: string;
  fileSize: number;
  fileCategory: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  accessLevel: string;
  createdAt: Date;
  
  // Relacionados
  doctor?: {
    idDoctor: number;
    speciality: string;
    user?: {
      displayName: string | null;
      email: string | null;
    };
  } | null;
  
  patient?: {
    id: number;
    firstName: string;
    lastName: string;
    identificationNumber: string;
  } | null;
  
  appointment?: {
    id: number;
    appointmentDate: Date;
    appointmentTime: string;
    status: string;
  } | null;
  
  medicalService?: {
    id: number;
    name: string;
    category: string;
  } | null;
  
  uploadedByUser?: {
    id: number;
    displayName: string | null;
    email: string | null;
  } | null;
}

interface AttachmentListResponse {
  items: AttachmentListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    doctorId?: number;
    patientId?: number;
    appointmentId?: number;
    medicalServiceId?: number;
    fileCategory?: string;
    isActive?: boolean;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

async function handleAttachmentsList(req: NextRequest, userInfo: AuthenticatedUserInfo): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const doctorId = searchParams.get('doctorId') ? parseInt(searchParams.get('doctorId')!, 10) : undefined;
    const patientId = searchParams.get('patientId') ? parseInt(searchParams.get('patientId')!, 10) : undefined;
    const appointmentId = searchParams.get('appointmentId') ? parseInt(searchParams.get('appointmentId')!, 10) : undefined;
    const medicalServiceId = searchParams.get('medicalServiceId') ? parseInt(searchParams.get('medicalServiceId')!, 10) : undefined;
    const fileCategory = searchParams.get('fileCategory') || undefined;
    const isActiveParam = searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    
    // Sort parameters
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    const orgId = userInfo.organizationInfo!.id;
    
    // Build WHERE conditions
    const whereConditions = [eq(r2Objects.organizationId, orgId)];
    
    if (doctorId !== undefined) {
      whereConditions.push(eq(r2Objects.doctorId, doctorId));
    }
    
    if (patientId !== undefined) {
      whereConditions.push(eq(r2Objects.patientId, patientId));
    }
    
    if (appointmentId !== undefined) {
      whereConditions.push(eq(r2Objects.appointmentId, appointmentId));
    }
    
    if (medicalServiceId !== undefined) {
      whereConditions.push(eq(r2Objects.medicalServiceId, medicalServiceId));
    }
    
    if (fileCategory) {
      type FileCategory = typeof r2Objects.$inferSelect['fileCategory'];
      const allowedCategories = (r2Objects.fileCategory.enumValues as readonly string[]) ?? [];
      if (!allowedCategories.includes(fileCategory)) {
        return createErrorResponse('Invalid fileCategory', `fileCategory must be one of: ${allowedCategories.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
      }
      whereConditions.push(eq(r2Objects.fileCategory, fileCategory as FileCategory));
    }
    
    if (isActive !== undefined) {
      whereConditions.push(eq(r2Objects.isActive, isActive));
    }
    
    if (search && search.trim().length > 0) {
      const searchTerm = `%${search.trim()}%`;
      const searchCondition = or(
        sql`${r2Objects.objectName} LIKE ${searchTerm}`,
        sql`${r2Objects.description} LIKE ${searchTerm}`
      );
      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }
    
    if (dateFrom) {
      whereConditions.push(gte(r2Objects.createdAt, new Date(dateFrom)));
    }
    
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Include the full day
      whereConditions.push(lte(r2Objects.createdAt, endDate));
    }
    
    const whereClause = and(...whereConditions);
    
    // Count total items
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(r2Objects)
      .where(whereClause);
    
    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    // Get items with relations
    const baseQuery = db
      .select({
        id: r2Objects.id,
        objectKey: r2Objects.objectKey,
        objectName: r2Objects.objectName,
        contentType: r2Objects.contentType,
        fileSize: r2Objects.fileSize,
        fileCategory: r2Objects.fileCategory,
        description: r2Objects.description,
        isActive: r2Objects.isActive,
        isPublic: r2Objects.isPublic,
        accessLevel: r2Objects.accessLevel,
        createdAt: r2Objects.createdAt,
        
        // Doctor info
        doctorId: r2Objects.doctorId,
        doctorSpeciality: doctors.speciality,
        doctorUserId: doctors.userId,
        doctorUserDisplayName: sql<string | null>`doctor_user.display_name`,
        doctorUserEmail: sql<string | null>`doctor_user.email`,
        
        // Patient info
        patientId: r2Objects.patientId,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientIdentificationNumber: patients.identificationNumber,
        
        // Appointment info
        appointmentId: r2Objects.appointmentId,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        appointmentStatus: appointments.status,
        
        // Medical service info
        medicalServiceId: r2Objects.medicalServiceId,
        medicalServiceName: medicalServices.name,
        medicalServiceCategory: medicalServices.category,
        
        // Uploaded by user info
        uploadedById: r2Objects.uploadedBy,
        uploadedByDisplayName: sql<string | null>`uploaded_user.display_name`,
        uploadedByEmail: sql<string | null>`uploaded_user.email`,
      })
      .from(r2Objects)
      .leftJoin(doctors, eq(r2Objects.doctorId, doctors.idDoctor))
      .leftJoin(sql`users AS doctor_user`, eq(doctors.userId, sql`doctor_user.id`))
      .leftJoin(patients, eq(r2Objects.patientId, patients.id))
      .leftJoin(appointments, eq(r2Objects.appointmentId, appointments.id))
      .leftJoin(medicalServices, eq(r2Objects.medicalServiceId, medicalServices.id))
      .leftJoin(sql`users AS uploaded_user`, eq(r2Objects.uploadedBy, sql`uploaded_user.id`))
      .where(whereClause);
    
    // Apply sorting
    let orderByClause = sortOrder === 'asc' ? asc(r2Objects.createdAt) : desc(r2Objects.createdAt);
    switch (sortBy) {
      case 'objectName':
        orderByClause = sortOrder === 'asc' ? asc(r2Objects.objectName) : desc(r2Objects.objectName);
        break;
      case 'fileSize':
        orderByClause = sortOrder === 'asc' ? asc(r2Objects.fileSize) : desc(r2Objects.fileSize);
        break;
      case 'fileCategory':
        orderByClause = sortOrder === 'asc' ? asc(r2Objects.fileCategory) : desc(r2Objects.fileCategory);
        break;
      default:
        orderByClause = sortOrder === 'asc' ? asc(r2Objects.createdAt) : desc(r2Objects.createdAt);
    }
    
    const items = await baseQuery
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    // Transform the results
    const transformedItems: AttachmentListItem[] = items.map(item => ({
      id: item.id,
      objectKey: item.objectKey,
      objectName: item.objectName,
      contentType: item.contentType,
      fileSize: item.fileSize,
      fileCategory: item.fileCategory,
      description: item.description,
      isActive: item.isActive,
      isPublic: item.isPublic,
      accessLevel: item.accessLevel,
      createdAt: item.createdAt,
      
      doctor: item.doctorId ? {
        idDoctor: item.doctorId,
        speciality: item.doctorSpeciality || '',
        user: {
          displayName: item.doctorUserDisplayName,
          email: item.doctorUserEmail,
        },
      } : null,
      
      patient: item.patientId ? {
        id: item.patientId,
        firstName: item.patientFirstName || '',
        lastName: item.patientLastName || '',
        identificationNumber: item.patientIdentificationNumber || '',
      } : null,
      
      appointment: item.appointmentId ? {
        id: item.appointmentId,
        appointmentDate: item.appointmentDate || new Date(),
        appointmentTime: item.appointmentTime || '',
        status: item.appointmentStatus || '',
      } : null,
      
      medicalService: item.medicalServiceId ? {
        id: item.medicalServiceId,
        name: item.medicalServiceName || '',
        category: item.medicalServiceCategory || '',
      } : null,
      
      uploadedByUser: item.uploadedById ? {
        id: item.uploadedById,
        displayName: item.uploadedByDisplayName,
        email: item.uploadedByEmail,
      } : null,
    }));
    
    const response: AttachmentListResponse = {
      items: transformedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        doctorId,
        patientId,
        appointmentId,
        medicalServiceId,
        fileCategory,
        isActive,
        search,
        dateFrom,
        dateTo,
      },
    };
    
    return createSuccessResponse(response, 'Attachments retrieved successfully', HTTP_STATUS.OK);
    
  } catch (error) {
    console.error('Error listing attachments:', error);
    return createErrorResponse('Internal server error', 'Could not retrieve attachments', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export const GET = withOptimizedAuthentication(handleAttachmentsList, { requireOrganization: true });