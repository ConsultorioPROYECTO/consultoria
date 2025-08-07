import { AuthenticatedUserInfo, withOptimizedAuthentication } from "@/app/lib/firebase/server/middleware/optimizedAuthMiddleware";
import { NextRequest, NextResponse } from "next/server";

/**
 * Currency API Response Interface
 * @interface CurrencyResponse
 */
interface CurrencyResponse {
  /** Array of ISO 4217 currency codes supported by the Intl API */
  currencies: string[];
}

/**
 * Error Response Interface
 * @interface ErrorResponse
 */
interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
}

/**
 * Handler function for retrieving all supported currency codes.
 * 
 * This function provides access to all ISO 4217 currency codes that are supported
 * by the JavaScript Internationalization API (Intl). The currencies are returned
 * as an array of three-letter currency codes (e.g., "USD", "EUR", "JPY").
 * 
 * @async
 * @function getCurrenciesHandler
 * @param {NextRequest} request - The incoming HTTP request object from Next.js
 * @param {AuthenticatedUserInfo} userInfo - Authenticated user information containing user details and organization data
 * @returns {Promise<NextResponse | Response>} Promise that resolves to either:
 *   - Success: NextResponse with CurrencyResponse containing array of currency codes
 *   - Error: NextResponse with ErrorResponse containing error message
 * 
 * @throws {Error} Returns 400 status if user doesn't belong to an organization
 * @throws {Error} Returns 500 status for any internal server errors
 * 
 * @example
 * // Successful response structure:
 * {
 *   "currencies": [
 *     "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD",
 *     "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF",
 *     // ... more currency codes
 *     "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF",
 *     "XCD", "XCG", "XDR", "XOF", "XPF", "XSU", "YER", "ZAR",
 *     "ZMW", "ZWG", "ZWL"
 *   ]
 * }
 * 
 * @example
 * // Error response when user has no organization:
 * {
 *   "error": "Usuario no pertenece a ninguna organización"
 * }
 * 
 * @example
 * // Error response for server errors:
 * {
 *   "error": "Internal server error: [error details]"
 * }
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf | Intl.supportedValuesOf}
 * @see {@link https://en.wikipedia.org/wiki/ISO_4217 | ISO 4217 Currency Codes}
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
const getCurrenciesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse<CurrencyResponse | ErrorResponse>> => {
    try{
        // Verificar que el usuario pertenezca a una organización
    if (!userInfo.user.organizationId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }
        const currencies = Intl.supportedValuesOf('currency');
        return NextResponse.json<CurrencyResponse>({currencies})
    }catch (error){
        return NextResponse.json<ErrorResponse>({error: `Internal server error: ${error}`}, {status: 500})
    }
}

/**
 * GET endpoint for retrieving all supported currency codes.
 * 
 * This endpoint provides access to all ISO 4217 currency codes supported by the
 * JavaScript Internationalization API. It requires authentication and the user
 * must belong to an organization with appropriate roles.
 * 
 * @route GET /api/currency
 * @access Protected - Requires authentication and organization membership
 * @roles admin, medico, asistente
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 *   - On success (200): Object with `currencies` array containing all supported currency codes
 *   - On auth error (401): Authentication required
 *   - On permission error (403): Insufficient permissions or invalid role
 *   - On validation error (400): User doesn't belong to an organization
 *   - On server error (500): Internal server error with details
 * 
 * @example
 * // Request:
 * GET /api/currency
 * Authorization: Bearer <firebase-token>
 * 
 * // Response (200 OK):
 * {
 *   "currencies": [
 *     "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD",
 *     "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF",
 *     "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN",
 *     "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC",
 *     "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD",
 *     "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL",
 *     "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL",
 *     "HRK", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR",
 *     "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF",
 *     "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR",
 *     "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK",
 *     "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR",
 *     "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR",
 *     "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR",
 *     "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG",
 *     "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP",
 *     "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND",
 *     "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD",
 *     "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD",
 *     "XCG", "XDR", "XOF", "XPF", "XSU", "YER", "ZAR", "ZMW",
 *     "ZWG", "ZWL"
 *   ]
 * }
 * 
 * @see {@link getCurrenciesHandler} for the handler function implementation
 * @see {@link withOptimizedAuthentication} for authentication middleware details
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
export const GET = withOptimizedAuthentication(getCurrenciesHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true,
});

/**
 * respuesta:
 * {
    "currencies": [
        "AED",
        "AFN",
        "ALL",
        "AMD",
        "ANG",
        "AOA",
        "ARS",
        "AUD",
        "AWG",
        "AZN",
        "BAM",
        "BBD",
        "BDT",
        "BGN",
        "BHD",
        "BIF",
        "BMD",
        "BND",
        "BOB",
        "BRL",
        "BSD",
        "BTN",
        "BWP",
        "BYN",
        "BZD",
        "CAD",
        "CDF",
        "CHF",
        "CLP",
        "CNY",
        "COP",
        "CRC",
        "CUC",
        "CUP",
        "CVE",
        "CZK",
        "DJF",
        "DKK",
        "DOP",
        "DZD",
        "EGP",
        "ERN",
        "ETB",
        "EUR",
        "FJD",
        "FKP",
        "GBP",
        "GEL",
        "GHS",
        "GIP",
        "GMD",
        "GNF",
        "GTQ",
        "GYD",
        "HKD",
        "HNL",
        "HRK",
        "HTG",
        "HUF",
        "IDR",
        "ILS",
        "INR",
        "IQD",
        "IRR",
        "ISK",
        "JMD",
        "JOD",
        "JPY",
        "KES",
        "KGS",
        "KHR",
        "KMF",
        "KPW",
        "KRW",
        "KWD",
        "KYD",
        "KZT",
        "LAK",
        "LBP",
        "LKR",
        "LRD",
        "LSL",
        "LYD",
        "MAD",
        "MDL",
        "MGA",
        "MKD",
        "MMK",
        "MNT",
        "MOP",
        "MRU",
        "MUR",
        "MVR",
        "MWK",
        "MXN",
        "MYR",
        "MZN",
        "NAD",
        "NGN",
        "NIO",
        "NOK",
        "NPR",
        "NZD",
        "OMR",
        "PAB",
        "PEN",
        "PGK",
        "PHP",
        "PKR",
        "PLN",
        "PYG",
        "QAR",
        "RON",
        "RSD",
        "RUB",
        "RWF",
        "SAR",
        "SBD",
        "SCR",
        "SDG",
        "SEK",
        "SGD",
        "SHP",
        "SLE",
        "SLL",
        "SOS",
        "SRD",
        "SSP",
        "STN",
        "SVC",
        "SYP",
        "SZL",
        "THB",
        "TJS",
        "TMT",
        "TND",
        "TOP",
        "TRY",
        "TTD",
        "TWD",
        "TZS",
        "UAH",
        "UGX",
        "USD",
        "UYU",
        "UZS",
        "VES",
        "VND",
        "VUV",
        "WST",
        "XAF",
        "XCD",
        "XCG",
        "XDR",
        "XOF",
        "XPF",
        "XSU",
        "YER",
        "ZAR",
        "ZMW",
        "ZWG",
        "ZWL"
    ]
}
 */