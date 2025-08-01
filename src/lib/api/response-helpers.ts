/**
 * @fileoverview This file contains helper functions for creating standardized API responses,
 * such as success, not found, unauthorized, and invalid request responses.
 * @module lib/api/response-helpers
 */
import { NextResponse } from 'next/server';
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';

/**
 * Creates a standardized 'Not Found' response.
 * @param {string} entity - The name of the entity that was not found (e.g., 'Patient', 'Appointment').
 * @returns {NextResponse} A NextResponse object with a 404 status code.
 */
export function notFoundResponse(entity: string): NextResponse {
  return createErrorResponse(API_ERRORS.NOT_FOUND, `${entity} not found`, HTTP_STATUS.NOT_FOUND);
}

/**
 * Creates a standardized 'Unauthorized' response.
 * @returns {NextResponse} A NextResponse object with a 401 status code.
 */
export function unauthorizedResponse(): NextResponse {
  return createErrorResponse(API_ERRORS.UNAUTHORIZED, 'You are not authorized to perform this action', HTTP_STATUS.UNAUTHORIZED);
}

/**
 * Creates a standardized 'Invalid Request' response.
 * @param {string} message - A specific message explaining why the request is invalid.
 * @returns {NextResponse} A NextResponse object with a 400 status code.
 */
export function invalidRequestResponse(message: string): NextResponse {
  return createErrorResponse(API_ERRORS.INVALID_REQUEST, message, HTTP_STATUS.BAD_REQUEST);
}

/**
 * Creates a standardized success response.
 * @param {unknown} data - The data payload to include in the response.
 * @param {string} message - A success message.
 * @param {number} [status=200] - The HTTP status code.
 * @returns {NextResponse} A NextResponse object with the success payload.
 */
export function successResponse(data: unknown, message: string, status: number = HTTP_STATUS.OK): NextResponse {
  return createSuccessResponse(data, message, status);
}