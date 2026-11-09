
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Movement = "baseline" | "new" | "up" | "down" | "stable";
type ViewMode = "list" | "cards";

type Album = {
  rank: number;
  title: string;
  artist: string;
  chart_date: string;
  market: string;
  source_name: string;
  artwork_url: string | null;
  movement: Movement | null;
  previous_rank: number | null;
  position_change: number | null;
  is_new_entry: boolean;
};

type HistoryRow = {
  rank: number;
  movement: Movement;
  previous_rank: number | null;
  position_change: number | null;
  is_new_entry: boolean;
};

const movementLabels: Record<Movement, string> = {
  baseline: "BASELINE",
  new: "NOVA ENTRADA",
  up: "SUBIU",
  down: "DESCEU",
  stable: "ESTÁVEL",
};

function formatDate(value?: string) {
  if (!value) return "A AGUARDAR DADOS";

  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function MovementTag({ album }: { album: Album }) {
  if (!album.movement) return null;

  const movement = album.movement;
  const value = album.position_change ?? 0;

  return (
    <span className={`album-movement movement-${movement}`}>
      {movement === "up" && `↑ ${value}`}
      {movement === "down" && `↓ ${Math.abs(value)}`}
      {movement === "new" && "NEW"}
      {movement === "stable" && "＝"}
      {movement === "baseline" && "•"}
      <small>{movementLabels[movement]}</small>
    </span>
  );
}

function AlbumArtwork({ album }: { album: Album }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="album-artwork">
      {album.artwork_url && !failed ? (
        <img
          src={album.artwork_url}
          alt={`Capa de ${album.title}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="album-artwork-placeholder">
          <span>CASA</span>
          <small>{String(album.rank).padStart(3, "0")}</small>
        </div>
      )}
    </div>
  );
}

export default function AlbumsChartPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"rank" | "artist" | "title">("rank");
  const [activeTab, setActiveTab] = useState<"chart" | "about">("chart");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadChart() {
      if (!supabase) {
        setError("Não foi possível estabelecer ligação à base de dados.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: chartError } = await supabase
          .from("casa_public_albums_chart")
          .select(
            "rank, title, artist, chart_date, market, source_name, artwork_url"
          )
          .eq("market", "AO")
          .order("rank", { ascending: true })
          .limit(200);

        if (chartError) throw chartError;
        if (cancelled) return;

        const rows = data ?? [];

        if (rows.length === 0) {
          setAlbums([]);
          setLoading(false);
          return;
        }

        const latestDate = rows[0].chart_date;

        const { data: history, error: historyError } = await supabase
          .from("casa_kworb_chart_history")
          .select(
            "rank, movement, previous_rank, position_change, is_new_entry"
          )
          .eq("chart_type", "albums")
          .eq("market", "AO")
          .eq("chart_date", latestDate);

        if (historyError) {
          console.error("Erro ao carregar movimentos:", historyError);
        }

        if (cancelled) return;

        const historyMap = new Map<number, HistoryRow>();

        (history ?? []).forEach((item) => {
          historyMap.set(item.rank, item as HistoryRow);
        });

        const enriched: Album[] = rows.map((album) => {
          const movement = historyMap.get(album.rank);

          return {
            ...album,
            movement: movement?.movement ?? null,
            previous_rank: movement?.previous_rank ?? null,
            position_change: movement?.position_change ?? null,
            is_new_entry: movement?.is_new_entry ?? false,
          };
        });

        setAlbums(enriched);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar CASA Albums Chart:", err);

        if (!cancelled) {
          setError("Não foi possível carregar o chart. Tenta novamente.");
          setLoading(false);
        }
      }
    }

    loadChart();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAlbums = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-PT");

    const result = albums.filter((album) =>
      `${album.rank} ${album.title} ${album.artist}`
        .toLocaleLowerCase("pt-PT")
        .includes(query)
    );

    return [...result].sort((a, b) => {
      if (sort === "artist") return a.artist.localeCompare(b.artist, "pt");
      if (sort === "title") return a.title.localeCompare(b.title, "pt");
      return a.rank - b.rank;
    });
  }, [albums, search, sort]);

  const topTwenty = filteredAlbums.filter((album) => album.rank <= 20);
  const chartDate = albums[0]?.chart_date;

  const movementCounts = {
    new: albums.filter((album) => album.movement === "new").length,
    up: albums.filter((album) => album.movement === "up").length,
    down: albums.filter((album) => album.movement === "down").length,
    stable: albums.filter((album) => album.movement === "stable").length,
  };

  return (
    <main className="albums-page">
      <section className="albums-intro">
        <div className="albums-intro-top">
          <span>CASA ORIGINAL CHARTS</span>
          <span>02 / 05</span>
        </div>

        <div className="albums-intro-content">
          <div>
            <p className="albums-eyebrow">ANGOLA · MÚSICA · ÁLBUNS</p>
            <h1>
              CASA
              <br />
              TOP <span>200.</span>
            </h1>
            <p className="albums-description">
              Os álbuns que marcam o panorama musical angolano.
              Uma leitura independente da presença e evolução
              dos projectos nos charts.
            </p>
          </div>

          <div className="albums-intro-stamp">
            <span>THE SOUND</span>
            <strong>OF</strong>
            <strong>ANGOLA</strong>
            <small>CASA · AO</small>
          </div>
        </div>

        <div className="albums-intro-bottom">
          <span>CHARTS ÁLBUNS</span>
          <span>EDIÇÃO · {formatDate(chartDate)}</span>
        </div>
      </section>

      <section className="albums-stats">
        <div>
          <span>ÁLBUNS NO CHART</span>
          <strong>{albums.length || "—"}</strong>
        </div>
        <div>
          <span>SUBIDAS</span>
          <strong>{movementCounts.up}</strong>
        </div>
        <div>
          <span>NOVAS ENTRADAS</span>
          <strong>{movementCounts.new}</strong>
        </div>
      </section>

      <section className="albums-chart-section">
        <div className="albums-section-heading">
          <div>
            <span>01 / CLASSIFICAÇÃO NACIONAL</span>
            <h2>THE ALBUMS CHART</h2>
          </div>
          <span className="albums-edition">
            ANGOLA
            <br />
            {formatDate(chartDate)}
          </span>
        </div>

        <div className="albums-controls">
          <div className="albums-tabs">
            <button
              className={activeTab === "chart" ? "active" : ""}
              onClick={() => setActiveTab("chart")}
            >
              CHART
            </button>
            <button
              className={activeTab === "about" ? "active" : ""}
              onClick={() => setActiveTab("about")}
            >
              SOBRE O CHART
            </button>
          </div>

          {activeTab === "chart" && (
            <div className="albums-filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar álbum ou artista"
                aria-label="Pesquisar álbum ou artista"
              />

              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as typeof sort)
                }
                aria-label="Ordenar chart"
              >
                <option value="rank">Posição</option>
                <option value="artist">Artista</option>
                <option value="title">Título</option>
              </select>
            </div>
          )}

          {activeTab === "chart" && (
            <div className="albums-view-switch">
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
              >
                ☷ LISTA
              </button>
              <button
                className={viewMode === "cards" ? "active" : ""}
                onClick={() => setViewMode("cards")}
              >
                ▦ TOP 20
              </button>
            </div>
          )}
        </div>

        {activeTab === "chart" ? (
          <>
            {loading && (
              <div className="albums-message">A CARREGAR O CHART...</div>
            )}

            {error && (
              <div className="albums-message albums-error">{error}</div>
            )}

            {!loading && !error && albums.length === 0 && (
              <div className="albums-message">
                Ainda não existem dados disponíveis.
              </div>
            )}

            {!loading && !error && albums.length > 0 && (
              <>
                <div className="albums-movement-summary">
                  <span>MOVIMENTOS DESTA EDIÇÃO</span>
                  <span>↑ {movementCounts.up} SUBIDAS</span>
                  <span>↓ {movementCounts.down} DESCIDAS</span>
                  <span>NEW {movementCounts.new} NOVAS</span>
                  <span>＝ {movementCounts.stable} ESTÁVEIS</span>
                </div>

                {filteredAlbums.length === 0 ? (
                  <div className="albums-message">
                    Não encontrámos resultados para “{search}”.
                  </div>
                ) : viewMode === "cards" ? (
                  <>
                    <div className="albums-list-heading">
                      <div>
                        <span>AS PRIMEIRAS VINTE</span>
                        <h3>TOP 20</h3>
                      </div>
                      <span>01 A 20</span>
                    </div>

                    <div className="albums-top-grid">
                      {topTwenty.map((album) => (
                        <article
                          className="albums-feature-card"
                          key={album.rank}
                        >
                          <div className="albums-feature-top">
                            <span>
                              {String(album.rank).padStart(2, "0")}
                            </span>
                            <MovementTag album={album} />
                          </div>

                          <AlbumArtwork album={album} />

                          <div className="albums-feature-info">
                            <strong>{album.title}</strong>
                            <span>{album.artist}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="albums-list-heading">
                      <div>
                        <span>CLASSIFICAÇÃO COMPLETA</span>
                        <h3>TOP 200 ÁLBUNS</h3>
                      </div>
                      <span>{filteredAlbums.length} RESULTADOS</span>
                    </div>

                    <div className="albums-list">
                      {filteredAlbums.map((album) => (
                        <article
                          className="albums-list-row"
                          key={album.rank}
                        >
                          <span className="albums-list-rank">
                            {String(album.rank).padStart(3, "0")}
                          </span>

                          <AlbumArtwork album={album} />

                          <div className="albums-list-info">
                            <strong>{album.title}</strong>
                            <span>{album.artist}</span>
                          </div>

                          <MovementTag album={album} />
                        </article>
                      ))}
                    </div>
                  </>
                )}

                <div className="albums-list-footer">
                  <span>
                    A MOSTRAR {filteredAlbums.length} DE {albums.length} ÁLBUNS
                  </span>
                  <span>FONTE: {albums[0]?.source_name || "CASA"}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="albums-methodology">
            <span>CASA / METODOLOGIA</span>
            <h3>OS ÁLBUNS QUE DEFINEM O MOMENTO.</h3>

            <p>
              O CASA Top 200 Álbuns acompanha as posições dos álbuns
              no chart Apple Music Angola. A classificação apresentada
              reflecte a fonte e a data de recolha indicadas nesta página.
            </p>

            <p>
              Os dados de histórico e movimentação são associados às
              posições do chart sempre que existe registo correspondente.
              A ausência de um indicador não significa necessariamente
              que um álbum não tenha mudado de posição.
            </p>

            <p>
              A CASA é uma plataforma independente e não é afiliada,
              patrocinada ou operada pela Apple Music ou pela Kworb.
            </p>
          </div>
        )}
      </section>

      <footer className="albums-footer">
        <Link href="/">
          CASA<sup>®</sup>
        </Link>
        <span>CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS</span>
        <span>ANGOLA · © 2026</span>
      </footer>

      <style jsx global>{`
        .albums-page {
          --ink: var(--casa-foreground);
          --paper: var(--casa-background);
          --yellow: #f5d900;
          --teal: #24a99b;
          --pink: #f184d2;
          --purple: #8a5be2;

          width: min(1440px, 100%);
          margin: 0 auto;
          padding: 0 30px;
          color: var(--ink);
          background: var(--paper);
          font-family: inherit;
          transition: color 180ms ease, background 180ms ease;
        }

        .albums-page *,
        .albums-page *::before,
        .albums-page *::after {
          box-sizing: border-box;
        }

        .albums-page a {
          color: inherit;
          text-decoration: none;
        }

        .albums-page button,
        .albums-page input,
        .albums-page select {
          font: inherit;
        }

        .albums-intro {
          margin-top: 25px;
          padding: 20px 25px;
          color: #090909;
          background: var(--yellow);
          border-radius: 5px;
        }

        .albums-intro-top,
        .albums-intro-bottom {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          font-family: monospace;
          font-size: 12px;
          letter-spacing: 0.06em;
        }

        .albums-intro-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 45px 0;
        }

        .albums-eyebrow {
          font-family: monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
        }

        .albums-intro h1 {
          margin: 22px 0;
          font-size: clamp(65px, 11vw, 145px);
          line-height: 0.78;
          letter-spacing: -0.105em;
          font-weight: 950;
        }

        .albums-intro h1 span {
          color: var(--teal);
        }

        .albums-description {
          max-width: 440px;
          margin: 0;
          font-size: 17px;
          line-height: 1.6;
        }

        .albums-intro-stamp {
          width: 190px;
          height: 190px;
          flex: 0 0 190px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 2px solid #090909;
          border-radius: 50%;
          transform: rotate(8deg);
        }

        .albums-intro-stamp span,
        .albums-intro-stamp small {
          font-family: monospace;
          font-size: 10px;
        }

        .albums-intro-stamp strong {
          font-size: 31px;
          line-height: 0.95;
        }

        .albums-intro-stamp small {
          margin-top: 10px;
        }

        .albums-intro-bottom {
          padding-top: 18px;
          border-top: 1px solid rgba(9, 9, 9, 0.3);
        }

        .albums-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin: 0 0 65px;
          border-bottom: 1px solid var(--casa-border);
        }

        .albums-stats div {
          min-width: 0;
          padding: 25px 17px;
          border-right: 1px solid var(--casa-border);
        }

        .albums-stats div:first-child {
          padding-left: 0;
        }

        .albums-stats div:last-child {
          border-right: 0;
        }

        .albums-stats span {
          display: block;
          font-family: monospace;
          font-size: 11px;
          color: var(--casa-muted);
        }

        .albums-stats strong {
          display: block;
          margin-top: 12px;
          font-size: 38px;
          line-height: 1;
          font-weight: 800;
        }

        .albums-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          padding-bottom: 18px;
          border-bottom: 2px solid var(--ink);
        }

        .albums-section-heading div > span,
        .albums-edition {
          font-family: monospace;
          font-size: 11px;
          line-height: 1.5;
          color: var(--casa-muted);
        }

        .albums-section-heading h2 {
          margin: 8px 0 0;
          font-size: clamp(36px, 6vw, 75px);
          line-height: 0.95;
          letter-spacing: -0.08em;
          font-weight: 850;
        }

        .albums-edition {
          text-align: right;
        }

        .albums-controls {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 0;
        }

        .albums-tabs,
        .albums-view-switch {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .albums-tabs button,
        .albums-view-switch button {
          padding: 10px 14px;
          border: 1px solid var(--casa-border);
          border-radius: 0;
          color: var(--ink);
          background: transparent;
          font-family: monospace;
          font-size: 11px;
          cursor: pointer;
          transition: background 160ms ease, color 160ms ease;
        }

        .albums-tabs button.active,
        .albums-view-switch button.active {
          color: var(--paper);
          background: var(--ink);
          border-color: var(--ink);
        }

        .albums-filters {
          display: flex;
          flex: 1;
          justify-content: end;
          gap: 12px;
        }

        .albums-filters input,
        .albums-filters select {
          min-width: 0;
          padding: 11px;
          border: 1px solid var(--casa-border);
          border-radius: 0;
          color: var(--ink);
          background: var(--paper);
          font-family: inherit;
          font-size: 13px;
        }

        .albums-filters input {
          width: min(100%, 300px);
        }

        .albums-filters input::placeholder {
          color: var(--casa-muted);
        }

        .albums-filters select option {
          color: var(--ink);
          background: var(--paper);
        }

        .albums-movement-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          padding: 13px 0;
          border-top: 1px solid var(--casa-border);
          border-bottom: 1px solid var(--casa-border);
          font-family: monospace;
          font-size: 11px;
          color: var(--casa-muted);
        }

        .albums-list-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 15px;
          margin: 35px 0 15px;
        }

        .albums-list-heading span {
          font-family: monospace;
          font-size: 11px;
          color: var(--casa-muted);
        }

        .albums-list-heading h3 {
          margin: 5px 0 0;
          font-size: 32px;
          line-height: 1;
          letter-spacing: -0.06em;
          font-weight: 850;
        }

        .albums-top-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
        }

        .albums-feature-card {
          min-width: 0;
          color: var(--ink);
          background: transparent;
        }

        .albums-feature-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
        }

        .albums-feature-top > span:first-child {
          font-family: monospace;
          font-size: 18px;
        }

        .album-movement {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: monospace;
          font-size: 11px;
          white-space: nowrap;
        }

        .album-movement small {
          font-size: 9px;
        }

        .movement-up {
          color: var(--teal);
        }

        .movement-down {
          color: #d44c45;
        }

        .movement-new {
          color: var(--purple);
        }

        .movement-stable,
        .movement-baseline {
          color: var(--casa-muted);
        }

        .album-artwork {
          width: 100%;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--ink);
        }

        .album-artwork img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .album-artwork-placeholder {
          display: flex;
          height: 100%;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--yellow);
          font-size: 30px;
          font-weight: 900;
        }

        .album-artwork-placeholder small {
          margin-top: 8px;
          font-family: monospace;
          font-size: 10px;
        }

        .albums-feature-info {
          padding: 10px 0 18px;
        }

        .albums-feature-info strong,
        .albums-feature-info span {
          display: block;
        }

        .albums-feature-info strong {
          font-size: 15px;
          line-height: 1.2;
          font-weight: 750;
        }

        .albums-feature-info span {
          margin-top: 6px;
          color: var(--casa-muted);
          font-size: 12px;
        }

        .albums-list-row {
          display: grid;
          grid-template-columns: 48px 66px minmax(0, 1fr) 120px;
          align-items: center;
          gap: 14px;
          padding: 10px 5px;
          border-bottom: 1px solid var(--casa-border);
        }

        .albums-list-rank {
          font-family: monospace;
          font-size: 19px;
        }

        .albums-list-row .album-artwork {
          width: 66px;
        }

        .albums-list-info {
          min-width: 0;
        }

        .albums-list-info strong,
        .albums-list-info span {
          display: block;
        }

        .albums-list-info strong {
          overflow-wrap: anywhere;
          font-size: 15px;
          font-weight: 750;
        }

        .albums-list-info span {
          margin-top: 5px;
          color: var(--casa-muted);
          font-size: 12px;
        }

        .albums-list-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 18px 0;
          color: var(--casa-muted);
          font-family: monospace;
          font-size: 10px;
        }

        .albums-message {
          padding: 35px 0;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.7;
        }

        .albums-error {
          color: #d44c45;
        }

        .albums-methodology {
          max-width: 750px;
          padding: 35px 0;
          font-size: 15px;
          line-height: 1.7;
        }

        .albums-methodology > span {
          font-family: monospace;
          font-size: 11px;
          color: var(--casa-muted);
        }

        .albums-methodology h3 {
          margin: 18px 0;
          font-family: inherit;
          font-size: 35px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.06em;
        }

        .albums-methodology p {
          margin: 0 0 16px;
        }

        .albums-footer {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 60px;
          padding: 22px 0;
          border-top: 1px solid var(--casa-border);
          color: var(--casa-muted);
          font-family: monospace;
          font-size: 10px;
        }

        .albums-footer a {
          color: var(--ink);
          font-family: inherit;
          font-size: 25px;
          font-weight: 950;
          letter-spacing: -0.1em;
        }

        .albums-footer sup {
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .albums-top-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .albums-page {
            padding: 0 18px;
          }

          .albums-intro {
            padding: 17px;
          }

          .albums-intro-content {
            padding: 35px 0;
          }

          .albums-intro h1 {
            font-size: clamp(58px, 12vw, 90px);
          }

          .albums-intro-stamp {
            width: 105px;
            height: 105px;
            flex-basis: 105px;
          }

          .albums-intro-stamp strong {
            font-size: 19px;
          }

          .albums-intro-stamp span,
          .albums-intro-stamp small {
            font-size: 6px;
          }

          .albums-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            margin-bottom: 45px;
          }

          .albums-stats div {
            padding: 16px 8px;
            border-right: 1px solid var(--casa-border);
            border-bottom: 0;
          }

          .albums-stats div:first-child {
            padding-left: 0;
          }

          .albums-stats div:last-child {
            border-right: 0;
          }

          .albums-stats span {
            font-size: 9px;
          }

          .albums-stats strong {
            font-size: 29px;
          }

          .albums-controls {
            align-items: stretch;
          }

          .albums-filters {
            justify-content: stretch;
          }

          .albums-filters input {
            width: 100%;
          }

          .albums-top-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .albums-list-row {
            grid-template-columns: 34px 54px minmax(0, 1fr);
            gap: 9px;
          }

          .albums-list-row .album-artwork {
            width: 54px;
          }

          .albums-list-row > .album-movement {
            grid-column: 3;
          }

          .albums-list-footer {
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .albums-page {
            padding: 0 13px;
          }

          .albums-intro-content {
            align-items: flex-start;
          }

          .albums-intro-stamp {
            width: 82px;
            height: 82px;
            flex-basis: 82px;
          }

          .albums-intro-stamp strong {
            font-size: 15px;
          }

          .albums-description {
            font-size: 14px;
          }

          .albums-section-heading h2 {
            font-size: clamp(30px, 8vw, 48px);
          }

          .albums-edition {
            font-size: 9px;
          }

          .albums-tabs button,
          .albums-view-switch button {
            padding: 9px 10px;
            font-size: 9px;
          }

          .albums-filters {
            flex-direction: column;
          }

          .albums-filters input,
          .albums-filters select {
            width: 100%;
          }

          .albums-movement-summary {
            gap: 10px;
            font-size: 9px;
          }

          .albums-list-heading h3 {
            font-size: 26px;
          }

          .albums-list-heading span {
            font-size: 9px;
          }

          .albums-list-row {
            grid-template-columns: 30px 46px minmax(0, 1fr);
            gap: 8px;
          }

          .albums-list-row .album-artwork {
            width: 46px;
          }

          .albums-list-rank {
            font-size: 15px;
          }

          .albums-list-info strong {
            font-size: 13px;
          }

          .albums-list-info span {
            font-size: 11px;
          }

          .albums-list-row > .album-movement {
            font-size: 9px;
          }

          .albums-methodology h3 {
            font-size: 29px;
          }

          .albums-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
