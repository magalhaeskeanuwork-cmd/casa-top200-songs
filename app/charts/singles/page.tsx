
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Movement = "baseline" | "new" | "up" | "down" | "stable";

type Track = {
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

function MovementTag({ track }: { track: Track }) {
  if (!track.movement) return null;

  const movement = track.movement;
  const value = track.position_change ?? 0;

  return (
    <span className={`single-movement movement-${movement}`}>
      {movement === "up" && `↑ ${value}`}
      {movement === "down" && `↓ ${Math.abs(value)}`}
      {movement === "new" && "NEW"}
      {movement === "stable" && "＝"}
      {movement === "baseline" && "•"}
      <span className="single-movement-label">
        {movementLabels[movement]}
      </span>
    </span>
  );
}

function TrackArtwork({ track }: { track: Track }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="single-artwork">
      {track.artwork_url && !failed ? (
        <img
          src={track.artwork_url}
          alt={`Capa de ${track.title}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="single-artwork-placeholder">
          {String(track.rank).padStart(2, "0")}
        </div>
      )}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "A AGUARDAR DADOS";

  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

export default function SinglesChartPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"rank" | "artist" | "title">("rank");
  const [activeTab, setActiveTab] = useState<"chart" | "about">("chart");
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
        const { data, error: songsError } = await supabase
          .from("casa_public_songs_chart")
          .select(
            "rank, title, artist, chart_date, market, source_name, artwork_url"
          )
          .eq("market", "AO")
          .order("rank", { ascending: true })
          .limit(200);

        if (songsError) throw songsError;

        if (cancelled) return;

        const songs = data ?? [];

        if (songs.length === 0) {
          setTracks([]);
          setLoading(false);
          return;
        }

        const latestDate = songs[0].chart_date;

        const { data: history, error: historyError } = await supabase
          .from("casa_kworb_chart_history")
          .select(
            "rank, movement, previous_rank, position_change, is_new_entry"
          )
          .eq("chart_type", "songs")
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

        const enriched: Track[] = songs.map((song) => {
          const movement = historyMap.get(song.rank);

          return {
            ...song,
            movement: movement?.movement ?? null,
            previous_rank: movement?.previous_rank ?? null,
            position_change: movement?.position_change ?? null,
            is_new_entry: movement?.is_new_entry ?? false,
          };
        });

        setTracks(enriched);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar CASA Singles Chart:", err);

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

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-PT");

    const result = tracks.filter((track) =>
      `${track.rank} ${track.title} ${track.artist}`
        .toLocaleLowerCase("pt-PT")
        .includes(query)
    );

    return [...result].sort((a, b) => {
      if (sort === "artist") {
        return a.artist.localeCompare(b.artist, "pt");
      }

      if (sort === "title") {
        return a.title.localeCompare(b.title, "pt");
      }

      return a.rank - b.rank;
    });
  }, [tracks, search, sort]);

  const topTwenty = filteredTracks.filter((track) => track.rank <= 20);
  const remaining = filteredTracks.filter((track) => track.rank > 20);

  const chartDate = tracks[0]?.chart_date;
  const movementCounts = {
    new: tracks.filter((track) => track.movement === "new").length,
    up: tracks.filter((track) => track.movement === "up").length,
    down: tracks.filter((track) => track.movement === "down").length,
    stable: tracks.filter((track) => track.movement === "stable").length,
  };

  return (
    <main className="singles-page">
      <section className="singles-intro">
        <div className="singles-intro-top">
          <span>CASA ORIGINAL CHARTS</span>
          <span>01 / 05</span>
        </div>

        <div className="singles-intro-content">
          <div>
            <p className="singles-eyebrow">ANGOLA · MÚSICA · RANKING</p>
            <h1>
              CASA
              <br />
              TOP <span>200.</span>
            </h1>
            <p className="singles-description">
              As músicas que definem o momento da música angolana.
              Uma leitura independente dos charts e da sua evolução.
            </p>
          </div>

          <div className="singles-intro-stamp">
            <span>THE SOUND</span>
            <strong>OF</strong>
            <strong>ANGOLA</strong>
            <small>CASA · AO</small>
          </div>
        </div>

        <div className="singles-intro-bottom">
          <span>CHARTS SINGLES</span>
          <span>EDIÇÃO · {formatDate(chartDate)}</span>
        </div>
      </section>

      <section className="singles-stats">
  <div>
    <span>FAIXAS NO CHART</span>
    <strong>{tracks.length || "—"}</strong>
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

      <section className="singles-chart-section">
        <div className="singles-section-heading">
          <div>
            <span>01 / CLASSIFICAÇÃO NACIONAL</span>
            <h2>THE SINGLES CHART</h2>
          </div>
          <span className="singles-edition">
            ANGOLA
            <br />
            {formatDate(chartDate)}
          </span>
        </div>

        <div className="singles-controls">
          <div className="singles-tabs">
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
            <div className="singles-filters">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar música ou artista"
                aria-label="Pesquisar música ou artista"
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
        </div>

        {activeTab === "chart" ? (
          <>
            {loading && (
              <div className="singles-message">A CARREGAR O CHART...</div>
            )}

            {error && (
              <div className="singles-message singles-error">{error}</div>
            )}

            {!loading && !error && tracks.length === 0 && (
              <div className="singles-message">
                Ainda não existem dados disponíveis.
              </div>
            )}

            {!loading && !error && tracks.length > 0 && (
              <>
                <div className="singles-movement-summary">
                  <span>MOVIMENTOS DESTA EDIÇÃO</span>
                  <span>↑ {movementCounts.up} SUBIDAS</span>
                  <span>↓ {movementCounts.down} DESCIDAS</span>
                  <span>NEW {movementCounts.new} NOVAS</span>
                  <span>＝ {movementCounts.stable} ESTÁVEIS</span>
                </div>

                <div className="singles-top-heading">
                  <div>
                    <span>AS PRIMEIRAS VINTE</span>
                    <h3>TOP 20</h3>
                  </div>
                  <span>01 A 20</span>
                </div>

                <div className="singles-top-grid">
                  {topTwenty.map((track) => (
                    <article className="singles-feature-card" key={track.rank}>
                      <div className="singles-feature-top">
                        <span>{String(track.rank).padStart(2, "0")}</span>
                        <MovementTag track={track} />
                      </div>

                      <TrackArtwork track={track} />

                      <div className="singles-feature-info">
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="singles-list-heading">
                  <div>
                    <span>CONTINUAÇÃO DO RANKING</span>
                    <h3>POSIÇÕES 21 A 200</h3>
                  </div>
                  <span>{remaining.length} RESULTADOS</span>
                </div>

                <div className="singles-list">
                  {remaining.map((track) => (
                    <article className="singles-list-row" key={track.rank}>
                      <span className="singles-list-rank">
                        {String(track.rank).padStart(3, "0")}
                      </span>

                      <TrackArtwork track={track} />

                      <div className="singles-list-info">
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                      </div>

                      <MovementTag track={track} />
                    </article>
                  ))}
                </div>

                {filteredTracks.length === 0 && (
                  <div className="singles-message">
                    Não encontrámos resultados para “{search}”.
                  </div>
                )}

                <div className="singles-list-footer">
                  A MOSTRAR {filteredTracks.length} DE {tracks.length} FAIXAS
                  <span>FONTE: {tracks[0]?.source_name || "CASA"}</span>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="singles-methodology">
            <span>CASA / METODOLOGIA</span>
            <h3>UM RETRATO DA MÚSICA EM ANGOLA.</h3>
            <p>
              O CASA Top 200 Singles acompanha as posições das músicas
              no chart Apple Music Angola. A classificação apresentada
              reflecte a fonte e a data de recolha indicadas nesta página.
            </p>
            <p>
              Os dados de histórico e movimentação são associados às
              posições do chart sempre que existe registo correspondente.
              A ausência de um indicador não significa necessariamente
              que uma faixa não tenha mudado de posição.
            </p>
            <p>
              A CASA é uma plataforma independente e não é afiliada,
              patrocinada ou operada pela Apple Music ou pela Kworb.
            </p>
          </div>
        )}
      </section>

      <footer className="singles-footer">
        <Link href="/">CASA<sup>®</sup></Link>
        <span>CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS</span>
        <span>ANGOLA · © 2026</span>
      </footer>
    </main>
  );
}
