"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@rutas/components/ui/sidebar"
import { cn } from "@rutas/lib/utils"

export function NavSecondary({
  items,
  currentPath,
  hideIcons = false,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
  }[]
  currentPath: string
  hideIcons?: boolean
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup className={cn(hideIcons && "h-full flex flex-col")} {...props}>
      <SidebarGroupContent className={cn(
        hideIcons && "justify-center items-center h-full"
      )}>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild
                className={cn(
                  "text-muted-foreground",
                  item.url === currentPath && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                <a href={item.url}>
                  {!hideIcons && <item.icon />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
