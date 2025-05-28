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
  DialogTrigger,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { useTheme } from "next-themes";

const data = {
  nav: [
    { name: "Notifications", icon: Bell },
    { name: "Navigation", icon: Menu },
    { name: "Home", icon: Home },
    { name: "Appearance", icon: Paintbrush },
    { name: "Messages & media", icon: MessageCircle },
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
  // const [open, setOpen] = React.useState(true) // Eliminar estado local
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme || 'light');

  useEffect(() => {
    setSelectedTheme(theme || 'light');
  }, [theme]);

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
  };

  const handleSaveClick = () => {
    setTheme(selectedTheme);
    onOpenChange(false); // Usar onOpenChange para cerrar el modal
  };

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
                          isActive={item.name === "Appearance"} // Highlight Appearance
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
                      <BreadcrumbPage>Appearance</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {/* Appearance settings section */}
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="theme" className="text-right">
                    Tema
                  </Label>
                  <Select value={selectedTheme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theme-claude">Claude Claro</SelectItem>
                      <SelectItem value="theme-claude-dark">Claude Oscuro</SelectItem>
                      <SelectItem value="theme-vercel">Vercel Claro</SelectItem>
                      <SelectItem value="theme-vercel-dark">Vercel Oscuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveClick}>Guardar</Button>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}