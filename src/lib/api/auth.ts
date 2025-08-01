// src/lib/api/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/lib/firebase/server/adminConfig';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof db.query.users.findFirst>>>;

type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthenticatedUser,
  context: { params: { [key: string]: string | string[] | undefined } }
) => Promise<NextResponse | Response>;

export function withAuthorizedUser(
  handler: AuthenticatedHandler,
  allowedRoles: string[]
) {
  return async (
    request: NextRequest,
    context: { params: { [key: string]: string | string[] | undefined } }
  ): Promise<NextResponse | Response> => {
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];

    if (!idToken) {
      return createErrorResponse(API_ERRORS.UNAUTHORIZED, 'No token provided', HTTP_STATUS.UNAUTHORIZED);
    }

    try {
      const decodedToken: DecodedIdToken = await auth.verifyIdToken(idToken);
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, decodedToken.uid),
      });

      if (!user || !user.organizationId) {
        return createErrorResponse(API_ERRORS.USER_NOT_FOUND, 'User not found or not part of an organization', HTTP_STATUS.FORBIDDEN);
      }

      if (!allowedRoles.includes(user.role)) {
        return createErrorResponse(API_ERRORS.FORBIDDEN, 'You do not have permission to perform this action', HTTP_STATUS.FORBIDDEN);
      }

      return handler(request, user, context);
    } catch (error) {
      console.error('Authentication error:', error);
      return createErrorResponse(API_ERRORS.UNAUTHORIZED, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
    }
  };
}