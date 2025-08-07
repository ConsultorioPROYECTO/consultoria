import { AuthenticatedUserInfo, withOptimizedAuthentication } from "@/app/lib/firebase/server/middleware/optimizedAuthMiddleware";
import { NextRequest, NextResponse } from "next/server";

const getTimezonesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
    try{
        // Verificar que el usuario pertenezca a una organización
    if (!userInfo.user.organizationId) {
      return NextResponse.json(
        { error: 'Usuario no pertenece a ninguna organización' },
        { status: 400 }
      );
    }
        const timezones = Intl.supportedValuesOf('timeZone');
        return NextResponse.json({timezones})
    }catch (error){
        return NextResponse.json({error: `Internal server error: ${error}`}, {status: 500})
    }
}
export const GET = withOptimizedAuthentication(getTimezonesHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true,
});