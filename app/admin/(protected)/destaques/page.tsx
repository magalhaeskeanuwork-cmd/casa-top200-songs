
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type EditorialHighlight = {
  id: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  image_url: string | null;
  section: string;
  card_size: "small" | "medium" | "large" | "featured";
  sort_order: number;
  is_published: boolean;
  published_at: string | null;
};

export default function DestaquesAdminPage() {
  const [highlights, setHighlights] = useState<EditorialHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState("all");

  async function loadHighlights() {
    setLoading(true);
    setError("");

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("casa_editorial_highlights")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setError("Não foi possível carregar os destaques.");
      setLoading(false);
      return;
    }

    setHighlights(data || []);
    setLoading(false);
  }

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    if (["featured", "interviews", "awards", "news"].includes(requestedSection || "")) {
      setSectionFilter(requestedSection || "all");
    }
    loadHighlights();
  }, []);

  const visibleHighlights = highlights.filter(
    (highlight) => sectionFilter === "all" || highlight.section === sectionFilter,
  );

  async function deleteHighlight(id: string) {
    const confirmed = window.confirm(
      "Tens a certeza de que queres apagar este card?"
    );

    if (!confirmed) return;

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      return;
    }

    setDeletingId(id);
    setError("");

    const { error } = await client
      .from("casa_editorial_highlights")
      .delete()
      .eq("id", id);

    if (error) {
      setError("Não foi possível apagar o card.");
      setDeletingId(null);
      return;
    }

    setHighlights((current) =>
      current.filter((highlight) => highlight.id !== id)
    );

    setDeletingId(null);
  }

  const styles = {
    page: {
      width: "100%",
      maxWidth: "1100px",
      margin: "0 auto",
      padding: "48px 24px 80px",
      color: "var(--foreground, #090909)",
    } as const,
    top: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "20px",
      flexWrap: "wrap" as const,
      marginBottom: "36px",
    },
    eyebrow: {
      fontSize: "11px",
      letterSpacing: "0.12em",
      textTransform: "uppercase" as const,
      opacity: 0.55,
      marginBottom: "10px",
    },
    heading: {
      fontSize: "clamp(30px, 5vw, 48px)",
      fontWeight: 900,
      letterSpacing: "-0.05em",
      lineHeight: 1,
      margin: 0,
    },
    button: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "14px 20px",
      background: "#F5D900",
      color: "#090909",
      textDecoration: "none",
      fontSize: "11px",
      fontWeight: 900,
      letterSpacing: "0.08em",
      border: "1px solid #090909",
    },
    list: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    },
    item: {
      display: "grid",
      gridTemplateColumns: "90px minmax(0, 1fr) auto",
      gap: "20px",
      alignItems: "center",
      padding: "16px",
      border: "1px solid rgba(128,128,128,0.3)",
      background: "var(--background, #F2F0E9)",
    },
    image: {
      width: "90px",
      height: "90px",
      objectFit: "cover" as const,
      background: "#D8D5CC",
    },
    placeholder: {
      width: "90px",
      height: "90px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#D8D5CC",
      fontSize: "10px",
      fontWeight: 800,
    },
    title: {
      fontSize: "18px",
      fontWeight: 900,
      margin: "0 0 6px",
    },
    meta: {
      fontSize: "11px",
      opacity: 0.65,
      margin: 0,
      lineHeight: 1.7,
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap" as const,
    },
    action: {
      padding: "10px 12px",
      border: "1px solid currentColor",
      color: "inherit",
      textDecoration: "none",
      fontSize: "10px",
      fontWeight: 900,
      letterSpacing: "0.06em",
      background: "transparent",
      cursor: "pointer",
    },
    status: {
      display: "inline-block",
      fontSize: "9px",
      fontWeight: 900,
      letterSpacing: "0.08em",
      padding: "5px 7px",
      marginTop: "7px",
      background: "#D8D5CC",
      color: "#090909",
    },
    error: {
      padding: "14px",
      border: "1px solid #C43D3D",
      color: "#C43D3D",
      fontSize: "13px",
      marginBottom: "20px",
    },
    empty: {
      padding: "48px 20px",
      textAlign: "center" as const,
      border: "1px dashed rgba(128,128,128,0.5)",
      fontSize: "13px",
      opacity: 0.7,
    },
  };

  return (
    <main style={styles.page}>
      <div style={styles.top}>
        <div>
          <p style={styles.eyebrow}>CMS CASA / CONTEÚDO EDITORIAL</p>
          <h1 style={styles.heading}>
            {sectionFilter === "interviews" ? "ENTREVISTAS" : "DESTAQUES"}
          </h1>
          <p style={styles.meta}>
            Os cards marcados como homepage aparecem na página inicial e em Destaques.
          </p>
        </div>

        <Link
          href={sectionFilter === "interviews"
            ? "/admin/destaques/novo?section=interviews"
            : "/admin/destaques/novo"}
          style={styles.button}
        >
          {sectionFilter === "interviews" ? "+ NOVA ENTREVISTA" : "+ NOVO CARD"}
        </Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
        {[
          { label: "TODOS OS CARDS", value: "all" },
          { label: "HOMEPAGE", value: "featured" },
          { label: "ENTREVISTAS", value: "interviews" },
          { label: "PRÉMIOS", value: "awards" },
          { label: "NOTÍCIAS", value: "news" },
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSectionFilter(filter.value)}
            style={{
              padding: "9px 12px",
              border: "1px solid currentColor",
              background: sectionFilter === filter.value ? "#090909" : "transparent",
              color: sectionFilter === filter.value ? "#F2F0E9" : "inherit",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.06em",
              cursor: "pointer",
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={styles.meta}>A carregar os cards...</p>
      ) : visibleHighlights.length === 0 ? (
        <div style={styles.empty}>
          <p>
            {sectionFilter === "interviews"
              ? "Ainda não existem entrevistas no CMS."
              : "Ainda não existem cards editoriais nesta secção."}
          </p>
          <p>Cria um novo conteúdo para começar a preencher esta secção.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {visibleHighlights.map((highlight) => (
            <article key={highlight.id} style={styles.item}>
              {highlight.image_url ? (
                <img
                  src={highlight.image_url}
                  alt={highlight.title}
                  style={styles.image}
                />
              ) : (
                <div style={styles.placeholder}>SEM IMAGEM</div>
              )}

              <div>
                <h2 style={styles.title}>{highlight.title}</h2>

                <p style={styles.meta}>
                  {highlight.section === "featured"
                    ? "HOMEPAGE + DESTAQUES"
                    : highlight.section.toUpperCase()}
                  {" · "}
                  {highlight.category || "Sem categoria"}
                  {" · "}
                  {highlight.card_size.toUpperCase()}
                  {" · "}
                  POSIÇÃO {highlight.sort_order}
                </p>

                {highlight.subtitle && (
                  <p style={styles.meta}>{highlight.subtitle}</p>
                )}

                <span style={styles.status}>
                  {highlight.is_published ? "PUBLICADO" : "RASCUNHO"}
                </span>
              </div>

              <div style={styles.actions}>
                <Link
                  href={`/admin/destaques/${highlight.id}${sectionFilter === "interviews" ? "?section=interviews" : ""}`}
                  style={styles.action}
                >
                  EDITAR
                </Link>

                <button
                  type="button"
                  onClick={() => deleteHighlight(highlight.id)}
                  disabled={deletingId === highlight.id}
                  style={styles.action}
                >
                  {deletingId === highlight.id ? "A APAGAR..." : "APAGAR"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
