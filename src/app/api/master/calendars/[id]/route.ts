import { googleCalendarService } from "@/lib/google-calendar";
import { NextRequest, NextResponse } from "next/server";


export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const calendar = await googleCalendarService.getCalendar(id!);
    return NextResponse.json({ calendar })
}