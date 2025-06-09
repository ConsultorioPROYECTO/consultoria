import { NextRequest } from 'next/server';

// Mock data - En producción esto vendría de tu base de datos
const mockConsultorios = {
  '1': {
    id: '1',
    name: 'Consultorio Central',
    googleCalendarId: 'primary', // Usar 'primary' para pruebas o el ID real del calendario
    address: 'Av. Principal 123',
    phone: '+1234567890'
  },
  '2': {
    id: '2',
    name: 'Consultorio Norte',
    googleCalendarId: 'consultorio-norte@example.com',
    address: 'Calle Norte 456',
    phone: '+1234567891'
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // En producción, aquí harías una consulta a tu base de datos
    // const consultorio = await db.consultorio.findUnique({ where: { id } });
    
    const consultorio = mockConsultorios[id as keyof typeof mockConsultorios];
    
    if (!consultorio) {
      return Response.json(
        { error: 'Consultorio not found' },
        { status: 404 }
      );
    }
    
    return Response.json(consultorio);
  } catch (error) {
    console.error('Error getting consultorio:', error);
    return Response.json(
      { error: 'Failed to get consultorio' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const updates = await request.json();
    
    // En producción, aquí actualizarías tu base de datos
    // const consultorio = await db.consultorio.update({
    //   where: { id },
    //   data: updates
    // });
    
    const consultorio = mockConsultorios[id as keyof typeof mockConsultorios];
    
    if (!consultorio) {
      return Response.json(
        { error: 'Consultorio not found' },
        { status: 404 }
      );
    }
    
    // Mock update
    const updatedConsultorio = { ...consultorio, ...updates };
    
    return Response.json({
      success: true,
      consultorio: updatedConsultorio
    });
  } catch (error) {
    console.error('Error updating consultorio:', error);
    return Response.json(
      { error: 'Failed to update consultorio' },
      { status: 500 }
    );
  }
}