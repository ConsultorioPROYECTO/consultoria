'use client'

import { useState } from 'react';

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogout,
  IconMail,
  IconNotification,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@rutas/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rutas/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@rutas/components/ui/sidebar"
import { useAuth } from "../../context/AuthContext"
import { useNavigation } from "../../context/NavigationContext"

import { SettingsModal2 } from "./SettingsModal2"
import { SettingsDialog } from "./SettingsModal"
import { InviteModal } from "./InviteModal"


export function NavUser({
  user,
  hideIcons = false,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  hideIcons?: boolean
}) {
  const { isMobile } = useSidebar()
  const { signOut } = useAuth()
  const { setCurrentView } = useNavigation()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSettingsModalOpen2, setIsSettingsModalOpen2] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleOpenSettingsModal = () => {
    setIsDropdownOpen(false); // Cerrar dropdown explícitamente
    setCurrentView('configuration');
  };

  const handleCloseSettingsModal = (open: boolean) => {
    setIsSettingsModalOpen(open);
  };

  const handleOpenInviteModal = () => {
    setIsDropdownOpen(false); // Cerrar dropdown explícitamente
    setIsInviteModalOpen(true);
  };

  const handleCloseInviteModal = (open: boolean) => {
    setIsInviteModalOpen(open);
  };

  const handleOpenSettingsModal2 = () => {
    setIsDropdownOpen(false); // Cerrar dropdown explícitamente
    setIsSettingsModalOpen2(true);
  };

  const handleCloseSettingsModal2 = (open: boolean) => {
    setIsSettingsModalOpen2(open);
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size={hideIcons ? "default" : "lg"}
                className={hideIcons ? 
                  "px-4 py-2 data-[state=open]:bg-transparent data-[state=open]:text-sidebar-accent-foreground hover:!bg-transparent focus:!bg-transparent active:!bg-transparent focus-visible:!bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 border-0 outline-none ring-0 focus:ring-0 focus:outline-none !shadow-none" :
                  "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                }
              >
                <Avatar className={hideIcons ? "h-6 w-6 rounded-lg" : "h-8 w-8 rounded-lg"}>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                {!hideIcons && (
                  <>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    </div>
                    <IconDotsVertical className="ml-auto size-4" />
                  </>
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleOpenInviteModal}>
                  <IconMail />
                  Invitaciones
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconUserCircle />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconCreditCard />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconNotification />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenSettingsModal}>
                  <IconSettings />
                  Configuraciones
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleOpenSettingsModal2}>
                  <IconSettings />
                  Configuraciones 2
                </DropdownMenuItem>

              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}>
                <IconLogout />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SettingsDialog
        isOpen={isSettingsModalOpen}
        onOpenChange={handleCloseSettingsModal}
      />
      <SettingsModal2
        isOpen={isSettingsModalOpen2}
        onOpenChange={handleCloseSettingsModal2}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onOpenChange={handleCloseInviteModal}
      />
    </>
  )
}
