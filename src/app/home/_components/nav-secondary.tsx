'use client'

import * as React from "react"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavSecondary({
  items,
  hideIcons = false,
  ...props
}: {
  items: {
    title: string
    icon: LucideIcon
    onClick?: () => void
  }[]
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
              <SidebarMenuButton
                onClick={item.onClick}
                className={
                  hideIcons ? (
                    // Estilo minimalista
                    cn(
                      "text-muted-foreground hover:!bg-transparent focus:!bg-transparent active:!bg-transparent overflow-hidden"
                    )
                  ) : (
                    // Estilo normal
                    cn(
                      "text-muted-foreground"
                    )
                  )
                }
              >
                {!hideIcons && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
