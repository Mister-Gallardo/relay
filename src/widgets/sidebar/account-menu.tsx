import { EllipsisVertical, FlaskConical, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { useAccount } from '@/entities/session/queries'
import { useGateway } from '@/entities/session/gateway-context'
import { type ThemePreference, useThemeStore } from '@/features/theme/theme-store'
import { formatPhone } from '@/shared/lib/phone'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

export function AccountMenu({ onSignOut }: { onSignOut: () => void }) {
  const gateway = useGateway()
  const account = useAccount()
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Меню">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 pb-2">
          <span className="text-[15px] text-fg">
            {account.data?.phone ? formatPhone(account.data.phone) : 'Аккаунт MAX'}
          </span>
          <span>{gateway.mode === 'demo' ? 'Демо-режим' : `Инстанс ${gateway.instanceId}`}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Тема</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) => setPreference(value as ThemePreference)}
        >
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Тёмная
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun />
            Светлая
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            Как в системе
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onSignOut}>
          {gateway.mode === 'demo' ? <FlaskConical /> : <LogOut />}
          {gateway.mode === 'demo' ? 'Выйти из демо' : 'Выйти'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
