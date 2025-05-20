'use client';

import { cn } from "@rutas/lib/utils";
import React from 'react';

interface UiScreenProps {
  children: React.ReactNode;
  className?: string;
}

export default function UiScreen({ children, className }: UiScreenProps) {
    return(
        <div className={cn("container mx-auto px-4 py-8 bg-background text-foreground", className)}>
            {children}
        </div>
    )
}