'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Phone, MapPin, Globe } from "lucide-react"

export function ContactInfoSection() {
  const [contactData, setContactData] = useState({
    phone: '',
    email: '',
    website: '',
    address: '',
    socialMedia: {
      linkedin: '',
      twitter: '',
      facebook: ''
    }
  })

  const handleInputChange = (field: string, value: string) => {
    setContactData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSocialMediaChange = (platform: string, value: string) => {
    setContactData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }))
  }

  const handleSave = () => {
    // Aquí implementarías la lógica para guardar los datos
    console.log('Guardando información de contacto:', contactData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Información de Contacto</h3>
        <p className="text-sm text-muted-foreground">
          Configura los datos de contacto de tu organización
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Información de Contacto Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contacto Principal
            </CardTitle>
            <CardDescription>
              Información de contacto principal de la organización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={contactData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={contactData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://www.empresa.com"
                value={contactData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección
            </CardTitle>
            <CardDescription>
              Dirección física de la organización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección Completa</Label>
              <Textarea
                id="address"
                placeholder="Calle, Ciudad, Estado, Código Postal, País"
                value={contactData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Redes Sociales
            </CardTitle>
            <CardDescription>
              Enlaces a las redes sociales de la organización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/company/empresa"
                value={contactData.socialMedia.linkedin}
                onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter/X</Label>
              <Input
                id="twitter"
                type="url"
                placeholder="https://twitter.com/empresa"
                value={contactData.socialMedia.twitter}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                type="url"
                placeholder="https://facebook.com/empresa"
                value={contactData.socialMedia.facebook}
                onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botón de Guardar */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  )
}