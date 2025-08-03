"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Mail, User, Building, MessageSquare } from "lucide-react"

interface ContactFormData {
  name: string
  email: string
  company: string
  message: string
}

interface ContactModalProps {
  children: React.ReactNode
}

function ContactForm({ onSubmit }: { onSubmit: (data: ContactFormData) => void }) {
  const [formData, setFormData] = React.useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    message: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 px-4 lg:px-0">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-sm font-medium">
          <User className="w-4 h-4" />
          Nombre completo
        </Label>
        <Input
          id="name"
          placeholder="Tu nombre completo"
          value={formData.name}
          onChange={handleChange("name")}
          required
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-sm font-medium">
          <Mail className="w-4 h-4" />
          Correo electrónico
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={formData.email}
          onChange={handleChange("email")}
          required
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="company" className="text-sm font-medium">
          <Building className="w-4 h-4" />
          Empresa u organización
        </Label>
        <Input
          id="company"
          placeholder="Nombre de tu empresa"
          value={formData.company}
          onChange={handleChange("company")}
          required
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="message" className="text-sm font-medium">
          <MessageSquare className="w-4 h-4" />
          Mensaje
        </Label>
        <Textarea
          id="message"
          placeholder="Cuéntanos sobre tu interés en acceder a la plataforma..."
          value={formData.message}
          onChange={handleChange("message")}
          rows={4}
          required
        />
      </div>
      
      <Button type="submit" className="w-full">
        Solicitar acceso
      </Button>
    </form>
  )
}

export function ContactModal({ children }: ContactModalProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const handleSubmit = async (data: ContactFormData) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setOpen(false);
        alert("¡Gracias! Hemos recibido tu solicitud. Te contactaremos pronto.");
      } else {
        alert("Error al enviar la solicitud. Por favor, inténtalo de nuevo.");
      }
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      alert("Error al enviar la solicitud. Por favor, inténtalo de nuevo.");
    }
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {children}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Solicitar acceso</DrawerTitle>
            <DrawerDescription>
              Completa el formulario para solicitar acceso a nuestra plataforma.
            </DrawerDescription>
          </DrawerHeader>
            <ContactForm onSubmit={handleSubmit} />
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar acceso</DialogTitle>
          <DialogDescription>
            Completa el formulario para solicitar acceso a nuestra plataforma.
          </DialogDescription>
        </DialogHeader>
        <ContactForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  )
}