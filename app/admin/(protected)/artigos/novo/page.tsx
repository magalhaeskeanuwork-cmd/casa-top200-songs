"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewArticlePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("CULTURA");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(createSlug(value));
  }

  function handleImageChange(file: File | null) {
    setCoverImage(file);

    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }

    setCoverPreview(file ? URL.createObjectURL(file) : "");
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
      setError("Não foi possível gerar o endereço do artigo.");
      return;
    }

    const client = supabase;
    if (!client) {
      setError("A ligação ao Supabase não está configurada.");
      return;
    }

    setSaving(true);

    try {
      let coverImageUrl: string | null = null;

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

      const { error: insertError } = await client
        .from("casa_articles")
        .insert({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          content: content.trim(),
          category,
          cover_image_url: coverImageUrl,
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        });

      if (insertError) {
        throw insertError;
      }

      router.push("/admin/artigos");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        "Não foi possível guardar o artigo. Confirma os dados e tenta novamente."
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
            NOVO ARTIGO
          </h1>

          <p style={{ color: "#999", fontSize: "13px", marginTop: "16px" }}>
            Cria um novo conteúdo editorial para a CASA.
          </p>
        </div>

        <div style={{ display: "grid", gap: "26px" }}>
          <div>
            <label style={labelStyle}>TÍTULO DO ARTIGO</label>
            <input
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Ex.: O novo capítulo da música angolana"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>ENDEREÇO DO ARTIGO</label>
            <input
              value={slug}
              onChange={(event) => setSlug(createSlug(event.target.value))}
              placeholder="endereco-do-artigo"
              style={inputStyle}
            />
            <p style={{ color: "#666", fontSize: "11px", marginTop: "8px" }}>
              Este endereço é gerado automaticamente a partir do título, mas
              podes alterá lo.
            </p>
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
              placeholder="Escreve uma breve apresentação do artigo..."
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
                ESCOLHER IMAGEM
              </span>

              <p style={{ color: "#777", fontSize: "11px", marginBottom: 0 }}>
                {coverImage
                  ? coverImage.name
                  : "Seleciona uma imagem para a capa do artigo."}
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
              placeholder="Escreve aqui o artigo completo..."
              rows={16}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.8,
              }}
            />
            <p style={{ color: "#666", fontSize: "11px", marginTop: "8px" }}>
              Nesta versão, o conteúdo é guardado como texto simples. Mais
              tarde podemos acrescentar formatação, subtítulos e imagens no
              corpo do artigo.
            </p>
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
            GUARDAR RASCUNHO
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