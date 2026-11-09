"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Article = {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  async function fetchArticles() {
    setLoading(true);
    setError("");

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from("casa_articles")
      .select(
        "id, title, slug, category, status, published_at, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError("Não foi possível carregar os artigos.");
      console.error(error);
    } else {
      setArticles(data || []);
    }

    setLoading(false);
  }

  async function toggleArticle(article: Article) {
    if (!supabase) return;
    setBusyId(article.id);
    const status = article.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("casa_articles").update({ status, published_at: status === "published" ? new Date().toISOString() : null }).eq("id", article.id);
    setBusyId(null);
    if (error) { setError("Não foi possível alterar a visibilidade do artigo."); return; }
    setArticles((current) => current.map((item) => item.id === article.id ? { ...item, status, published_at: status === "published" ? new Date().toISOString() : null } : item));
  }

  async function deleteArticle(article: Article) {
    if (!supabase || !window.confirm(`Apagar o artigo “${article.title}”?`)) return;
    setBusyId(article.id);
    const { error } = await supabase.from("casa_articles").delete().eq("id", article.id);
    setBusyId(null);
    if (error) { setError("Não foi possível apagar o artigo. Confirma as permissões no Supabase."); return; }
    setArticles((current) => current.filter((item) => item.id !== article.id));
  }

  const publishedCount = articles.filter(
    (article) => article.status === "published"
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "draft"
  ).length;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#090909",
        color: "#F2F0E9",
        padding: "48px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/admin"
          style={{
            color: "#F5D900",
            textDecoration: "none",
            fontSize: "11px",
            letterSpacing: "2px",
          }}
        >
          ← VOLTAR AO DASHBOARD
        </Link>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "24px",
            flexWrap: "wrap",
            marginTop: "48px",
            marginBottom: "40px",
          }}
        >
          <div>
            <p
              style={{
                color: "#F5D900",
                fontSize: "11px",
                letterSpacing: "3px",
                marginBottom: "12px",
              }}
            >
              CASA / CMS
            </p>

            <h1
              style={{
                fontSize: "clamp(42px, 7vw, 76px)",
                fontWeight: 900,
                letterSpacing: "-4px",
                lineHeight: 0.95,
                margin: 0,
              }}
            >
              ARTIGOS
            </h1>

            <p
              style={{
                color: "#999",
                fontSize: "13px",
                marginTop: "16px",
              }}
            >
              Gere os artigos e conteúdos editoriais da CASA.
            </p>
          </div>

          <Link
            href="/admin/artigos/novo"
            style={{
              background: "#F5D900",
              color: "#090909",
              padding: "16px 22px",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "1px",
            }}
          >
            + NOVO ARTIGO
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          {[
            { label: "TOTAL DE ARTIGOS", value: articles.length },
            { label: "PUBLICADOS", value: publishedCount },
            { label: "RASCUNHOS", value: draftCount },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid #292929",
                padding: "22px",
              }}
            >
              <p
                style={{
                  color: "#888",
                  fontSize: "10px",
                  letterSpacing: "1.5px",
                  margin: 0,
                }}
              >
                {item.label}
              </p>

              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  margin: "12px 0 0",
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#999", padding: "30px 0" }}>
            A carregar artigos...
          </p>
        ) : error ? (
          <p style={{ color: "#F184D2" }}>{error}</p>
        ) : articles.length === 0 ? (
          <div
            style={{
              border: "1px solid #292929",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <h2 style={{ fontSize: "22px", margin: "0 0 12px" }}>
              Ainda não existem artigos.
            </h2>

            <p style={{ color: "#999", fontSize: "13px" }}>
              Cria o primeiro artigo para começar a preencher a secção editorial.
            </p>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid #333" }}>
            {articles.map((article, index) => (
              <div
                key={article.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px minmax(0, 1fr) auto auto auto",
                  alignItems: "center",
                  gap: "20px",
                  padding: "22px 8px",
                  borderBottom: "1px solid #292929",
                }}
              >
                <span
                  style={{
                    color: "#666",
                    fontSize: "12px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: "16px",
                      fontWeight: 800,
                      margin: "0 0 7px",
                    }}
                  >
                    {article.title}
                  </h2>

                  <p
                    style={{
                      color: "#777",
                      fontSize: "11px",
                      margin: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    /{article.slug}
                    {article.category ? ` · ${article.category}` : ""}
                  </p>
                </div>

                <span
                  style={{
                    color:
                      article.status === "published" ? "#24A99B" : "#F5D900",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {article.status === "published"
                    ? "PUBLICADO"
                    : "RASCUNHO"}
                </span>

                <Link
                  href={`/admin/artigos/${article.id}`}
                  style={{
                    color: "#F2F0E9",
                    border: "1px solid #444",
                    padding: "10px 14px",
                    textDecoration: "none",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "1px",
                  }}
                >
                  EDITAR
                </Link>
                <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                  <button type="button" disabled={busyId === article.id} onClick={() => void toggleArticle(article)} style={{ color: "#d7ff43", background: "transparent", border: "1px solid #4b5631", padding: "10px 12px", fontSize: "9px", fontWeight: 800, cursor: "pointer" }}>
                    {article.status === "published" ? "OCULTAR" : "PUBLICAR"}
                  </button>
                  <button type="button" disabled={busyId === article.id} onClick={() => void deleteArticle(article)} style={{ color: "#ff8068", background: "transparent", border: "1px solid #633a33", padding: "10px 12px", fontSize: "9px", fontWeight: 800, cursor: "pointer" }}>REMOVER</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
