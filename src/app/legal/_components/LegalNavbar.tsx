'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LegalNavbarProps {
  showSectionLinks?: boolean
  sectionName?: string
}

export function LegalNavbar({ 
  showSectionLinks = false, 
  sectionName = '' 
}: LegalNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center gap-4 px-3 md:px-3 h-16">
      {/* Logo o Título */}
      <Link href="/" className="text-xl font-bold z-50 selection:bg-primary selection:text-primary-foreground">
        Irina
      </Link>
      
      {/* Enlaces Centrales para Escritorio */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6">
        {showSectionLinks && sectionName ? (
          <div className="flex items-center gap-2">
            <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium text-primary underline underline-offset-4">
              {sectionName}
            </span>
          </div>
        ) : (
          <>
            <Link href="/#caracteristicas" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> Características
            </Link>
            <Link href="/#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" /> FAQ
            </Link>
          </>
        )}
      </div>

      {/* Botones de Auth para Escritorio */}
      <div className="hidden md:flex items-center gap-4">
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          Iniciar sesión
        </Link>
        <Button asChild size="sm" className="selection:bg-secondary selection:text-primary">
          <Link href="/signup">Registro</Link>
        </Button>
      </div>

      {/* Botón de Menú para Móvil */}
      <div className="md:hidden z-50">
        <Button 
          variant="ghost" 
          size="icon"
          className="size-9"
          aria-label="Volver a inicio"
          asChild
        >
          <Link href="/">←</Link>
        </Button>
      </div>
    </nav>
  )
}