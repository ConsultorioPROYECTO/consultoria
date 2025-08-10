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
import { z } from 'zod';

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

// Zod schema for query parameters validation
const listByPathsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  prefix: z.string().trim().optional().default(''),
  depth: z.coerce.number().int().min(1).max(10).default(1),
  includeItems: z.coerce.boolean().optional().default(false),
  sortBy: z.enum(['latestCreatedAt', 'prefix', 'count', 'totalSize']).default('latestCreatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

async function handleAttachmentsListByPaths(req: NextRequest, userInfo: AuthenticatedUserInfo): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);

    // Parse and validate query params with Zod
    const parseResult = listByPathsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      prefix: searchParams.get('prefix') ?? undefined,
      depth: searchParams.get('depth'),
      includeItems: searchParams.get('includeItems'),
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    });

    if (!parseResult.success) {
      return createErrorResponse(
        'Invalid query parameters',
        parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const {
      page,
      limit,
      prefix,
      depth,
      includeItems,
      sortBy,
      sortOrder,
    } = parseResult.data;

    const offset = (page - 1) * limit;

    const orgId = userInfo.organizationInfo!.id;

    // Normalize prefix to avoid leading/trailing slashes and ensure consistent behavior
    const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '');
    const hasPrefix = normalizedPrefix.length > 0;

    // Build WHERE conditions
    const whereConditions = [
      eq(r2Objects.organizationId, orgId),
      eq(r2Objects.isActive, true),
    ];

    // Add precise prefix filter if provided (match only keys under the given folder)
    if (hasPrefix) {
      // Match everything under `normalizedPrefix/` (children and descendants)
      const likePattern = `${normalizedPrefix}/%`;
      whereConditions.push(sql`${r2Objects.objectKey} LIKE ${likePattern}`);
    }

    const whereClause = and(...whereConditions);

    // Compute a relative key (portion after the provided prefix and the following slash)
    // Then group by the first `depth` segments of that relative key.
    // This makes grouping relative to the current navigation context.
    const relativeKey = sql<string>`
      CASE 
        WHEN ${normalizedPrefix} = '' THEN ${r2Objects.objectKey}
        ELSE SUBSTRING(${r2Objects.objectKey}, CHAR_LENGTH(${normalizedPrefix}) + 2)
      END
    `;

    const groupExtraction = sql<string>`SUBSTRING_INDEX(${relativeKey}, '/', ${depth})`;

    // Query to get path groups with aggregations
    const groupsQuery = db
      .select({
        prefix: groupExtraction,
        count: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${r2Objects.fileSize})`,
        latestCreatedAt: sql<Date>`MAX(${r2Objects.createdAt})`,
      })
      .from(r2Objects)
      .where(whereClause)
      .groupBy(groupExtraction);

    // Get total count of groups for pagination
    const groupsResult = await groupsQuery;
    const total = groupsResult.length;
    const totalPages = Math.ceil(total / limit);

    // Apply sorting to groups
    let orderByClause = sortOrder === 'asc' ? asc(sql`MAX(${r2Objects.createdAt})`) : desc(sql`MAX(${r2Objects.createdAt})`);
    switch (sortBy) {
      case 'prefix':
        orderByClause = sortOrder === 'asc' ? asc(groupExtraction) : desc(groupExtraction);
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
        prefix: groupExtraction,
        count: sql<number>`COUNT(*)`,
        totalSize: sql<number>`SUM(${r2Objects.fileSize})`,
        latestCreatedAt: sql<Date>`MAX(${r2Objects.createdAt})`,
      })
      .from(r2Objects)
      .where(whereClause)
      .groupBy(groupExtraction)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Transform results and optionally fetch items for each group
    const groups: PathGroup[] = [];

    for (const group of paginatedGroupsQuery) {
      const pathGroup: PathGroup = {
        prefix: group.prefix, // NOTE: relative to current prefix
        count: group.count,
        totalSize: group.totalSize,
        latestCreatedAt: group.latestCreatedAt,
      };

      // If includeItems is true, fetch items for this specific group under the computed full prefix
      if (includeItems) {
        // Build the full absolute prefix for this group (normalizedPrefix + '/' + group.prefix)
        const groupFullPrefix = hasPrefix ? `${normalizedPrefix}/${group.prefix}` : group.prefix;
        const groupLikePattern = `${groupFullPrefix}/%`;

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
              sql`${r2Objects.objectKey} LIKE ${groupLikePattern}`
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
        prefix: normalizedPrefix || undefined,
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