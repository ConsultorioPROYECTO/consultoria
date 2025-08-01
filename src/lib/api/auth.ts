/**
 * @fileoverview This file contains authentication middleware for API routes.
 * It provides a higher-order function to protect routes and check user roles.
 * @module lib/api/auth
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/lib/firebase/server/adminConfig';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';

/**
 * Represents the authenticated user object retrieved from the database.
 * @typedef {NonNullable<Awaited<ReturnType<typeof db.query.users.findFirst>>>} AuthenticatedUser
 */
type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof db.query.users.findFirst>>>;

/**
 * Defines the shape of a handler function that requires an authenticated user.
 * @callback AuthenticatedHandler
 * @param {NextRequest} request - The incoming request object.
 * @param {AuthenticatedUser} user - The authenticated user object.
 * @param {object} context - The context object, containing route parameters.
 * @returns {Promise<NextResponse | Response>}
 */
type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthenticatedUser,
  context: { params: { [key: string]: string | string[] | undefined } }
) => Promise<NextResponse | Response>;

/**
 * A higher-order function that wraps an API route handler to enforce authentication and role-based authorization.
 * It verifies the Firebase ID token, retrieves the user from the database, and checks if their role is allowed.
 * @param {AuthenticatedHandler} handler - The handler function to execute if the user is authorized.
 * @param {string[]} allowedRoles - An array of roles that are allowed to access the route.
 * @returns {function(NextRequest, object): Promise<NextResponse | Response>} A new handler function that includes the authentication and authorization logic.
 */
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