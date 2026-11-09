"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AdminLoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!supabase) {
      setError("Não foi possível ligar ao Supabase.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou palavra passe incorretos.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    const destination =
      next && next.startsWith("/admin") && !next.startsWith("/admin/login")
        ? next
        : "/admin";

    // A full navigation lets the Supabase SSR middleware read the newly
    // written auth cookies before it decides whether to allow /admin.
    window.location.assign(destination);
  }

  return (
    <main
      className="admin-login-screen"
      style={{
        minHeight: "100vh",
        background: "#090909",
        color: "#F2F0E9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div
          style={{
            color: "#F5D900",
            fontSize: "14px",
            fontWeight: 800,
            letterSpacing: "5px",
            marginBottom: "48px",
          }}
        >
          CASA
        </div>

        <p
          style={{
            color: "#F5D900",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "3px",
            marginBottom: "12px",
          }}
        >
          ÁREA RESERVADA
        </p>

        <h1
          style={{
            fontSize: "42px",
            lineHeight: 1,
            margin: "0 0 14px",
            fontWeight: 900,
          }}
        >
          CMS
        </h1>

        <p style={{ color: "#999", marginBottom: "36px", fontSize: "14px" }}>
          Entra para gerir os conteúdos da CASA.
        </p>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "9px",
            }}
          >
            EMAIL
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="O teu email"
            style={inputStyle}
          />

          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "12px",
              marginBottom: "9px",
              marginTop: "22px",
            }}
          >
            PALAVRA PASSE
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="A tua palavra passe"
            style={inputStyle}
          />

          {error && (
            <p
              role="alert"
              style={{
                color: "#F184D2",
                fontSize: "13px",
                marginTop: "18px",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: "28px",
              padding: "17px",
              border: "none",
              background: "#F5D900",
              color: "#090909",
              fontWeight: 900,
              fontSize: "12px",
              letterSpacing: "2px",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "A ENTRAR..." : "ENTRAR NO CMS"}
          </button>
        </form>

        <p
          style={{
            color: "#666",
            fontSize: "11px",
            marginTop: "48px",
            letterSpacing: "1px",
          }}
        >
          CASA · CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", background: "#090909", color: "#999", display: "grid", placeItems: "center" }}>
          A carregar…
        </main>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "16px",
  background: "#171717",
  border: "1px solid #333",
  color: "#F2F0E9",
  outline: "none",
  fontSize: "14px",
};
