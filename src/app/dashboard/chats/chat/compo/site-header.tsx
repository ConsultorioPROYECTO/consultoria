import { Button } from "@rutas/components/ui/button"
import { useRouter } from 'next/navigation'
import { IconArrowLeft } from '@tabler/icons-react'


export function SiteHeader() {
  const router = useRouter()
  return (
    // Clases modificadas en el header
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"> 
    <div className="flex w-full items-center gap-2 lg:gap-2 lg:px-6">
        <Button onClick={() => router.push('/dashboard/chats')} className="size-7 bg-transparent text-muted-foreground hover:text-muted-foreground">
          <IconArrowLeft className="h-5 w-5" />
        </Button>
        {/* <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        /> */}
        <h1 className="text-base flex-1 text-center">Nombre paciente</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
