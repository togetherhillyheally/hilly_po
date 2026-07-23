"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabase } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={async () => {
        await getSupabase().auth.signOut()
        router.replace("/")
        router.refresh()
      }}
    >
      <LogOut className="mr-1.5 h-4 w-4" />
      로그아웃
    </Button>
  )
}
