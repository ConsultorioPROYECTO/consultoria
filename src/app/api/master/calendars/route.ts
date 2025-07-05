import { googleCalendarService } from "@/lib/google-calendar";
import { NextResponse } from "next/server"


export const GET = async () => {
    const calendar = await googleCalendarService.listCalendars();
    return NextResponse.json({ calendar })
}
