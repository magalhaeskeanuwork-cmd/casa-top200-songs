
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Classification = "Mainstream" | "Nova Escola" | "Velha Escola";
type ActTypeFilter = "all" | "solo" | "group";
type SortOption = "listeners" | "chart" | "best";

type Artist = {
  artist_id: string;
  artist_rank: number;
  artist_name: string;
  act_type: string | null;
  origin_country: string | null;
  profile_image_url: string | null;
  genres: string[] | null;
  total_chart_entries: number;
  top_10_entries: number;
  top_20_entries: number;
  best_rank: number | null;
  current_chart_entries: number;
  current_best_rank: number | null;
  last_chart_date: string | null;
  spotify_monthly_listeners: number | null;
  spotify_listeners_observed_at: string | null;
  spotify_listeners_source: string | null;
  spotify_artist_id: string | null;
  deezer_profile_url: string | null;
  bio: string | null;
  deezer_match_status: string | null;
  artist_generations: string[];
};

type RankingRow = Omit<Artist, "artist_generations"> & {
  image_url: string | null;
  manual_image_url: string | null;
};

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "INDISPONÍVEL";
  return new Intl.NumberFormat("pt-PT").format(value);
};

function normalizeArtistName(name: string | null | undefined) {
  return (name ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function ArtistImage({ artist }: { artist: Artist }) {
  const [failed, setFailed] = useState(false);

  const initials = artist.artist_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="artist-image">
      {artist.profile_image_url && !failed ? (
        <img
          src={artist.profile_image_url}
          alt={`Fotografia de ${artist.artist_name}`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{initials || "C"}</span>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="artist-stat-card">
      <span>{label}</span>
      <strong style={{ color: accent }}>{value}</strong>
    </div>
  );
}

function FeaturedArtistCard({
  artist,
  position,
}: {
  artist: Artist;
  position: number;
}) {
  return (
    <article className="artist-feature-card">
      <div className="artist-feature-image">
        <ArtistImage artist={artist} />

        <span className="artist-feature-rank">
          #{String(position).padStart(2, "0")}
        </span>

        {artist.spotify_artist_id && (
          <a
            href={`https://open.spotify.com/artist/${artist.spotify_artist_id}`}
            target="_blank"
            rel="noreferrer"
            className="artist-spotify-link"
          >
            OUVIR NO SPOTIFY ↗
          </a>
        )}
      </div>

      <div className="artist-feature-content">
        <div className="artist-feature-heading">
          <div>
            <span className="artist-kicker">
              ARTISTA ANGOLANO · TOP 10
            </span>

            <h3>{artist.artist_name}</h3>

            <span className="artist-genres">
              {artist.genres?.slice(0, 3).join(" · ") ||
                "MÚSICA ANGOLANA"}
            </span>
          </div>

          <span className="artist-index">
            {String(position).padStart(2, "0")}
          </span>
        </div>

        <p className="artist-bio">
          {artist.bio?.trim()
            ? artist.bio
            : "Biografia ainda não disponível. Estamos a enriquecer o arquivo de artistas da música angolana."}
        </p>

        <div className="artist-feature-stats">
          <div className="artist-listeners">
            <span>OUVINTES MENSAIS</span>
            <strong>
              {formatNumber(artist.spotify_monthly_listeners)}
            </strong>
            <small>SPOTIFY</small>
          </div>

          <div>
            <span>ENTRADAS NOS CHARTS</span>
            <strong>{formatNumber(artist.total_chart_entries)}</strong>
            <small>REGISTOS HISTÓRICOS</small>
          </div>

          <div>
            <span>MELHOR POSIÇÃO</span>
            <strong>
              {artist.best_rank !== null
                ? `#${artist.best_rank}`
                : "—"}
            </strong>
            <small>RESULTADO HISTÓRICO</small>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [activeTab, setActiveTab] =
    useState<Classification>("Mainstream");
  const [search, setSearch] = useState("");
  const [actTypeFilter, setActTypeFilter] =
    useState<ActTypeFilter>("all");
  const [sort, setSort] = useState<SortOption>("listeners");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: Classification[] = [
    "Mainstream",
    "Nova Escola",
    "Velha Escola",
  ];

  const tabDescriptions: Record<Classification, string> = {
    Mainstream: "O panorama completo da música angolana.",
    "Nova Escola": "Os artistas da nova geração.",
    "Velha Escola": "Os nomes que marcaram gerações.",
  };

  useEffect(() => {
    let cancelled = false;

    async function loadArtists() {
      if (!supabase) {
        setError("Configuração do Supabase não encontrada.");
        setLoading(false);
        return;
      }

      try {
        const [
          { data: rankingData, error: rankingError },
          { data: classificationData, error: classificationError },
        ] = await Promise.all([
          supabase
            .from("casa_artist_rankings")
            .select("*")
            .order("spotify_monthly_listeners", {
              ascending: false,
              nullsFirst: false,
            }),

          supabase
            .from("artists")
            .select("id, canonical_name, artist_generations"),
        ]);

        if (cancelled) return;

        if (rankingError) {
          console.error("CASA artist rankings error:", rankingError);
          setError(
            `Não foi possível carregar o ranking: ${rankingError.message}`
          );
          setLoading(false);
          return;
        }

        if (classificationError) {
          console.error(
            "CASA artist classifications error:",
            classificationError
          );
          setError(
            `Não foi possível carregar as classificações: ${classificationError.message}`
          );
          setLoading(false);
          return;
        }

        const classificationsById = new Map<string, string[]>();
        const classificationsByName = new Map<string, string[]>();

        for (const artist of classificationData ?? []) {
          const generations = artist.artist_generations ?? [];

          classificationsById.set(artist.id, generations);

          classificationsByName.set(
            normalizeArtistName(artist.canonical_name),
            generations
          );
        }

        const rankingRows = (rankingData ?? []) as RankingRow[];

        const combinedArtists: Artist[] = rankingRows.map((artist) => {
          const generations =
            classificationsById.get(artist.artist_id) ??
            classificationsByName.get(
              normalizeArtistName(artist.artist_name)
            ) ??
            [];

          return {
            ...artist,
            profile_image_url:
              artist.profile_image_url ??
              artist.image_url ??
              artist.manual_image_url ??
              null,
            artist_generations: generations,
            total_chart_entries: artist.total_chart_entries ?? 0,
            top_10_entries: artist.top_10_entries ?? 0,
            top_20_entries: artist.top_20_entries ?? 0,
            current_chart_entries: artist.current_chart_entries ?? 0,
          };
        });

        setArtists(combinedArtists);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar artistas:", err);

        if (!cancelled) {
          setError("Não foi possível carregar os artistas. Tenta novamente.");
          setLoading(false);
        }
      }
    }

    loadArtists();

    return () => {
      cancelled = true;
    };
  }, []);

  const classifiedArtists = useMemo(() => {
    const query = normalizeArtistName(search);

    return artists
      .filter((artist) =>
        artist.artist_generations.includes(activeTab)
      )
      .filter((artist) => {
        if (actTypeFilter === "all") return true;
        return artist.act_type === actTypeFilter;
      })
      .filter((artist) =>
        normalizeArtistName(artist.artist_name).includes(query)
      )
      .sort((a, b) => {
        if (sort === "chart") {
          return (
            (b.total_chart_entries ?? 0) -
            (a.total_chart_entries ?? 0)
          );
        }

        if (sort === "best") {
          return (a.best_rank ?? 999) - (b.best_rank ?? 999);
        }

        return (
          (b.spotify_monthly_listeners ?? -1) -
          (a.spotify_monthly_listeners ?? -1)
        );
      });
  }, [artists, activeTab, actTypeFilter, search, sort]);

  const featuredArtists = classifiedArtists.slice(0, 10);
  const remainingArtists = classifiedArtists.slice(10);

  const artistsWithEntries = classifiedArtists.filter(
    (artist) => artist.total_chart_entries > 0
  ).length;

  const totalEntries = classifiedArtists.reduce(
    (total, artist) =>
      total + (artist.total_chart_entries ?? 0),
    0
  );

  const artistsWithListeners = classifiedArtists.filter(
    (artist) => artist.spotify_monthly_listeners !== null
  ).length;

  const totalListeners = classifiedArtists.reduce(
    (total, artist) =>
      total + (artist.spotify_monthly_listeners ?? 0),
    0
  );

  const latestMetricDate = classifiedArtists
    .map((artist) => artist.spotify_listeners_observed_at)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);

  const formattedMetricDate = latestMetricDate
    ? new Date(latestMetricDate).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "SEM REGISTOS";

  return (
    <main className="artists-page">
      <section className="artists-intro">
        <div className="artists-intro-top">
          <span>CASA ORIGINAL INDEX</span>
          <span>03 / 05</span>
        </div>

        <div className="artists-intro-content">
          <div>
            <p className="artists-eyebrow">
              MÚSICA ANGOLANA · ARTISTAS
            </p>

            <h1>
              QUEM MOVE
              <br />
              A MÚSICA
              <br />
              <span>ANGOLANA?</span>
            </h1>
          </div>

          <p className="artists-intro-description">
            Um retrato dos artistas angolanos através da sua
            audiência no Spotify e da sua presença nos charts
            da CASA.
          </p>
        </div>

        <div className="artists-intro-bottom">
          <span>CASA ARTIST RANKING</span>
          <span>
            OUVINTES SPOTIFY · DADOS DE{" "}
            {formattedMetricDate.toUpperCase()}
          </span>
        </div>
      </section>

      <section className="artists-overview">
        <StatCard
          label="ARTISTAS NA CLASSIFICAÇÃO"
          value={String(classifiedArtists.length)}
          accent="var(--casa-foreground)"
        />

        <StatCard
          label="COM DADOS DE OUVINTES"
          value={String(artistsWithListeners)}
          accent="#24A99B"
        />

        <StatCard
          label="TOTAL DE OUVINTES MENSAIS"
          value={formatNumber(totalListeners)}
          accent="#8A5BE2"
        />

        <StatCard
          label="ENTRADAS NOS CHARTS"
          value={formatNumber(totalEntries)}
          accent="#F184D2"
        />
      </section>

      <section id="ranking" className="artists-ranking">
        <div className="artists-ranking-heading">
          <div>
            <span className="artists-eyebrow">
              CLASSIFICAÇÃO NACIONAL
            </span>
            <h2>ARTISTAS</h2>
          </div>

          <div className="artists-metric-date">
            MÉTRICA PRINCIPAL: OUVINTES MENSAIS
            <br />
            FONTE: SPOTIFY
            <br />
            DADOS DE {formattedMetricDate.toUpperCase()}
          </div>
        </div>

        <div className="artists-tabs" role="tablist">
          {tabs.map((tab) => {
            const count = artists.filter((artist) =>
              artist.artist_generations.includes(tab)
            ).length;

            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={
                  activeTab === tab
                    ? "artists-tab artists-tab-active"
                    : "artists-tab"
                }
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="artists-category-description">
          <strong>{activeTab.toUpperCase()}</strong>
          <span>{tabDescriptions[activeTab]}</span>
        </div>

        <div className="artists-controls">
          <label className="artists-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar artista"
              aria-label="Pesquisar artista"
            />
          </label>

          <div
            className="artists-type-filter"
            role="group"
            aria-label="Filtrar por tipo de artista"
          >
            {(["all", "solo", "group"] as ActTypeFilter[]).map((type) => (
              <button
                key={type}
                type="button"
                className={
                  actTypeFilter === type
                    ? "artists-type-button artists-type-button-active"
                    : "artists-type-button"
                }
                aria-pressed={actTypeFilter === type}
                onClick={() => setActTypeFilter(type)}
              >
                {type === "all"
                  ? "TODOS"
                  : type === "solo"
                    ? "SOLO"
                    : "GRUPO"}
              </button>
            ))}
          </div>

          <label className="artists-sort">
            ORDENAR POR
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortOption)
              }
            >
              <option value="listeners">Ouvintes mensais</option>
              <option value="chart">Entradas nos charts</option>
              <option value="best">Melhor posição</option>
            </select>
          </label>
        </div>

        {loading && (
          <div className="artists-message">
            A CARREGAR ARTISTAS...
          </div>
        )}

        {error && (
          <div className="artists-message artists-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {featuredArtists.length > 0 && (
              <section className="artists-top-ten">
                <div className="artists-section-label">
                  <span>
                    01 / {String(featuredArtists.length).padStart(2, "0")}
                  </span>
                  <strong>OS DEZ QUE LIDERAM</strong>
                  <span>
                    {sort === "listeners"
                      ? "OUVINTES MENSAIS"
                      : sort === "chart"
                        ? "ENTRADAS NOS CHARTS"
                        : "MELHOR POSIÇÃO"}
                  </span>
                </div>

                <div className="artists-feature-grid">
                  {featuredArtists.map((artist, index) => (
                    <FeaturedArtistCard
                      key={artist.artist_id}
                      artist={artist}
                      position={index + 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {remainingArtists.length > 0 && (
              <section className="artists-rest">
                <div className="artists-section-label">
                  <span>
                    11 / {String(classifiedArtists.length).padStart(2, "0")}
                  </span>
                  <strong>RESTANTES ARTISTAS</strong>
                  <span>RANKING CASA</span>
                </div>

                <div className="artists-list-header">
                  <span>POS.</span>
                  <span />
                  <span>ARTISTA</span>
                  <span>OUVINTES / MÊS</span>
                  <span>ENTRADAS</span>
                  <span>MELHOR POS.</span>
                </div>

                {remainingArtists.map((artist, index) => (
                  <article
                    key={artist.artist_id}
                    className="artists-row"
                  >
                    <strong className="artists-row-rank">
                      {String(index + 11).padStart(2, "0")}
                    </strong>

                    <div className="artists-row-image">
                      <ArtistImage artist={artist} />
                    </div>

                    <div className="artists-row-name">
                      <strong>{artist.artist_name}</strong>
                      <span>
                        {artist.genres?.slice(0, 2).join(" · ") ||
                          "ARTISTA ANGOLANO"}
                      </span>
                    </div>

                    <div className="artists-row-stat artists-row-listeners">
                      <strong>
                        {formatNumber(artist.spotify_monthly_listeners)}
                      </strong>
                      <span>SPOTIFY</span>
                    </div>

                    <div className="artists-row-stat">
                      <strong>
                        {formatNumber(artist.total_chart_entries)}
                      </strong>
                      <span>
                        TOP 10: {formatNumber(artist.top_10_entries)}
                      </span>
                    </div>

                    <div className="artists-row-stat">
                      <strong>
                        {artist.best_rank !== null
                          ? `#${artist.best_rank}`
                          : "—"}
                      </strong>
                      <span>RESULTADO HISTÓRICO</span>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {classifiedArtists.length === 0 && (
              <div className="artists-message">
                Não encontrámos artistas com estes filtros.
              </div>
            )}
          </>
        )}

        <div className="artists-ranking-footer">
          <span>
            {classifiedArtists.length} ARTISTAS APRESENTADOS
          </span>
          <span>
            {artistsWithListeners} COM DADOS DE OUVINTES SPOTIFY
          </span>
          <span>{artistsWithEntries} COM ENTRADAS NOS CHARTS</span>
        </div>
      </section>

      <section className="artists-footer-banner">
        <strong>
          CASA<sup>®</sup>
        </strong>

        <div>
          A MÚSICA ANGOLANA
          <br />
          TEM CASA.
        </div>

        <span>
          CHARTS · CULTURA · DADOS
          <br />
          LUANDA, ANGOLA
          <br />
          © 2026 CASA
        </span>
      </section>

      <footer className="artists-bottom-footer">
        <span>
          CASA · CLASSIFICAÇÃO ANGOLANA DE SONS E AUDIÊNCIAS
        </span>
        <span>INDEPENDENTE POR NATUREZA.</span>
      </footer>

      <style jsx global>{`
        .artists-page {
          --ink: var(--casa-foreground);
          --paper: var(--casa-background);
          --muted: var(--casa-muted);
          --line: var(--casa-border);
          --yellow: #F5D900;
          --teal: #24A99B;
          --pink: #F184D2;
          --purple: #8A5BE2;

          width: min(1440px, 100%);
          margin: 0 auto;
          padding: 0 30px;
          color: var(--ink);
          background: var(--paper);
          font-family: inherit;
          transition: color 180ms ease, background 180ms ease;
        }

        .artists-page *,
        .artists-page *::before,
        .artists-page *::after {
          box-sizing: border-box;
        }

        .artists-page a {
          color: inherit;
          text-decoration: none;
        }

        .artists-page button,
        .artists-page input,
        .artists-page select {
          font-family: inherit;
        }

        .artists-intro {
          margin-top: 25px;
          padding: 20px 25px;
          color: #090909;
          background: var(--pink);
          border-radius: 5px;
        }

        .artists-intro-top,
        .artists-intro-bottom {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
        }

        .artists-intro-content {
          display: grid;
          grid-template-columns: 1.4fr 0.6fr;
          gap: 30px;
          align-items: end;
          padding: 45px 0;
        }

        .artists-eyebrow {
          font-family: monospace;
          font-size: 11px;
          letter-spacing: 0.07em;
        }

        .artists-intro h1 {
          margin: 22px 0 0;
          font-size: clamp(53px, 8vw, 108px);
          line-height: 0.83;
          letter-spacing: -0.09em;
          font-weight: 950;
        }

        .artists-intro h1 span {
          color: #F2F0E9;
        }

        .artists-intro-description {
          max-width: 380px;
          margin: 0 0 5px auto;
          font-size: 16px;
          line-height: 1.55;
        }

        .artists-intro-bottom {
          padding-top: 18px;
          border-top: 1px solid rgba(9, 9, 9, 0.3);
        }

        .artists-overview {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
          margin: 0 0 65px;
          border-bottom: 1px solid var(--line);
        }

        .artist-stat-card {
          min-width: 0;
          min-height: 115px;
          padding: 20px 17px;
          border-right: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 15px;
        }

        .artist-stat-card:first-child {
          padding-left: 0;
        }

        .artist-stat-card:last-child {
          border-right: 0;
        }

        .artist-stat-card span {
          font-family: monospace;
          font-size: 10px;
          color: var(--muted);
        }

        .artist-stat-card strong {
          font-size: clamp(25px, 3vw, 42px);
          letter-spacing: -0.07em;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .artists-ranking-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
          border-bottom: 2px solid var(--ink);
          padding-bottom: 18px;
          margin-bottom: 20px;
        }

        .artists-ranking-heading h2 {
          margin: 9px 0 0;
          font-size: clamp(40px, 6vw, 76px);
          line-height: 0.9;
          letter-spacing: -0.08em;
          font-weight: 850;
        }

        .artists-metric-date {
          font-family: monospace;
          font-size: 10px;
          line-height: 1.6;
          text-align: right;
          color: var(--muted);
        }

        .artists-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 25px;
        }

        .artists-tab {
          min-height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 14px 16px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          font-family: monospace;
          font-size: 10px;
          text-align: left;
          transition: background 160ms ease, color 160ms ease;
        }

        .artists-tab span {
          opacity: 0.6;
        }

        .artists-tab-active {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }

        .artists-category-description {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px 0;
          border-bottom: 1px solid var(--line);
          font-family: monospace;
          font-size: 10px;
        }

        .artists-category-description strong {
          color: var(--purple);
        }

        .artists-category-description span {
          color: var(--muted);
        }

        .artists-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin: 22px 0 35px;
        }

        .artists-search {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid var(--ink);
          padding: 10px 0;
          flex: 1 1 220px;
          max-width: 340px;
        }

        .artists-search span {
          font-size: 20px;
        }

        .artists-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 13px;
          color: var(--ink);
        }

        .artists-search input::placeholder {
          color: var(--muted);
        }

        .artists-type-filter {
          display: flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--line);
        }

        .artists-type-button {
          border: 0;
          padding: 9px 12px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-family: monospace;
          font-size: 10px;
        }

        .artists-type-button-active {
          background: var(--teal);
          color: #090909;
        }

        .artists-sort {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: monospace;
          font-size: 10px;
        }

        .artists-sort select {
          min-width: 0;
          border: 1px solid var(--line);
          background: var(--paper);
          color: var(--ink);
          font-family: inherit;
          font-size: 12px;
          padding: 9px;
        }

        .artists-sort select option {
          background: var(--paper);
          color: var(--ink);
        }

        .artists-section-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-top: 1px solid var(--line);
          font-family: monospace;
          font-size: 10px;
          margin-bottom: 15px;
        }

        .artists-section-label span {
          color: var(--muted);
        }

        .artists-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .artist-feature-card {
          min-width: 0;
          background: var(--paper);
          border: 1px solid var(--line);
          padding: 9px;
          display: grid;
          grid-template-columns: minmax(125px, 0.78fr) minmax(0, 1.22fr);
          gap: 16px;
          overflow: hidden;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .artist-feature-card:hover {
          transform: translateY(-3px);
        }

        .artist-feature-image {
          position: relative;
          min-height: 245px;
          overflow: hidden;
          background: var(--purple);
        }

        .artist-image {
          width: 100%;
          height: 100%;
          min-height: 0;
          background: var(--purple);
          color: white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .artist-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }

        .artist-image span {
          font-size: clamp(34px, 5vw, 65px);
          font-weight: 950;
          letter-spacing: -0.08em;
        }

        .artist-feature-rank {
          position: absolute;
          top: 10px;
          left: 10px;
          background: var(--yellow);
          color: #090909;
          padding: 7px 11px;
          font-family: monospace;
          font-size: 10px;
        }

        .artist-spotify-link {
          position: absolute;
          bottom: 10px;
          left: 10px;
          right: 10px;
          text-align: center;
          padding: 9px 5px;
          background: #090909;
          color: white !important;
          font-family: monospace;
          font-size: 9px;
        }

        .artist-feature-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 7px 7px 0;
        }

        .artist-feature-heading {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .artist-kicker {
          display: block;
          font-family: monospace;
          font-size: 9px;
          color: var(--teal);
          margin-bottom: 8px;
        }

        .artist-feature-heading h3 {
          margin: 0;
          font-size: clamp(22px, 2.6vw, 34px);
          line-height: 0.95;
          letter-spacing: -0.07em;
          overflow-wrap: anywhere;
          font-weight: 800;
        }

        .artist-genres {
          display: block;
          margin-top: 8px;
          font-family: monospace;
          font-size: 9px;
          line-height: 1.5;
          color: var(--muted);
        }

        .artist-index {
          color: var(--purple);
          font-family: monospace;
          font-size: 12px;
        }

        .artist-bio {
          font-size: 13px;
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .artist-feature-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          border-top: 1px solid var(--line);
          padding-top: 11px;
        }

        .artist-feature-stats > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .artist-feature-stats span,
        .artist-feature-stats small {
          font-family: monospace;
          font-size: 8px;
          color: var(--muted);
        }

        .artist-feature-stats strong {
          font-size: clamp(19px, 2.1vw, 27px);
          letter-spacing: -0.07em;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .artist-feature-stats .artist-listeners {
          grid-column: 1 / -1;
          background: var(--teal);
          color: #090909;
          padding: 10px;
          display: grid;
          grid-template-columns: 1fr auto;
        }

        .artist-listeners span,
        .artist-listeners small {
          color: #090909;
        }

        .artist-listeners strong {
          grid-column: 2;
          grid-row: 1 / 3;
          text-align: right;
        }

        .artists-rest {
          margin-top: 65px;
        }

        .artists-list-header,
        .artists-row {
          display: grid;
          grid-template-columns: 45px 58px minmax(140px, 1.5fr) repeat(3, minmax(100px, 1fr));
          gap: 12px;
          align-items: center;
        }

        .artists-list-header {
          padding: 12px 14px;
          background: var(--ink);
          color: var(--paper);
          font-family: monospace;
          font-size: 9px;
        }

        .artists-list-header span:nth-child(4) {
          text-align: right;
        }

        .artists-row {
          padding: 13px 14px;
          min-height: 88px;
          border-bottom: 1px solid var(--line);
          transition: background 150ms ease;
        }

        .artists-row:hover {
          background: rgba(245, 217, 0, 0.12);
        }

        .artists-row-rank {
          font-size: 19px;
          color: var(--purple);
        }

        .artists-row-image {
          width: 58px;
          height: 58px;
        }

        .artists-row-name {
          min-width: 0;
        }

        .artists-row-name strong {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .artists-row-name span,
        .artists-row-stat span {
          display: block;
          margin-top: 5px;
          font-family: monospace;
          font-size: 9px;
          color: var(--muted);
        }

        .artists-row-stat strong {
          font-family: inherit;
          font-size: 14px;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .artists-row-listeners {
          text-align: right;
        }

        .artists-message {
          padding: 40px 0;
          font-family: monospace;
          font-size: 11px;
          color: var(--muted);
        }

        .artists-error {
          color: #B3261E;
        }

        .artists-ranking-footer {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 17px 0;
          border-top: 1px solid var(--line);
          margin-top: 20px;
          font-family: monospace;
          font-size: 9px;
          color: var(--muted);
        }

        .artists-footer-banner {
          margin: 70px -30px 0;
          padding: 42px 30px;
          background: var(--ink);
          color: var(--paper);
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          align-items: end;
          gap: 20px;
        }

        .artists-footer-banner > strong {
          font-size: 52px;
          letter-spacing: -0.1em;
        }

        .artists-footer-banner sup {
          font-size: 12px;
        }

        .artists-footer-banner > div {
          font-size: clamp(25px, 4vw, 48px);
          line-height: 0.94;
          font-weight: 950;
          letter-spacing: -0.065em;
        }

        .artists-footer-banner > span {
          font-family: monospace;
          font-size: 9px;
          line-height: 1.9;
          text-align: right;
          opacity: 0.7;
        }

        .artists-bottom-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 0 22px;
          font-family: monospace;
          font-size: 9px;
          color: var(--muted);
        }

        @media (max-width: 1000px) {
          .artists-feature-grid {
            grid-template-columns: 1fr;
          }

          .artists-overview {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .artist-stat-card:nth-child(2) {
            border-right: 0;
          }

          .artist-stat-card:nth-child(3),
          .artist-stat-card:nth-child(4) {
            border-top: 1px solid var(--line);
          }

          .artists-list-header,
          .artists-row {
            grid-template-columns: 38px 50px minmax(110px, 1fr) repeat(3, minmax(85px, 1fr));
            gap: 8px;
          }
        }

        @media (max-width: 760px) {
          .artists-page {
            padding: 0 18px;
          }

          .artists-intro-content {
            grid-template-columns: 1fr;
            padding: 35px 0;
          }

          .artists-intro-description {
            margin: 0;
          }

          .artists-ranking-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .artists-metric-date {
            text-align: left;
          }

          .artists-list-header {
            display: none;
          }

          .artists-row {
            grid-template-columns: 32px 45px minmax(100px, 1fr) minmax(90px, auto);
            gap: 9px;
            padding: 11px 4px;
          }

          .artists-row-image {
            width: 45px;
            height: 45px;
          }

          .artists-row-stat:nth-of-type(5),
          .artists-row-stat:nth-of-type(6) {
            display: none;
          }

          .artists-row-listeners {
            text-align: right;
          }

          .artists-row-name strong {
            font-size: 13px;
          }

          .artists-footer-banner {
            margin-left: -18px;
            margin-right: -18px;
            padding: 35px 18px;
            grid-template-columns: 1fr 1fr;
          }

          .artists-footer-banner > div {
            grid-column: 1 / -1;
            grid-row: 2;
          }

          .artists-bottom-footer {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 560px) {
          .artists-page {
            padding: 0 13px;
          }

          .artists-intro {
            padding: 17px;
          }

          .artists-intro h1 {
            font-size: clamp(48px, 11vw, 75px);
          }

          .artists-intro-description {
            font-size: 14px;
          }

          .artists-intro-top,
          .artists-intro-bottom {
            font-size: 9px;
          }

          .artists-overview {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-bottom: 45px;
          }

          .artist-stat-card {
            min-height: 100px;
            padding: 13px 9px;
          }

          .artist-stat-card:first-child {
            padding-left: 0;
          }

          .artist-stat-card span {
            font-size: 8px;
          }

          .artist-stat-card strong {
            font-size: 25px;
          }

          .artists-tabs {
            gap: 5px;
          }

          .artists-tab {
            min-height: 52px;
            padding: 11px 8px;
            font-size: 8px;
          }

          .artists-category-description {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }

          .artists-controls {
            align-items: stretch;
          }

          .artists-search {
            max-width: none;
            flex-basis: 100%;
          }

          .artists-sort {
            justify-content: space-between;
            width: 100%;
          }

          .artists-sort select {
            max-width: 65%;
          }

          .artist-feature-card {
            grid-template-columns: 1fr;
          }

          .artist-feature-image {
            min-height: 230px;
            max-height: 270px;
          }

          .artist-feature-content {
            padding: 8px 7px;
          }

          .artist-feature-heading h3 {
            font-size: 30px;
          }

          .artist-bio {
            -webkit-line-clamp: 4;
          }

          .artists-section-label {
            gap: 8px;
            font-size: 8px;
          }

          .artists-section-label span {
            font-size: 8px;
          }

          .artists-row {
            grid-template-columns: 27px 40px minmax(80px, 1fr) minmax(75px, auto);
            gap: 7px;
          }

          .artists-row-image {
            width: 40px;
            height: 40px;
          }

          .artists-row-listeners strong {
            font-size: 11px;
          }

          .artists-row-name strong {
            font-size: 12px;
          }

          .artists-row-name span {
            font-size: 8px;
          }

          .artists-ranking-footer {
            flex-direction: column;
          }

          .artists-footer-banner {
            margin-left: -13px;
            margin-right: -13px;
            padding: 30px 13px;
          }

          .artists-bottom-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
