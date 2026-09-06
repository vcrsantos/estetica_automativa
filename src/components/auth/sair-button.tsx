"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SairButton() {
  const router = useRouter();
  const [saindo, setSaindo] = React.useState(false);

  async function handleSignOut() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="outline" className="w-full" disabled={saindo} onClick={handleSignOut}>
      Sair
    </Button>
  );
}
