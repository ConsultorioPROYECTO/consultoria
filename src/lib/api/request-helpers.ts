// src/lib/api/request-helpers.ts
import { NextResponse } from 'next/server';
import { createErrorResponse, HTTP_STATUS } from '@/types/api';

/**
 * Extrae, convierte y valida un parámetro numérico de la URL.
 * @param params - El objeto de parámetros de la ruta.
 * @param paramName - El nombre del parámetro a obtener.
 * @returns El ID numérico o una respuesta de error.
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