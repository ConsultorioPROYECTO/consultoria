/**
 * @fileoverview API endpoint to list R2 objects by paths/prefixes for admin exploration
 * @route GET /api/attachments/list-by-paths
 * @auth Required - withOptimizedAdminAuth (admin only)
 */

import { NextRequest } from 'next/server';
import { withOptimizedAdminAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/types/api';
import { db } from '@/db';
import { r2Objects } from '@/db/schema';
import { and, eq, sql, desc, asc } from 'drizzle-orm';

interface PathGroup {
  prefix: string;
  count: number;
  totalSize: number;
  latestCreatedAt: Date;
  items?: AttachmentPathItem[];
}

interface AttachmentPathItem {
  id: number;
  objectKey: string;
  objectName: string;
  contentType: string;
  fileSize: number;
  fileCategory: string;
  createdAt: Date;
  isActive: boolean;
}

interface AttachmentListByPathsResponse {
  groups: PathGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    prefix?: string;
    depth?: number;
    includeItems?: boolean;
  };
}

async function handleAttachmentsListByPaths(req: NextRequest, userInfo: AuthenticatedUserInfo): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const prefix = searchParams.get('prefix') || '';
    const depth = Math.max(1, Math.min(10, parseInt(searchParams.get('depth') || '1', 10)));
    const includeItems = searchParams.get('includeItems') === 'true';
    const sortBy = searchParams.get('sortBy') || 'latestCreatedAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    
    const orgId = userInfo.organizationInfo!.id;
    
    // Build WHERE conditions
    const whereConditions = [
      eq(r2Objects.organizationId, orgId),
      eq(r2Objects.isActive, true)
    ];
    
    // Add prefix filter if provided
    if (prefix.trim().length > 0) {
      const prefixPattern = `${prefix.trim()}%`;
      whereConditions.push(sql`${r2Objects.objectKey} LIKE ${prefixPattern}`);
    }
    
    const whereClause = and(...whereConditions);
    
    // For simplicity, we'll extract path segments using SQL substring operations
    // This creates a prefix based on the depth parameter by extracting segments separated by '/'
    const segmentExtraction = depth === 1 
      ? sql<string>`SUBSTRING_INDEX(${r2Objects.objectKey}, '/', 1)` 
      : sql<string>`SUBSTRING_INDEX(${r2Objects.objectKey}, '/', ${depth})`;
    
    // Query to get path groups with aggregations
    const groupsQuery = db
      .select({
        prefix: segmentExtraction,
        count: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${r2Objects.fileSize})`,
        latestCreatedAt: sql<Date>`MAX(${r2Objects.createdAt})`,
      })
      .from(r2Objects)
      .where(whereClause)
      .groupBy(segmentExtraction);
    
    // Get total count of groups for pagination
    const groupsResult = await groupsQuery;
    const total = groupsResult.length;
    const totalPages = Math.ceil(total / limit);
    
    // Apply sorting to groups
    let orderByClause;
    switch (sortBy) {
      case 'prefix':
        orderByClause = sortOrder === 'asc' ? asc(segmentExtraction) : desc(segmentExtraction);
        break;
      case 'count':
        orderByClause = sortOrder === 'asc' ? asc(sql`COUNT(*)`) : desc(sql`COUNT(*)`);
        break;
      case 'totalSize':
        orderByClause = sortOrder === 'asc' ? asc(sql`SUM(${r2Objects.fileSize})`) : desc(sql`SUM(${r2Objects.fileSize})`);
        break;
      default: // latestCreatedAt
        orderByClause = sortOrder === 'asc' ? asc(sql`MAX(${r2Objects.createdAt})`) : desc(sql`MAX(${r2Objects.createdAt})`);
    }
    
    // Get paginated groups with sorting
    const paginatedGroupsQuery = await db
      .select({
        prefix: segmentExtraction,
        count: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${r2Objects.fileSize})`,
        latestCreatedAt: sql<Date>`MAX(${r2Objects.createdAt})`,
      })
      .from(r2Objects)
      .where(whereClause)
      .groupBy(segmentExtraction)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
    
    // Transform results and optionally fetch items for each group
    const groups: PathGroup[] = [];
    
    for (const group of paginatedGroupsQuery) {
      const pathGroup: PathGroup = {
        prefix: group.prefix,
        count: group.count,
        totalSize: group.totalSize,
        latestCreatedAt: group.latestCreatedAt,
      };
      
      // If includeItems is true, fetch items for this specific prefix
      if (includeItems) {
        const itemsForGroup = await db
          .select({
            id: r2Objects.id,
            objectKey: r2Objects.objectKey,
            objectName: r2Objects.objectName,
            contentType: r2Objects.contentType,
            fileSize: r2Objects.fileSize,
            fileCategory: r2Objects.fileCategory,
            createdAt: r2Objects.createdAt,
            isActive: r2Objects.isActive,
          })
          .from(r2Objects)
          .where(
            and(
              eq(r2Objects.organizationId, orgId),
              eq(r2Objects.isActive, true),
              sql`${segmentExtraction} = ${group.prefix}`
            )
          )
          .orderBy(desc(r2Objects.createdAt))
          .limit(10); // Limit items per group to avoid huge responses
        
        pathGroup.items = itemsForGroup;
      }
      
      groups.push(pathGroup);
    }
    
    const response: AttachmentListByPathsResponse = {
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      filters: {
        prefix: prefix || undefined,
        depth,
        includeItems,
      },
    };
    
    return createSuccessResponse(response, 'Attachment paths retrieved successfully', HTTP_STATUS.OK);
    
  } catch (error) {
    console.error('Error listing attachments by paths:', error);
    return createErrorResponse('Internal server error', 'Could not retrieve attachment paths', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export const GET = withOptimizedAdminAuth(handleAttachmentsListByPaths);