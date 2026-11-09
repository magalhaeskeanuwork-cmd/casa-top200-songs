
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 10;
const METRIC_NAME = "spotify_monthly_listeners";
const METRIC_SCOPE = "global";
const MARKET = "W";
const SOURCE_NAME = "checkleaked";

type Artist = {
  id: string;
  canonical_name: string;
  spotify_artist_id: string;
  act_type: string | null;
};

type SpotifyArtistResult = {
  id?: string;
  stats?: {
    monthlyListeners?: number;
  };
  overview?: {
    data?: {
      artist?: {
        stats?: {
          monthlyListeners?: number;
        };
      };
    };
  };
  data?: {
    artist?: {
      stats?: {
        monthlyListeners?: number;
      };
    };
  };
};

type BatchResponse = {
  results?: SpotifyArtistResult[];
  error?: string;
  message?: string;
};

function getEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost =
    process.env.RAPIDAPI_HOST || "spotify81.p.rapidapi.com";
  const cronSecret = process.env.CASA_CRON_SECRET;

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !rapidApiKey ||
    !rapidApiHost ||
    !cronSecret
  ) {
    throw new Error("Missing required environment variables.");
  }

  return {
    supabaseUrl,
    serviceRoleKey,
    rapidApiKey,
    rapidApiHost,
    cronSecret,
  };
}

function getMonthlyListeners(
  result: SpotifyArtistResult | null | undefined
): number | null {
  if (!result) return null;

  const candidates = [
    result.stats?.monthlyListeners,
    result.overview?.data?.artist?.stats?.monthlyListeners,
    result.data?.artist?.stats?.monthlyListeners,
  ];

  for (const value of candidates) {
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      return Math.round(value);
    }
  }

  return null;
}

async function fetchJson(
  url: URL,
  rapidApiKey: string,
  rapidApiHost: string
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": rapidApiKey,
        "x-rapidapi-host": rapidApiHost,
      },
      cache: "no-store",
    });

    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.text();

    if (
      (response.status === 429 || response.status === 503) &&
      attempt < 3
    ) {
      const retryAfter = Number(
        response.headers.get("Retry-After")
      );

      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : attempt * 2000;

      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(
      `RapidAPI returned ${response.status}: ${errorBody}`
    );
  }

  throw new Error("RapidAPI request failed after retries.");
}

async function fetchArtistBatch(
  spotifyArtistIds: string[],
  rapidApiKey: string,
  rapidApiHost: string
): Promise<SpotifyArtistResult[]> {
  const url = new URL(
    "https://spotify81.p.rapidapi.com/artist_overview_batch"
  );

  url.searchParams.set("ids", spotifyArtistIds.join(","));
  url.searchParams.set("slim", "1");

  const data = (await fetchJson(
    url,
    rapidApiKey,
    rapidApiHost
  )) as BatchResponse;

  if (!Array.isArray(data.results)) {
    throw new Error(
      data.message ||
        data.error ||
        "Unexpected batch response. Expected results array."
    );
  }

  return data.results;
}

async function fetchSingleArtist(
  spotifyArtistId: string,
  rapidApiKey: string,
  rapidApiHost: string
): Promise<SpotifyArtistResult> {
  const url = new URL(
    "https://spotify81.p.rapidapi.com/artist_overview"
  );

  url.searchParams.set("id", spotifyArtistId);
  url.searchParams.set("slim", "1");

  return (await fetchJson(
    url,
    rapidApiKey,
    rapidApiHost
  )) as SpotifyArtistResult;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CASA_CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const localHour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  if (localHour !== "06") {
    return NextResponse.json({ success: true, skipped: true, localHour });
  }

  const postRequest = new NextRequest(request.url, {
    method: "POST",
    headers: { "x-casa-cron-secret": cronSecret },
  });

  return POST(postRequest);
}

export async function POST(request: NextRequest) {
  try {
    const {
      supabaseUrl,
      serviceRoleKey,
      rapidApiKey,
      rapidApiHost,
      cronSecret,
    } = getEnvironment();

    const providedSecret = request.headers.get(
      "x-casa-cron-secret"
    );

    if (!providedSecret || providedSecret !== cronSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let artistId: string | null = null;

    try {
      const body = await request.json();

      artistId =
        typeof body.artistId === "string"
          ? body.artistId
          : null;
    } catch {
      // Empty body runs the full collection.
    }

    // Include all Angolan artists with a Spotify ID.
    // No generation classification is required.
    let artistsQuery = supabase
      .from("artists")
      .select(
        "id, canonical_name, spotify_artist_id, act_type"
      )
      .eq("is_angolan", true)
      .eq("artist_role", "artist")
      .in("act_type", ["solo", "group"])
      .not("spotify_artist_id", "is", null);

    if (artistId) {
      artistsQuery = artistsQuery.eq("id", artistId);
    }

    const { data: artists, error: artistsError } =
      await artistsQuery;

    if (artistsError) {
      throw new Error(
        `Supabase artist query failed: ${artistsError.message}`
      );
    }

    const eligibleArtists = (artists || []) as Artist[];

    if (eligibleArtists.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "No eligible Angolan artists with Spotify IDs found.",
        artistsEligible: 0,
        recordsSaved: 0,
      });
    }

    const observedAt = new Date().toISOString();
    const observedDate = observedAt.slice(0, 10);

    const batches: Artist[][] = [];

    for (
      let index = 0;
      index < eligibleArtists.length;
      index += BATCH_SIZE
    ) {
      batches.push(
        eligibleArtists.slice(index, index + BATCH_SIZE)
      );
    }

    let requestsMade = 0;
    let individualRequests = 0;
    let recordsSaved = 0;
    let failedBatches = 0;

    const failures: {
      artist: string;
      error: string;
    }[] = [];

    const snapshots: {
      artist_id: string;
      metric_name: string;
      metric_value: number;
      metric_scope: string;
      market: string;
      source_name: string;
      observed_date: string;
      observed_at: string;
      raw_payload: unknown;
    }[] = [];

    for (const batch of batches) {
      requestsMade++;

      const resultMap = new Map<
        string,
        SpotifyArtistResult
      >();

      try {
        const results = await fetchArtistBatch(
          batch.map((artist) => artist.spotify_artist_id),
          rapidApiKey,
          rapidApiHost
        );

        for (const result of results) {
          if (result.id) {
            resultMap.set(result.id, result);
          }
        }
      } catch (error) {
        failedBatches++;

        console.error("Spotify batch request failed:", error);
      }

      for (const artist of batch) {
        let spotifyResult = resultMap.get(
          artist.spotify_artist_id
        );

        let monthlyListeners =
          getMonthlyListeners(spotifyResult);

        // Use the individual endpoint if batch data is missing.
        if (monthlyListeners === null) {
          try {
            individualRequests++;

            spotifyResult = await fetchSingleArtist(
              artist.spotify_artist_id,
              rapidApiKey,
              rapidApiHost
            );

            monthlyListeners =
              getMonthlyListeners(spotifyResult);
          } catch (error) {
            failures.push({
              artist: artist.canonical_name,
              error:
                error instanceof Error
                  ? error.message
                  : "Individual API request failed.",
            });

            continue;
          }
        }

        if (monthlyListeners === null || !spotifyResult) {
          failures.push({
            artist: artist.canonical_name,
            error:
              "Monthly listeners not found in API response.",
          });

          continue;
        }

        snapshots.push({
          artist_id: artist.id,
          metric_name: METRIC_NAME,
          metric_value: monthlyListeners,
          metric_scope: METRIC_SCOPE,
          market: MARKET,
          source_name: SOURCE_NAME,
          observed_date: observedDate,
          observed_at: observedAt,
          raw_payload: spotifyResult,
        });
      }
    }

    if (snapshots.length > 0) {
      const { error: upsertError } = await supabase
        .from("artist_metric_snapshots")
        .upsert(snapshots, {
          onConflict:
            "artist_id,metric_name,metric_scope,market,source_name,observed_date",
        });

      if (upsertError) {
        throw new Error(
          `Snapshot upsert failed: ${upsertError.message}`
        );
      }

      recordsSaved = snapshots.length;
    }

    return NextResponse.json({
      success: failures.length === 0,
      observedDate,
      artistsEligible: eligibleArtists.length,
      soloArtists: eligibleArtists.filter(
        (artist) => artist.act_type === "solo"
      ).length,
      groups: eligibleArtists.filter(
        (artist) => artist.act_type === "group"
      ).length,
      requestsMade,
      individualRequests,
      recordsSaved,
      failedBatches,
      failedArtists: failures.length,
      failures,
    });
  } catch (error) {
    console.error(
      "CASA Spotify Monthly Listeners Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
