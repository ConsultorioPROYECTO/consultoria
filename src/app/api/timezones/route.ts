import { AuthenticatedUserInfo, withOptimizedAuthentication } from "@/app/lib/firebase/server/middleware/optimizedAuthMiddleware";
import { NextRequest, NextResponse } from "next/server";

/**
 * Timezone API Response Interface
 * @interface TimezoneResponse
 */
interface TimezoneResponse {
  /** Array of IANA timezone identifiers supported by the Intl API */
  timezones: string[];
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
 * Handler function for retrieving all supported timezone identifiers.
 * 
 * This function provides access to all IANA timezone identifiers that are supported
 * by the JavaScript Internationalization API (Intl). The timezones are returned
 * as an array of timezone identifiers following the IANA Time Zone Database format
 * (e.g., "America/New_York", "Europe/London", "Asia/Tokyo").
 * 
 * @async
 * @function getTimezonesHandler
 * @param {NextRequest} request - The incoming HTTP request object from Next.js
 * @param {AuthenticatedUserInfo} userInfo - Authenticated user information containing user details and organization data
 * @returns {Promise<NextResponse | Response>} Promise that resolves to either:
 *   - Success: NextResponse with TimezoneResponse containing array of timezone identifiers
 *   - Error: NextResponse with ErrorResponse containing error message
 * 
 * @throws {Error} Returns 400 status if user doesn't belong to an organization
 * @throws {Error} Returns 500 status for any internal server errors
 * 
 * @example
 * // Successful response structure:
 * {
 *   "timezones": [
 *     "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa",
 *     "America/New_York", "America/Los_Angeles", "America/Chicago",
 *     "Europe/London", "Europe/Paris", "Europe/Berlin",
 *     "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata",
 *     // ... more timezone identifiers
 *     "Pacific/Auckland", "Pacific/Honolulu", "Pacific/Fiji"
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
 * @see {@link https://en.wikipedia.org/wiki/List_of_tz_database_time_zones | IANA Time Zone Database}
 * @see {@link https://www.iana.org/time-zones | IANA Time Zone Database Official}
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
const getTimezonesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse<TimezoneResponse | ErrorResponse>> => {
    try{
        // Verificar que el usuario pertenezca a una organización
    if (!userInfo.user.organizationId) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }
        const timezones = Intl.supportedValuesOf('timeZone');
        return NextResponse.json<TimezoneResponse>({timezones})
    }catch (error){
        return NextResponse.json<ErrorResponse>({error: `Internal server error: ${error}`}, {status: 500})
    }
}

/**
 * GET endpoint for retrieving all supported timezone identifiers.
 * 
 * This endpoint provides access to all IANA timezone identifiers supported by the
 * JavaScript Internationalization API. It requires authentication and the user
 * must belong to an organization with appropriate roles. The returned timezones
 * follow the IANA Time Zone Database format and can be used for date/time
 * localization and scheduling applications.
 * 
 * @route GET /api/timezones
 * @access Protected - Requires authentication and organization membership
 * @roles admin, medico, asistente
 * 
 * @returns {Promise<NextResponse>} JSON response containing:
 *   - On success (200): Object with `timezones` array containing all supported timezone identifiers
 *   - On auth error (401): Authentication required
 *   - On permission error (403): Insufficient permissions or invalid role
 *   - On validation error (400): User doesn't belong to an organization
 *   - On server error (500): Internal server error with details
 * 
 * @example
 * // Request:
 * GET /api/timezones
 * Authorization: Bearer <firebase-token>
 * 
 * // Response (200 OK):
 * {
 *   "timezones": [
 *     "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers",
 *     "Africa/Asmera", "Africa/Bamako", "Africa/Bangui", "Africa/Banjul",
 *     "America/Adak", "America/Anchorage", "America/Anguilla", "America/Antigua",
 *     "America/New_York", "America/Los_Angeles", "America/Chicago", "America/Denver",
 *     "Asia/Aden", "Asia/Almaty", "Asia/Amman", "Asia/Anadyr", "Asia/Tokyo",
 *     "Europe/Amsterdam", "Europe/Andorra", "Europe/Athens", "Europe/London",
 *     "Pacific/Apia", "Pacific/Auckland", "Pacific/Honolulu", "Pacific/Fiji",
 *     "Antarctica/Casey", "Antarctica/Davis", "Arctic/Longyearbyen",
 *     "Atlantic/Azores", "Atlantic/Bermuda", "Indian/Antananarivo",
 *     "Australia/Adelaide", "Australia/Brisbane", "Australia/Sydney"
 *     // ... and many more timezone identifiers (total: ~400+ timezones)
 *   ]
 * }
 * 
 * @remarks
 * The timezone identifiers returned by this endpoint are:
 * - Based on the IANA Time Zone Database (tzdata)
 * - Formatted as "Continent/City" or "Ocean/Island"
 * - Include historical timezone changes and daylight saving time rules
 * - Suitable for use with JavaScript Date objects and Intl.DateTimeFormat
 * - Compatible with most programming languages and timezone libraries
 * 
 * Common timezone categories included:
 * - **Africa**: African continent timezones (e.g., "Africa/Cairo", "Africa/Johannesburg")
 * - **America**: North and South American timezones (e.g., "America/New_York", "America/Sao_Paulo")
 * - **Asia**: Asian continent timezones (e.g., "Asia/Tokyo", "Asia/Shanghai")
 * - **Europe**: European continent timezones (e.g., "Europe/London", "Europe/Paris")
 * - **Pacific**: Pacific Ocean timezones (e.g., "Pacific/Auckland", "Pacific/Honolulu")
 * - **Atlantic**: Atlantic Ocean timezones (e.g., "Atlantic/Azores")
 * - **Indian**: Indian Ocean timezones (e.g., "Indian/Mauritius")
 * - **Antarctica**: Antarctic research station timezones
 * - **Arctic**: Arctic region timezones
 * - **Australia**: Australian continent timezones
 * 
 * @see {@link getTimezonesHandler} for the handler function implementation
 * @see {@link withOptimizedAuthentication} for authentication middleware details
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
export const GET = withOptimizedAuthentication(getTimezonesHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true,
});

/**
 * respuesta:
 * {
    "timezones": [
        "Africa/Abidjan",
        "Africa/Accra",
        "Africa/Addis_Ababa",
        "Africa/Algiers",
        "Africa/Asmera",
        "Africa/Bamako",
        "Africa/Bangui",
        "Africa/Banjul",
        "Africa/Bissau",
        "Africa/Blantyre",
        "Africa/Brazzaville",
        "Africa/Bujumbura",
        "Africa/Cairo",
        "Africa/Casablanca",
        "Africa/Ceuta",
        "Africa/Conakry",
        "Africa/Dakar",
        "Africa/Dar_es_Salaam",
        "Africa/Djibouti",
        "Africa/Douala",
        "Africa/El_Aaiun",
        "Africa/Freetown",
        "Africa/Gaborone",
        "Africa/Harare",
        "Africa/Johannesburg",
        "Africa/Juba",
        "Africa/Kampala",
        "Africa/Khartoum",
        "Africa/Kigali",
        "Africa/Kinshasa",
        "Africa/Lagos",
        "Africa/Libreville",
        "Africa/Lome",
        "Africa/Luanda",
        "Africa/Lubumbashi",
        "Africa/Lusaka",
        "Africa/Malabo",
        "Africa/Maputo",
        "Africa/Maseru",
        "Africa/Mbabane",
        "Africa/Mogadishu",
        "Africa/Monrovia",
        "Africa/Nairobi",
        "Africa/Ndjamena",
        "Africa/Niamey",
        "Africa/Nouakchott",
        "Africa/Ouagadougou",
        "Africa/Porto-Novo",
        "Africa/Sao_Tome",
        "Africa/Tripoli",
        "Africa/Tunis",
        "Africa/Windhoek",
        "America/Adak",
        "America/Anchorage",
        "America/Anguilla",
        "America/Antigua",
        "America/Araguaina",
        "America/Argentina/La_Rioja",
        "America/Argentina/Rio_Gallegos",
        "America/Argentina/Salta",
        "America/Argentina/San_Juan",
        "America/Argentina/San_Luis",
        "America/Argentina/Tucuman",
        "America/Argentina/Ushuaia",
        "America/Aruba",
        "America/Asuncion",
        "America/Bahia",
        "America/Bahia_Banderas",
        "America/Barbados",
        "America/Belem",
        "America/Belize",
        "America/Blanc-Sablon",
        "America/Boa_Vista",
        "America/Bogota",
        "America/Boise",
        "America/Buenos_Aires",
        "America/Cambridge_Bay",
        "America/Campo_Grande",
        "America/Cancun",
        "America/Caracas",
        "America/Catamarca",
        "America/Cayenne",
        "America/Cayman",
        "America/Chicago",
        "America/Chihuahua",
        "America/Ciudad_Juarez",
        "America/Coral_Harbour",
        "America/Cordoba",
        "America/Costa_Rica",
        "America/Creston",
        "America/Cuiaba",
        "America/Curacao",
        "America/Danmarkshavn",
        "America/Dawson",
        "America/Dawson_Creek",
        "America/Denver",
        "America/Detroit",
        "America/Dominica",
        "America/Edmonton",
        "America/Eirunepe",
        "America/El_Salvador",
        "America/Fort_Nelson",
        "America/Fortaleza",
        "America/Glace_Bay",
        "America/Godthab",
        "America/Goose_Bay",
        "America/Grand_Turk",
        "America/Grenada",
        "America/Guadeloupe",
        "America/Guatemala",
        "America/Guayaquil",
        "America/Guyana",
        "America/Halifax",
        "America/Havana",
        "America/Hermosillo",
        "America/Indiana/Knox",
        "America/Indiana/Marengo",
        "America/Indiana/Petersburg",
        "America/Indiana/Tell_City",
        "America/Indiana/Vevay",
        "America/Indiana/Vincennes",
        "America/Indiana/Winamac",
        "America/Indianapolis",
        "America/Inuvik",
        "America/Iqaluit",
        "America/Jamaica",
        "America/Jujuy",
        "America/Juneau",
        "America/Kentucky/Monticello",
        "America/Kralendijk",
        "America/La_Paz",
        "America/Lima",
        "America/Los_Angeles",
        "America/Louisville",
        "America/Lower_Princes",
        "America/Maceio",
        "America/Managua",
        "America/Manaus",
        "America/Marigot",
        "America/Martinique",
        "America/Matamoros",
        "America/Mazatlan",
        "America/Mendoza",
        "America/Menominee",
        "America/Merida",
        "America/Metlakatla",
        "America/Mexico_City",
        "America/Miquelon",
        "America/Moncton",
        "America/Monterrey",
        "America/Montevideo",
        "America/Montserrat",
        "America/Nassau",
        "America/New_York",
        "America/Nome",
        "America/Noronha",
        "America/North_Dakota/Beulah",
        "America/North_Dakota/Center",
        "America/North_Dakota/New_Salem",
        "America/Ojinaga",
        "America/Panama",
        "America/Paramaribo",
        "America/Phoenix",
        "America/Port-au-Prince",
        "America/Port_of_Spain",
        "America/Porto_Velho",
        "America/Puerto_Rico",
        "America/Punta_Arenas",
        "America/Rankin_Inlet",
        "America/Recife",
        "America/Regina",
        "America/Resolute",
        "America/Rio_Branco",
        "America/Santarem",
        "America/Santiago",
        "America/Santo_Domingo",
        "America/Sao_Paulo",
        "America/Scoresbysund",
        "America/Sitka",
        "America/St_Barthelemy",
        "America/St_Johns",
        "America/St_Kitts",
        "America/St_Lucia",
        "America/St_Thomas",
        "America/St_Vincent",
        "America/Swift_Current",
        "America/Tegucigalpa",
        "America/Thule",
        "America/Tijuana",
        "America/Toronto",
        "America/Tortola",
        "America/Vancouver",
        "America/Whitehorse",
        "America/Winnipeg",
        "America/Yakutat",
        "Antarctica/Casey",
        "Antarctica/Davis",
        "Antarctica/DumontDUrville",
        "Antarctica/Macquarie",
        "Antarctica/Mawson",
        "Antarctica/McMurdo",
        "Antarctica/Palmer",
        "Antarctica/Rothera",
        "Antarctica/Syowa",
        "Antarctica/Troll",
        "Antarctica/Vostok",
        "Arctic/Longyearbyen",
        "Asia/Aden",
        "Asia/Almaty",
        "Asia/Amman",
        "Asia/Anadyr",
        "Asia/Aqtau",
        "Asia/Aqtobe",
        "Asia/Ashgabat",
        "Asia/Atyrau",
        "Asia/Baghdad",
        "Asia/Bahrain",
        "Asia/Baku",
        "Asia/Bangkok",
        "Asia/Barnaul",
        "Asia/Beirut",
        "Asia/Bishkek",
        "Asia/Brunei",
        "Asia/Calcutta",
        "Asia/Chita",
        "Asia/Colombo",
        "Asia/Damascus",
        "Asia/Dhaka",
        "Asia/Dili",
        "Asia/Dubai",
        "Asia/Dushanbe",
        "Asia/Famagusta",
        "Asia/Gaza",
        "Asia/Hebron",
        "Asia/Hong_Kong",
        "Asia/Hovd",
        "Asia/Irkutsk",
        "Asia/Jakarta",
        "Asia/Jayapura",
        "Asia/Jerusalem",
        "Asia/Kabul",
        "Asia/Kamchatka",
        "Asia/Karachi",
        "Asia/Katmandu",
        "Asia/Khandyga",
        "Asia/Krasnoyarsk",
        "Asia/Kuala_Lumpur",
        "Asia/Kuching",
        "Asia/Kuwait",
        "Asia/Macau",
        "Asia/Magadan",
        "Asia/Makassar",
        "Asia/Manila",
        "Asia/Muscat",
        "Asia/Nicosia",
        "Asia/Novokuznetsk",
        "Asia/Novosibirsk",
        "Asia/Omsk",
        "Asia/Oral",
        "Asia/Phnom_Penh",
        "Asia/Pontianak",
        "Asia/Pyongyang",
        "Asia/Qatar",
        "Asia/Qostanay",
        "Asia/Qyzylorda",
        "Asia/Rangoon",
        "Asia/Riyadh",
        "Asia/Saigon",
        "Asia/Sakhalin",
        "Asia/Samarkand",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Asia/Singapore",
        "Asia/Srednekolymsk",
        "Asia/Taipei",
        "Asia/Tashkent",
        "Asia/Tbilisi",
        "Asia/Tehran",
        "Asia/Thimphu",
        "Asia/Tokyo",
        "Asia/Tomsk",
        "Asia/Ulaanbaatar",
        "Asia/Urumqi",
        "Asia/Ust-Nera",
        "Asia/Vientiane",
        "Asia/Vladivostok",
        "Asia/Yakutsk",
        "Asia/Yekaterinburg",
        "Asia/Yerevan",
        "Atlantic/Azores",
        "Atlantic/Bermuda",
        "Atlantic/Canary",
        "Atlantic/Cape_Verde",
        "Atlantic/Faeroe",
        "Atlantic/Madeira",
        "Atlantic/Reykjavik",
        "Atlantic/South_Georgia",
        "Atlantic/St_Helena",
        "Atlantic/Stanley",
        "Australia/Adelaide",
        "Australia/Brisbane",
        "Australia/Broken_Hill",
        "Australia/Darwin",
        "Australia/Eucla",
        "Australia/Hobart",
        "Australia/Lindeman",
        "Australia/Lord_Howe",
        "Australia/Melbourne",
        "Australia/Perth",
        "Australia/Sydney",
        "Europe/Amsterdam",
        "Europe/Andorra",
        "Europe/Astrakhan",
        "Europe/Athens",
        "Europe/Belgrade",
        "Europe/Berlin",
        "Europe/Bratislava",
        "Europe/Brussels",
        "Europe/Bucharest",
        "Europe/Budapest",
        "Europe/Busingen",
        "Europe/Chisinau",
        "Europe/Copenhagen",
        "Europe/Dublin",
        "Europe/Gibraltar",
        "Europe/Guernsey",
        "Europe/Helsinki",
        "Europe/Isle_of_Man",
        "Europe/Istanbul",
        "Europe/Jersey",
        "Europe/Kaliningrad",
        "Europe/Kiev",
        "Europe/Kirov",
        "Europe/Lisbon",
        "Europe/Ljubljana",
        "Europe/London",
        "Europe/Luxembourg",
        "Europe/Madrid",
        "Europe/Malta",
        "Europe/Mariehamn",
        "Europe/Minsk",
        "Europe/Monaco",
        "Europe/Moscow",
        "Europe/Oslo",
        "Europe/Paris",
        "Europe/Podgorica",
        "Europe/Prague",
        "Europe/Riga",
        "Europe/Rome",
        "Europe/Samara",
        "Europe/San_Marino",
        "Europe/Sarajevo",
        "Europe/Saratov",
        "Europe/Simferopol",
        "Europe/Skopje",
        "Europe/Sofia",
        "Europe/Stockholm",
        "Europe/Tallinn",
        "Europe/Tirane",
        "Europe/Ulyanovsk",
        "Europe/Vaduz",
        "Europe/Vatican",
        "Europe/Vienna",
        "Europe/Vilnius",
        "Europe/Volgograd",
        "Europe/Warsaw",
        "Europe/Zagreb",
        "Europe/Zurich",
        "Indian/Antananarivo",
        "Indian/Chagos",
        "Indian/Christmas",
        "Indian/Cocos",
        "Indian/Comoro",
        "Indian/Kerguelen",
        "Indian/Mahe",
        "Indian/Maldives",
        "Indian/Mauritius",
        "Indian/Mayotte",
        "Indian/Reunion",
        "Pacific/Apia",
        "Pacific/Auckland",
        "Pacific/Bougainville",
        "Pacific/Chatham",
        "Pacific/Easter",
        "Pacific/Efate",
        "Pacific/Enderbury",
        "Pacific/Fakaofo",
        "Pacific/Fiji",
        "Pacific/Funafuti",
        "Pacific/Galapagos",
        "Pacific/Gambier",
        "Pacific/Guadalcanal",
        "Pacific/Guam",
        "Pacific/Honolulu",
        "Pacific/Kiritimati",
        "Pacific/Kosrae",
        "Pacific/Kwajalein",
        "Pacific/Majuro",
        "Pacific/Marquesas",
        "Pacific/Midway",
        "Pacific/Nauru",
        "Pacific/Niue",
        "Pacific/Norfolk",
        "Pacific/Noumea",
        "Pacific/Pago_Pago",
        "Pacific/Palau",
        "Pacific/Pitcairn",
        "Pacific/Ponape",
        "Pacific/Port_Moresby",
        "Pacific/Rarotonga",
        "Pacific/Saipan",
        "Pacific/Tahiti",
        "Pacific/Tarawa",
        "Pacific/Tongatapu",
        "Pacific/Truk",
        "Pacific/Wake",
        "Pacific/Wallis"
    ]
}
 */