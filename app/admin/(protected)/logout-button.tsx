"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (!supabase) return;

    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Não foi possível terminar a sessão.");
      setLoading(false);
      return;
    }

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      style={{
        background: "transparent",
        border: "1px solid #F5D900",
        color: "#F5D900",
        padding: "10px 16px",
        fontSize: "11px",
        fontWeight: 800,
        letterSpacing: "1px",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "A TERMINAR..." : "TERMINAR SESSÃO"}
    </button>
  );
}