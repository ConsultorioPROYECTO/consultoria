'use client'

import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@rutas/components/ui/sidebar"
import Link from 'next/link'
import { cn } from "@rutas/lib/utils"
import { useNavigation } from "@rutas/app/context/NavigationContext"
import { NAVIGATION_VIEWS } from "@/app/constants/navigation"


export function NavMain({
  items,
  hideIcons = false,
}: {
  items: {
    title: string
    icon?: LucideIcon
    isActive?: boolean
    onClick?: () => void
  }[]
  hideIcons?: boolean
}) {
  const { currentView } = useNavigation();
  
  const isItemActive = (item: { title: string; isActive?: boolean }) => {
    if (item.isActive !== undefined) {
      return item.isActive
    }
    
    // Map titles to views using constants
    const titleToView: Record<string, string> = {
      'Panel': NAVIGATION_VIEWS.HOME,
      'Calendario': NAVIGATION_VIEWS.CALENDAR,
      'Organización': NAVIGATION_VIEWS.ORGANIZATION,
      'Ai-Care': NAVIGATION_VIEWS.AI_CARE,
      'Pacientes': NAVIGATION_VIEWS.PATIENTS
    }
    
    return titleToView[item.title] === currentView
  }
  return (
    <SidebarGroup className={cn(hideIcons && "h-full flex flex-col")}>
      <SidebarGroupContent className={cn(
        "flex flex-col gap-2",
        hideIcons && "justify-center items-center h-full"
      )}>

        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.onClick ? (
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={item.onClick}
                  className={cn(
                    hideIcons ? (
                      // Estilo minimalista
                      cn(
                        "text-muted-foreground hover:!bg-transparent focus:!bg-transparent active:!bg-transparent overflow-hidden",
                        isItemActive(item) && "bg-transparent text-primary"
                      )
                    ) : (
                      // Estilo normal
                      cn(
                        "text-muted-foreground",
                        isItemActive(item) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )
                    )
                  )}
                >
                  {!hideIcons && item.icon && <item.icon />}
                  {hideIcons ? (
                    <span className="block font-semibold text-3xl" >
                      {item.title}
                    </span>
                  ) : (
                    <span className="font-medium text-2xl">{item.title}</span> 
                  )}
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={cn(
                    hideIcons ? (
                      // Estilo minimalista
                      cn(
                        "text-muted-foreground hover:!bg-transparent focus:!bg-transparent active:!bg-transparent overflow-hidden",
                        isItemActive(item) && "bg-transparent text-primary"
                      )
                    ) : (
                      // Estilo normal
                      cn(
                        "text-muted-foreground",
                        isItemActive(item) && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      )
                    )
                  )}
                >
                {item.onClick ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      item.onClick?.();
                    }}
                    className="flex w-full items-center gap-2"
                  >
                    {!hideIcons && item.icon && <item.icon />}
                    {hideIcons ? (
                      <span className="block font-semibold text-3xl" >
                        {item.title}
                      </span>
                    ) : (
                      <span className="font-medium text-2xl">{item.title}</span> 
                    )}
                  </button>
                ) : (
                  <Link href="#">
                    {!hideIcons && item.icon && <item.icon />}
                    {hideIcons ? (
                      <span className="block font-semibold text-3xl" >
                        {item.title}
                      </span>
                    ) : (
                      <span className="font-medium text-2xl">{item.title}</span> 
                    )}
                  </Link>
                )}
              </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
