'use client';

import * as React from "react"
import { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  Globe,
  Home,
  Keyboard,
  Link,
  Lock,
  Menu,
  MessageCircle,
  Paintbrush,
  Settings,
  Video,
  Building,
} from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  // DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { useTheme } from "next-themes";

const data = {
  nav: [
    { name: "Notifications", icon: Bell },
    { name: "Navigation", icon: Menu },
    { name: "Home", icon: Home },
    { name: "Appearance", icon: Paintbrush },
    { name: "Messages & media", icon: MessageCircle },
    { name: "Configuración de la organización", icon: Building },
    { name: "Language & region", icon: Globe },
    { name: "Accessibility", icon: Keyboard },
    { name: "Mark as read", icon: Check },
    { name: "Audio & video", icon: Video },
    { name: "Connected accounts", icon: Link },
    { name: "Privacy & visibility", icon: Lock },
    { name: "Advanced", icon: Settings },
  ],
}

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<string>(theme?.replace('-dark', '') || "system");
  const [activeSection, setActiveSection] = useState("Appearance"); // New state for active section

  useEffect(() => {
    if (theme) {
      setSelectedTheme(theme?.replace('-dark', '') || 'system');
    }
  }, [theme]);

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
  };

  const handleSaveClick = () => {
    // Apply the selected theme and current mode
    const newTheme = theme?.endsWith('-dark') ? `${selectedTheme}-dark` : selectedTheme;
    setTheme(newTheme);
    // onOpenChange(false); // Prevent modal from closing
  };

  const handleSectionChange = (sectionName: string) => {
    setActiveSection(sectionName);
  };

  const isApplyButtonDisabled = selectedTheme === (theme?.replace('-dark', '') || 'system');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}> {/* Usar isOpen y onOpenChange */}
      {/* <DialogTrigger asChild>
        <Button size="sm">Open Dialog</Button>
      </DialogTrigger> */}
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.name === activeSection}
                          onClick={() => handleSectionChange(item.name)}
                        >
                          <a href="#">
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {activeSection === "Appearance" && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="theme">Tema</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedTheme === 'theme-claude' ? 'default' : 'outline'}
                          onClick={() => handleThemeChange('theme-claude')}
                        >
                          Claude
                        </Button>
                        <Button
                          variant={selectedTheme === 'theme-vercel' ? 'default' : 'outline'}
                          onClick={() => handleThemeChange('theme-vercel')}
                        >
                          Vercel
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mode">Modo</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={!theme?.endsWith('-dark') ? 'default' : 'outline'}
                          onClick={() => setTheme(selectedTheme)}
                        >
                          Claro
                        </Button>
                        <Button
                          variant={theme?.endsWith('-dark') ? 'default' : 'outline'}
                          onClick={() => setTheme(`${selectedTheme}-dark`)}
                        >
                          Oscuro
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tema actual: {theme?.replace('-dark', '')} ({theme?.endsWith('-dark') ? 'Oscuro' : 'Claro'})
                    </div>
                  </div>
                </div>
              )}
              {activeSection === "Configuración de la organización" && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="organizationName">Nombre de la Organización</Label>
                    <Input id="organizationName" defaultValue="Mi Organización" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" defaultValue="Calle Falsa 123" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" defaultValue="+1234567890" />
                  </div>
                </div>
              )}
              {activeSection === "Appearance" && (
                 <Button onClick={handleSaveClick} disabled={isApplyButtonDisabled}>Aplicar</Button>
               )}
               {activeSection !== "Appearance" && (
                 <Button onClick={handleSaveClick}>Guardar</Button>
               )}
             </div>
           </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}