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
import { motion } from "framer-motion"

export function NavMain({
  items,
  currentPath,
  hideIcons = false,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
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
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={cn(
                  hideIcons ? (
                    // Estilo minimalista
                    cn(
                      "text-muted-foreground hover:bg-transparent overflow-hidden",
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
                <Link href={item.url}>
                  {!hideIcons && item.icon && <item.icon />}
                  {hideIcons ? (
                    <motion.span
                      className="block"
                      initial={{ fontSize: "1.875rem" }}
                      whileHover={{ 
                        fontSize: "2.25rem",
                        transition: { 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 20,
                          duration: 0.2
                        }
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                        duration: 0.2
                      }}
                    >
                      {item.title}
                    </motion.span>
                  ) : (
                    <span>{item.title}</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
