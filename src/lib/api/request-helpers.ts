/**
 * @fileoverview This file contains helper functions for processing API requests,
 * such as parsing and validating URL parameters.
 * @module lib/api/request-helpers
 */
import { NextResponse } from 'next/server';
import { createErrorResponse, HTTP_STATUS } from '@/types/api';

/**
 * Extracts, parses, and validates a numeric parameter from the URL path.
 * If the parameter is missing, not a string, or not a valid number, it returns an error response.
 * @param {object} params - The route parameters object from Next.js.
 * @param {string} paramName - The name of the parameter to extract (e.g., 'id').
 * @returns {number | NextResponse} The parsed numeric ID or a NextResponse object with an error.
 */
export function getNumericParam(params: { [key: string]: string | string[] | undefined }, paramName: string): number | NextResponse {
  const paramValue = params[paramName];
  if (typeof paramValue !== 'string') {
    return createErrorResponse(`Invalid ${paramName}`, `Parameter ${paramName} must be a string.`, HTTP_STATUS.BAD_REQUEST);
  }
  const numericId = parseInt(paramValue, 10);
  if (isNaN(numericId)) {
    return createErrorResponse(`Invalid ${paramName}`, `Parameter ${paramName} must be a valid number.`, HTTP_STATUS.BAD_REQUEST);
  }
  return numericId;
}