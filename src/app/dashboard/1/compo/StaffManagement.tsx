// src/app/dashboard/1/compo/StaffManagement.tsx
'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";

// Mock data - en una aplicación real, esto vendría de una API
const staffMembers = [
  { id: "doc1", name: "Dr. Ana Pérez", role: "Médico", specialty: "Cardiología" },
  { id: "asist1", name: "Carlos López", role: "Asistente", assignedDoctor: "Dr. Ana Pérez" },
  { id: "doc2", name: "Dr. Juan Rodríguez", role: "Médico", specialty: "Pediatría" },
];

export function StaffManagement() {
  // Lógica para agregar, editar, eliminar personal y asignar roles

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Personal</CardTitle>
        <CardDescription>Administra médicos y asistentes de la clínica.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Agregar Nuevo Personal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="staffName">Nombre</Label>
              <Input id="staffName" placeholder="Nombre completo" />
            </div>
            <div>
              <Label htmlFor="staffRole">Rol</Label>
              <Select>
                <SelectTrigger id="staffRole">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="staffSpecialty">Especialidad (si es médico)</Label>
              <Input id="staffSpecialty" placeholder="Ej: Cardiología" />
            </div>
            <Button className="md:col-start-2 self-end">Agregar Personal</Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Personal Actual</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>
                    {member.role === "Médico" ? member.specialty : member.assignedDoctor ? `Asignado a: ${member.assignedDoctor}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="mr-2">Editar</Button>
                    <Button variant="destructive" size="sm">Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Total de personal: {staffMembers.length}
        </p>
      </CardFooter>
    </Card>
  );
}