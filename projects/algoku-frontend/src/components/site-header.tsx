import { ModeToggle } from "@/components/ModeToggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import WalletButton from "@/components/WalletButton"

interface SiteHeaderProps {
  chipWhenDisconnected?: string
}

export function SiteHeader({ chipWhenDisconnected }: SiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-semibold tracking-tight">algoku</h1>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <WalletButton chipWhenDisconnected={chipWhenDisconnected} />
        </div>
      </div>
    </header>
  )
}
