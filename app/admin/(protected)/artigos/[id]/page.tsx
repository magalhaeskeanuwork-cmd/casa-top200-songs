"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  cover_image_url: string | null;
  status: "draft" | "published";
  published_at: string | null;
};

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("CULTURA");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  async function fetchArticle() {
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
      .select("*")
      .eq("id", articleId)
      .single();

    if (error || !data) {
      console.error(error);
      setError("Não foi possível encontrar este artigo.");
      setLoading(false);
      return;
    }

    const currentArticle = data as Article;

    setArticle(currentArticle);
    setTitle(currentArticle.title);
    setSlug(currentArticle.slug);
    setExcerpt(currentArticle.excerpt || "");
    setContent(currentArticle.content || "");
    setCategory(currentArticle.category || "CULTURA");
    setCoverPreview(currentArticle.cover_image_url || "");

    setLoading(false);
  }

  function handleImageChange(file: File | null) {
    setCoverImage(file);

    if (file) {
      const preview = URL.createObjectURL(file);
      setCoverPreview(preview);
    } else {
      setCoverPreview(article?.cover_image_url || "");
    }
  }

  async function saveArticle(status: "draft" | "published") {
    setError("");

    if (!title.trim()) {
      setError("O artigo precisa de um título.");
      return;
    }

    if (!content.trim()) {
      setError("Adiciona algum conteúdo ao artigo.");
      return;
    }

    if (!slug.trim()) {
      setError("O endereço do artigo não pode estar vazio.");
      return;
    }

    if (!article) return;

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      return;
    }

    setSaving(true);

    try {
      let coverImageUrl = article.cover_image_url;

      if (coverImage) {
        const extension = coverImage.name.split(".").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${extension}`;
        const filePath = `articles/${fileName}`;

        const { error: uploadError } = await client.storage
          .from("casa-artists")
          .upload(filePath, coverImage, {
            upsert: false,
            contentType: coverImage.type || undefined,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: imageData } = client.storage
          .from("casa-artists")
          .getPublicUrl(filePath);

        coverImageUrl = imageData.publicUrl;
      }

      const publishedAt =
        status === "published"
          ? article.published_at || new Date().toISOString()
          : null;

      const { error: updateError } = await client
        .from("casa_articles")
        .update({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          category,
          cover_image_url: coverImageUrl,
          status,
          published_at: publishedAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", article.id);

      if (updateError) {
        throw updateError;
      }

      router.push("/admin/artigos");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        "Não foi possível atualizar o artigo. Confirma os dados e tenta novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#111",
    color: "#F2F0E9",
    border: "1px solid #333",
    padding: "15px",
    fontSize: "13px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    color: "#999",
    fontSize: "10px",
    letterSpacing: "1.5px",
    fontWeight: 800,
    marginBottom: "10px",
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#090909",
          color: "#F2F0E9",
          padding: "48px 24px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        A carregar artigo...
      </main>
    );
  }

  if (!article) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#090909",
          color: "#F2F0E9",
          padding: "48px 24px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <p style={{ color: "#F184D2" }}>
          {error || "Artigo não encontrado."}
        </p>

        <Link
          href="/admin/artigos"
          style={{ color: "#F5D900", textDecoration: "none" }}
        >
          VOLTAR AOS ARTIGOS
        </Link>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#090909",
        color: "#F2F0E9",
        padding: "48px 24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <Link
          href="/admin/artigos"
          style={{
            color: "#F5D900",
            textDecoration: "none",
            fontSize: "11px",
            letterSpacing: "2px",
          }}
        >
          ← VOLTAR AOS ARTIGOS
        </Link>

        <div style={{ marginTop: "48px", marginBottom: "40px" }}>
          <p
            style={{
              color: "#F5D900",
              fontSize: "11px",
              letterSpacing: "3px",
              marginBottom: "12px",
            }}
          >
            CASA / CMS / ARTIGOS
          </p>

          <h1
            style={{
              fontSize: "clamp(40px, 7vw, 72px)",
              fontWeight: 900,
              letterSpacing: "-4px",
              lineHeight: 0.95,
              margin: 0,
            }}
          >
            EDITAR ARTIGO
          </h1>

          <p style={{ color: "#999", fontSize: "13px", marginTop: "16px" }}>
            Atualiza o conteúdo editorial da CASA.
          </p>
        </div>

        <div style={{ display: "grid", gap: "26px" }}>
          <div>
            <label style={labelStyle}>TÍTULO DO ARTIGO</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>ENDEREÇO DO ARTIGO</label>
            <input
              value={slug}
              onChange={(event) => setSlug(createSlug(event.target.value))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>CATEGORIA</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={inputStyle}
            >
              <option value="CULTURA">CULTURA</option>
              <option value="MÚSICA">MÚSICA</option>
              <option value="ENTREVISTA">ENTREVISTA</option>
              <option value="OPINIÃO">OPINIÃO</option>
              <option value="NOTÍCIAS">NOTÍCIAS</option>
              <option value="ANÁLISE">ANÁLISE</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>RESUMO</label>
            <textarea
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>IMAGEM DE CAPA</label>

            <label
              style={{
                display: "block",
                border: "1px dashed #555",
                padding: "24px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleImageChange(event.target.files?.[0] || null)
                }
                style={{ display: "none" }}
              />

              <span style={{ color: "#F5D900", fontSize: "12px" }}>
                ALTERAR IMAGEM
              </span>

              <p style={{ color: "#777", fontSize: "11px", marginBottom: 0 }}>
                {coverImage
                  ? coverImage.name
                  : "Seleciona uma nova imagem ou mantém a atual."}
              </p>
            </label>

            {coverPreview && (
              <img
                src={coverPreview}
                alt="Pré visualização da capa"
                style={{
                  width: "100%",
                  maxHeight: "360px",
                  objectFit: "cover",
                  marginTop: "16px",
                }}
              />
            )}
          </div>

          <div>
            <label style={labelStyle}>CONTEÚDO DO ARTIGO</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={16}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.8,
              }}
            />
          </div>
        </div>

        {error && (
          <p
            style={{
              color: "#F184D2",
              fontSize: "12px",
              marginTop: "24px",
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginTop: "36px",
            paddingTop: "24px",
            borderTop: "1px solid #292929",
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={() => saveArticle("draft")}
            style={{
              background: "transparent",
              color: "#F2F0E9",
              border: "1px solid #555",
              padding: "16px 22px",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            GUARDAR COMO RASCUNHO
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => saveArticle("published")}
            style={{
              background: "#F5D900",
              color: "#090909",
              border: "none",
              padding: "16px 22px",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "A GUARDAR..." : "PUBLICAR ARTIGO"}
          </button>
        </div>
      </div>
    </main>
  );
}