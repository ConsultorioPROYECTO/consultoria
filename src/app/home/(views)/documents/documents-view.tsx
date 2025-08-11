"use client";

import React from "react";
import { AttachmentsExplorer } from "../../(views)/rol/Admin/_components/AttachmentsExplorer";
import { useAuth } from "@/app/context/AuthContext";

export default function DocumentsView() {
  const { userRole } = useAuth();

  // Simple guard: only show to admin (sidebar already restricts access)
  if (userRole && userRole !== "admin") {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No tienes permisos para ver esta sección.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Documentos</h1>
        <p className="text-muted-foreground">Explora y gestiona los adjuntos almacenados</p>
      </div>
      <AttachmentsExplorer />
    </div>
  );
}