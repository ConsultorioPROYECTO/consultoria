import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { googleCalendarService } from "@/lib/google-calendar";


interface RouteParams {
  params: Promise<{ idCalendar: string }>;
}

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

interface SuccessResponse {
  events: unknown[];
  count: number;
  timeRange: {
    timeMin?: string;
    timeMax?: string;
  };
  calendarInfo: {
    calendarId: string;
  };
}

/**
 * GET /api/master/calendars/events/[idCalendar]
 * Retrieves events for a specific calendar
 */
export const GET = async (
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse | ErrorResponse>> => {
  try {
    // Validate and extract parameters
    const resolvedParams = await params;
    const { idCalendar } = resolvedParams;

    if (!idCalendar) {
      return NextResponse.json(
        {
          error: "MISSING_CALENDAR_ID",
          message: "Calendar ID is required",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (typeof idCalendar !== "string" || idCalendar.trim().length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_CALENDAR_ID",
          message: "Calendar ID must be a non-empty string",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Extract and validate query parameters
    const searchParams = req.nextUrl.searchParams;
    const timeMin = searchParams.get("timeMin") || undefined;
    const timeMax = searchParams.get("timeMax") || undefined;

    // Validate date formats if provided
    if (timeMin && !isValidISODate(timeMin)) {
      return NextResponse.json(
        {
          error: "INVALID_TIME_MIN",
          message: "timeMin must be a valid ISO 8601 date string",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (timeMax && !isValidISODate(timeMax)) {
      return NextResponse.json(
        {
          error: "INVALID_TIME_MAX",
          message: "timeMax must be a valid ISO 8601 date string",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate date range logic
    if (timeMin && timeMax && new Date(timeMin) >= new Date(timeMax)) {
      return NextResponse.json(
        {
          error: "INVALID_DATE_RANGE",
          message: "timeMin must be before timeMax",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Use idCalendar directly as calendarId
    const calendarId = idCalendar;
    
    if (!calendarId || calendarId.trim() === '') {
      return NextResponse.json(
        {
          error: "INVALID_CALENDAR_ID",
          message: "Calendar ID cannot be empty",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Convert date strings to DateTime objects if provided
    const startDateTime = timeMin ? DateTime.fromISO(timeMin) : DateTime.now().startOf('day');
    const endDateTime = timeMax ? DateTime.fromISO(timeMax) : DateTime.now().endOf('day');

    // Validate DateTime objects
    if (!startDateTime.isValid) {
      return NextResponse.json(
        {
          error: "INVALID_START_DATE",
          message: "Invalid start date format",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (!endDateTime.isValid) {
      return NextResponse.json(
        {
          error: "INVALID_END_DATE",
          message: "Invalid end date format",
          timestamp: new Date().toISOString(),
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Call Google Calendar API directly
    const eventsResponse = await googleCalendarService.calendar.events.list({
      calendarId: calendarId,
      timeMin: startDateTime.toISO() || undefined,
      timeMax: endDateTime.toISO() || undefined,
      singleEvents: true, // Expand recurring events into individual instances
      orderBy: 'startTime',
    });

    const events = eventsResponse.data.items || [];

    // Return successful response
    return NextResponse.json(
      {
        events,
        count: events.length,
        timeRange: {
          timeMin,
          timeMax,
        },
        calendarInfo: {
          calendarId,
        },
      } satisfies SuccessResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/master/calendars/events] Error:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle specific error types
    if (error instanceof Error) {
      // Check for specific error patterns
      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            error: "CALENDAR_NOT_FOUND",
            message: "The specified calendar was not found",
            timestamp: new Date().toISOString(),
          } satisfies ErrorResponse,
          { status: 404 }
        );
      }

      if (error.message.includes("unauthorized") || error.message.includes("permission")) {
        return NextResponse.json(
          {
            error: "UNAUTHORIZED",
            message: "Insufficient permissions to access this calendar",
            timestamp: new Date().toISOString(),
          } satisfies ErrorResponse,
          { status: 403 }
        );
      }

      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "RATE_LIMIT_EXCEEDED",
            message: "API rate limit exceeded. Please try again later",
            timestamp: new Date().toISOString(),
          } satisfies ErrorResponse,
          { status: 429 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado al obtener los eventos del calendario",
        timestamp: new Date().toISOString(),
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
};

/**
 * Validates if a string is a valid ISO 8601 date
 */
function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && dateString.includes("T");
  } catch {
    return false;
  }
}