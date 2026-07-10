"use client"

import { useNavigate } from "react-router-dom"

import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"

export function NotFoundError() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <Logo size={48} className="text-muted-foreground" />
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold">This screen doesn't exist</h1>
        <p className="mt-2 text-muted-foreground">
          The page you're looking for isn't part of DavidOS — or it moved.
        </p>
      </div>
      <Button onClick={() => navigate("/dashboard")}>
        Back to Mission Control
      </Button>
    </div>
  )
}
