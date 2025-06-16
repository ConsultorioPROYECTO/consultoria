"use client"

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

export function NavMain({
  items,
  currentPath,
  hideIcons = false,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    onClick?: () => void
  }[]
  currentPath: string
  hideIcons?: boolean
}) {
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
                        item.url === currentPath && "bg-transparent text-primary"
                      )
                    ) : (
                      // Estilo normal
                      cn(
                        "text-muted-foreground",
                        item.url === currentPath && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
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
                        item.url === currentPath && "bg-transparent text-primary"
                      )
                    ) : (
                      // Estilo normal
                      cn(
                        "text-muted-foreground",
                        item.url === currentPath && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
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
                  <Link href={item.url}>
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
