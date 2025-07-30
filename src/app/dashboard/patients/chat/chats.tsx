'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Plus } from "lucide-react"

export default function ChatsView() {
  return (
    <div className="grid gap-6">
      {/* Header con botón para nuevo chat */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chats de Pacientes</h2>
          <p className="text-muted-foreground">
            Gestiona las conversaciones con tus pacientes
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Chat
        </Button>
      </div>

      {/* Lista de chats */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chats Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">María González</p>
                    <p className="text-sm text-muted-foreground">Último mensaje hace 2 horas</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver Chat
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Carlos Rodríguez</p>
                    <p className="text-sm text-muted-foreground">Último mensaje hace 1 día</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver Chat
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Ana Martínez</p>
                    <p className="text-sm text-muted-foreground">Último mensaje hace 3 días</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Ver Chat
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}