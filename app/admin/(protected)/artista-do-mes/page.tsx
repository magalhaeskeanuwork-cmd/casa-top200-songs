"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
  {
    value: "artist_of_the_month",
    label: "ARTISTA DO MÊS",
    description: "Destaque principal da CASA.",
  },
  {
    value: "new_school_artist",
    label: "ARTISTA DO MÊS (NOVA ESCOLA)",
    description: "Artista em destaque da nova escola.",
  },
  {
    value: "new_school_group",
    label: "GRUPO DO MÊS (NOVA ESCOLA)",
    description: "Grupo em destaque da nova escola.",
  },
  {
    value: "old_school_group",
    label: "GRUPO DO MÊS (VELHA ESCOLA)",
    description: "Grupo em destaque da velha escola.",
  },
  {
    value: "freshman_of_the_month",
    label: "CALOIRO DO MÊS",
    description: "Nova descoberta da CASA.",
  },
];

export default function ArtistOfTheMonthPage() {
  const router = useRouter();

  const [category, setCategory] = useState(categories[0].value);
  const [artistName, setArtistName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Não foi possível ligar ao Supabase.");
      return;
    }

    if (!artistName.trim() || !startsAt) {
      setMessage("Preenche o nome e a data de início.");
      return;
    }

    if (endsAt && endsAt < startsAt) {
      setMessage("A data de fim não pode ser anterior à data de início.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let imageUrl: string | null = null;

      if (image) {
        const fileExtension = image.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("casa-artists")
          .upload(fileName, image, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage
          .from("casa-artists")
          .getPublicUrl(fileName);

        imageUrl = data.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("casa_artist_of_the_month")
        .insert({
          category,
          artist_name: artistName.trim(),
          image_url: imageUrl,
          description: description.trim(),
          starts_at: startsAt,
          ends_at: endsAt || null,
          is_published: published,
        });

      if (insertError) {
        throw insertError;
      }

      setMessage("Destaque guardado com sucesso!");
      setCategory(categories[0].value);
      setArtistName("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setImage(null);
      setPublished(false);

      const fileInput = document.getElementById(
        "artist-image"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage(
        "Ocorreu um erro ao guardar. Verifica os dados e tenta novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#151515",
    border: "1px solid #383838",
    color: "#F2F0E9",
    padding: "14px",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    color: "#F2F0E9",
    fontSize: "11px",
    fontWeight: 800 as const,
    letterSpacing: "1px",
    marginBottom: "9px",
  };

  const selectedCategory = categories.find(
    (item) => item.value === category
  );

  return (
    <main style={{ maxWidth: "760px", margin: "0 auto" }}>
      <a
        href="/admin"
        style={{
          color: "#999",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "1px",
          textDecoration: "none",
        }}
      >
        ← VOLTAR AO PAINEL
      </a>

      <div style={{ marginTop: "36px", marginBottom: "36px" }}>
        <p
          style={{
            color: "#F5D900",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "3px",
          }}
        >
          GESTÃO DE CONTEÚDOS
        </p>

        <h1
          style={{
            fontSize: "clamp(34px, 6vw, 54px)",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1,
            margin: "12px 0",
          }}
        >
          DESTAQUES DO MÊS
        </h1>

        <p style={{ color: "#999", fontSize: "14px", lineHeight: 1.6 }}>
          Gere as cinco categorias de destaque da CASA.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          border: "1px solid #333",
          padding: "clamp(20px, 5vw, 34px)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <div>
          <label htmlFor="category" style={labelStyle}>
            CATEGORIA DO DESTAQUE
          </label>

          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={fieldStyle}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <p style={{ color: "#999", fontSize: "12px", marginTop: "9px" }}>
            {selectedCategory?.description}
          </p>
        </div>

        <div>
          <label htmlFor="artist-name" style={labelStyle}>
            NOME DO ARTISTA OU GRUPO
          </label>

          <input
            id="artist-name"
            type="text"
            value={artistName}
            onChange={(event) => setArtistName(event.target.value)}
            placeholder="Ex.: Plutonio"
            required
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="artist-image" style={labelStyle}>
            FOTOGRAFIA
          </label>

          <input
            id="artist-image"
            type="file"
            accept="image/*"
            onChange={(event) =>
              setImage(event.target.files?.[0] || null)
            }
            style={{ ...fieldStyle, padding: "12px" }}
          />

          <p style={{ color: "#777", fontSize: "11px", marginTop: "8px" }}>
            Formatos JPG, PNG ou WebP.
          </p>
        </div>

        <div>
          <label htmlFor="artist-description" style={labelStyle}>
            DESCRIÇÃO EDITORIAL
          </label>

          <textarea
            id="artist-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Escreve a apresentação do artista ou grupo..."
            rows={6}
            style={{
              ...fieldStyle,
              resize: "vertical",
              lineHeight: 1.6,
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label htmlFor="starts-at" style={labelStyle}>
              DATA DE INÍCIO
            </label>

            <input
              id="starts-at"
              type="date"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
              style={fieldStyle}
            />
          </div>

          <div>
            <label htmlFor="ends-at" style={labelStyle}>
              DATA DE FIM
            </label>

            <input
              id="ends-at"
              type="date"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              min={startsAt || undefined}
              style={fieldStyle}
            />
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => setPublished(event.target.checked)}
            style={{
              width: "17px",
              height: "17px",
              accentColor: "#F5D900",
            }}
          />
          PUBLICAR ESTE DESTAQUE
        </label>

        {message && (
          <p
            role="status"
            style={{
              color: message.includes("sucesso") ? "#24A99B" : "#F184D2",
              fontSize: "13px",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "#F5D900",
            color: "#090909",
            border: "none",
            padding: "17px",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "1px",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "A GUARDAR..." : "GUARDAR DESTAQUE"}
        </button>
      </form>
    </main>
  );
}