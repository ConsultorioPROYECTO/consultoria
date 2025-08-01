// src/lib/api/response-helpers.ts
import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';

export function notFoundResponse(entity: string): NextResponse {
  return createErrorResponse(API_ERRORS.NOT_FOUND, `${entity} not found`, HTTP_STATUS.NOT_FOUND);
}

export function unauthorizedResponse(): NextResponse {
  return createErrorResponse(API_ERRORS.UNAUTHORIZED, 'You are not authorized to perform this action', HTTP_STATUS.UNAUTHORIZED);
}

export function invalidRequestResponse(message: string): NextResponse {
  return createErrorResponse(API_ERRORS.INVALID_REQUEST, message, HTTP_STATUS.BAD_REQUEST);
}

export function successResponse(data: unknown, message: string, status: number = HTTP_STATUS.OK): NextResponse {
  return createSuccessResponse(data, message, status);
}