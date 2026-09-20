/**
 * IPTV Worldwide Directory Service
 * Integrates open IPTV index (iptv-org & curated open global channels)
 * Providing search, category & country browsing across thousands of free-to-air broadcast streams.
 */

import { LiveTvChannel } from '../db/channelsDb';

interface IptvStream {
  channel: string | null;
  title?: string;
  url: string;
  quality?: string;
  labels?: string[];
}

interface IptvChannelMeta {
  id: string;
  name: string;
  country?: string;
  categories?: string[];
  logo?: string;
  languages?: string[];
  website?: string;
}

// Built-in curated high-speed channels across categories & countries
const CURATED_IPTV_CHANNELS: LiveTvChannel[] = [
  // --- SPORTS & RACING ---
  {
    id: "iptv-mtrspt-1",
    name: "MTRSPT 1 Live Racing",
    category: "Sports",
    country: "United States",
    language: "English",
    logo: "/covers/dd-sports.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg02873-kravemedia-mtrspt1-samsungau-2anp4.amagi.tv/playlist/amg02873-kravemedia-mtrspt1-samsungau/playlist.m3u8"),
    playerType: "hls",
    description: "24/7 World motorsport racing network covering supercars, GT endurance championships, rally stages, and paddock analysis.",
    quality: "1080p HD",
    isLive: true,
    badge: "🏎️ RACING TV",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-world-poker-tour",
    name: "World Poker Tour Live",
    category: "Sports",
    country: "United States",
    language: "English",
    logo: "/covers/dd-sports.svg",
    streamUrl: "https://www.youtube.com/embed/5qap5aO4i9A",
    embedUrl: "https://www.youtube.com/embed/5qap5aO4i9A",
    playerType: "embed",
    description: "World Poker Tour continuous 24/7 championship tournaments, final tables, high-stakes cash games, and legendary hands.",
    quality: "1080p HD",
    isLive: true,
    badge: "♠️ WPT LIVE",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-combat-tv",
    name: "Combat Sports TV 24/7",
    category: "Sports",
    country: "International",
    language: "English",
    logo: "/covers/dd-sports.svg",
    streamUrl: "https://www.youtube.com/embed/9Auq9mYxFEE",
    embedUrl: "https://www.youtube.com/embed/9Auq9mYxFEE",
    playerType: "embed",
    description: "24/7 live combat sports coverage featuring championship kickboxing, Muay Thai, MMA bouts, and martial arts showcases.",
    quality: "1080p HD",
    isLive: true,
    badge: "🥊 COMBAT TV",
    sourceType: "youtube_live",
  },

  // --- MOVIES & ENTERTAINMENT ---
  {
    id: "iptv-action-hollywood",
    name: "Action Hollywood Movies 24/7",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8"),
    playerType: "hls",
    description: "Non-stop action, thriller, martial arts, and blockbuster adventure cinema playout.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 ACTION TV",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-scifi-central",
    name: "Sci-Fi Central TV",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg00145-amg00145c11-samsung-au-6579.playouts.now.amagi.tv/playlist.m3u8"),
    playerType: "hls",
    description: "Classic science fiction feature films, alien encounters, space epics, and retro dystopian cinema.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🚀 SCI-FI",
    sourceType: "fast_tv",
  },

  // --- KIDS & ANIME ---
  {
    id: "iptv-retro-anime-tv",
    name: "Retro Anime 24/7 TV",
    category: "Kids & Animation",
    country: "Japan",
    language: "Japanese / English",
    logo: "/covers/motu-patlu.svg",
    streamUrl: "https://www.youtube.com/embed/n4XW_3UZ3KU",
    embedUrl: "https://www.youtube.com/embed/n4XW_3UZ3KU",
    playerType: "embed",
    description: "Classic 80s, 90s, and 2000s anime broadcast live stream featuring mecha, fantasy, shonen, and nostalgic anime episodes.",
    quality: "1080p HD",
    isLive: true,
    badge: "🎌 ANIME LIVE",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-classic-looney-tunes",
    name: "Looney Tunes & Friends 24/7",
    category: "Kids & Animation",
    country: "United States",
    language: "English",
    logo: "/covers/motu-patlu.svg",
    streamUrl: "https://www.youtube.com/embed/HqD23zN-0hI",
    embedUrl: "https://www.youtube.com/embed/HqD23zN-0hI",
    playerType: "embed",
    description: "Timeless theatrical cartoon animation featuring Bugs Bunny, Daffy Duck, Road Runner, and vintage golden era toons.",
    quality: "1080p HD",
    isLive: true,
    badge: "🐰 CLASSIC TOONS",
    sourceType: "youtube_live",
  },

  // --- NATURE & EARTH & WEBCAMS ---
  {
    id: "iptv-bondi-vet",
    name: "Bondi Vet 24/7 Animals",
    category: "Wildlife & Documentary",
    country: "Australia",
    language: "English",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://wtfn-bondivet-1-au.samsung.wurl.tv/playlist.m3u8"),
    playerType: "hls",
    description: "Heartwarming animal rescues, emergency veterinary care, and extraordinary wildlife encounters across Australia.",
    quality: "1080p HD",
    isLive: true,
    badge: "🐾 BONDI VET",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-monterey-kelp",
    name: "Monterey Bay Kelp Forest Cam",
    category: "Wildlife & Documentary",
    country: "United States",
    language: "Natural Sounds",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    embedUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    playerType: "embed",
    description: "Live underwater camera inside Monterey Bay Aquarium’s kelp forest habitat with leopard sharks, sea otters, and rockfish.",
    quality: "1080p 60fps",
    isLive: true,
    badge: "🌊 OCEAN CAM",
    sourceType: "webcam",
  },
  {
    id: "iptv-aurora-borealis",
    name: "Aurora Borealis Northern Lights Live",
    category: "Earth & Webcams",
    country: "Canada / Arctic",
    language: "Ambient",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/cw7qL5Yd3oY",
    embedUrl: "https://www.youtube.com/embed/cw7qL5Yd3oY",
    playerType: "embed",
    description: "Live all-sky camera capturing real-time Aurora Borealis northern lights geomagnetic displays in high Arctic skies.",
    quality: "1080p HD",
    isLive: true,
    badge: "🌌 AURORA CAM",
    sourceType: "webcam",
  },
  {
    id: "iptv-venice-canal",
    name: "Venice Grand Canal Live EarthCam",
    category: "Earth & Webcams",
    country: "Italy",
    language: "Natural Sounds",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    embedUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    playerType: "embed",
    description: "Stunning 24/7 panoramic views of the Venice Grand Canal and Rialto Bridge in Italy with passing gondolas and vaporetto boats.",
    quality: "1080p HD",
    isLive: true,
    badge: "🛶 VENICE CAM",
    sourceType: "webcam",
  },
  {
    id: "iptv-tokyo-shibuya",
    name: "Tokyo Shibuya Crossing Live Cam",
    category: "Earth & Webcams",
    country: "Japan",
    language: "Natural Sounds",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/gFRtAAmiFbE",
    embedUrl: "https://www.youtube.com/embed/gFRtAAmiFbE",
    playerType: "embed",
    description: "Continuous 24/7 live view of Shibuya Scramble Crossing in Tokyo, Japan, the world's most iconic pedestrian intersection.",
    quality: "1080p HD",
    isLive: true,
    badge: "🗼 TOKYO CAM",
    sourceType: "webcam",
  },

  // --- SPACE & SCIENCE ---
  {
    id: "iptv-spacex-starship",
    name: "SpaceX Starbase & Launch Pad Cam",
    category: "Science & Space",
    country: "United States",
    language: "English",
    logo: "/covers/nasa.svg",
    streamUrl: "https://www.youtube.com/embed/e_Xw7mS0g98",
    embedUrl: "https://www.youtube.com/embed/e_Xw7mS0g98",
    playerType: "embed",
    description: "24/7 live tracking of Starbase Texas launch site, Starship rocket stacking, orbital pad construction, and countdown operations.",
    quality: "4K UHD",
    isLive: true,
    badge: "🚀 SPACEX LIVE",
    sourceType: "youtube_live",
  },

  // --- MUSIC & EDM & CHILL ---
  {
    id: "iptv-monstercat-tv",
    name: "Monstercat TV 24/7 EDM",
    category: "Music & Lofi",
    country: "Canada",
    language: "Electronic",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/7NOSDKb0HlU",
    embedUrl: "https://www.youtube.com/embed/7NOSDKb0HlU",
    playerType: "embed",
    description: "Non-stop electronic dance music broadcast featuring bass, house, synthwave, drum & bass, and festival anthems.",
    quality: "1080p HD",
    isLive: true,
    badge: "🎧 MONSTERCAT",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-synthwave-chill",
    name: "Synthwave / Cyberpunk Radio TV",
    category: "Music & Lofi",
    country: "International",
    language: "Synthwave",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/4xDzrJKXOOY",
    embedUrl: "https://www.youtube.com/embed/4xDzrJKXOOY",
    playerType: "embed",
    description: "Retro 80s cyberpunk synthwave, darksynth, outrun driving visuals, and nostalgic analog rhythms 24/7.",
    quality: "1080p HD",
    isLive: true,
    badge: "🌆 SYNTHWAVE",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-relaxing-jazz",
    name: "Café Jazz & Piano Live TV",
    category: "Music & Lofi",
    country: "International",
    language: "Jazz",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    embedUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    playerType: "embed",
    description: "Smooth background café jazz piano, acoustic upright bass, and vintage vinyl ambiance for work and reading.",
    quality: "1080p HD",
    isLive: true,
    badge: "☕ JAZZ TV",
    sourceType: "youtube_live",
  },

  // --- NEWS & INTERNATIONAL BROADCASTS ---
  {
    id: "iptv-leadstory-news",
    name: "Breaking News by LeadStory",
    category: "News",
    country: "Australia / Global",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg02703-leadstory-leadstory-samsungau-rr75f.amagi.tv/playlist/amg02703-leadstory-leadstory-samsungau/playlist.m3u8"),
    playerType: "hls",
    description: "Fast-breaking verified international news, live geopolitical reports, and global top stories.",
    quality: "1080p HD",
    isLive: true,
    badge: "📰 LEADSTORY",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-aljazeera-live",
    name: "Al Jazeera English Live HD",
    category: "News",
    country: "International",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/gCNeDWCI0vo",
    embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo",
    playerType: "embed",
    description: "Award-winning 24/7 global news channel bringing in-depth reporting from the Middle East, Africa, Asia, and the Americas.",
    quality: "1080p HD",
    isLive: true,
    badge: "📡 AL JAZEERA",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-nhk-world-live",
    name: "NHK World-Japan Live HD",
    category: "News",
    country: "Japan",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/f0lYkdA-Gtw",
    embedUrl: "https://www.youtube.com/embed/f0lYkdA-Gtw",
    playerType: "embed",
    description: "Japan’s international broadcaster providing hourly Asian news, Japanese culture documentaries, science, and technology.",
    quality: "1080p HD",
    isLive: true,
    badge: "🗾 NHK WORLD",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-dw-live-stream",
    name: "DW News Live International HD",
    category: "News",
    country: "Germany",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/lu_Z7BIshm8",
    embedUrl: "https://www.youtube.com/embed/lu_Z7BIshm8",
    playerType: "embed",
    description: "Deutsche Welle 24/7 global television news covering European affairs, international diplomacy, and investigative reports.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇩🇪 DW NEWS",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-euronews-world",
    name: "Euronews Live HD",
    category: "News",
    country: "France / Europe",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://euronews-euronews-world-1-au.samsung.wurl.tv/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/pykdXvg5w3o",
    playerType: "hls",
    description: "Pan-European 24/7 multilingual news television network covering European and global headlines.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇪🇺 EURONEWS",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-cna-asia",
    name: "CNA Live HD (Channel NewsAsia)",
    category: "News",
    country: "Singapore / Asia",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/XWq5kBlakcQ",
    embedUrl: "https://www.youtube.com/embed/XWq5kBlakcQ",
    playerType: "embed",
    description: "24/7 Asian news and current affairs television network based in Singapore.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇸🇬 CNA ASIA",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-rtve-24h",
    name: "RTVE 24 Horas HD",
    category: "News",
    country: "Spain",
    language: "Spanish",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main.m3u8"),
    embedUrl: "https://www.youtube.com/embed/S_8h1o5Zc14",
    playerType: "hls",
    description: "Continuous 24-hour news channel operated by Spain's national public broadcaster Televisión Española.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🇪🇸 RTVE 24H",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-rai-news",
    name: "Rai News 24 HD",
    category: "News",
    country: "Italy",
    language: "Italian",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://rainews1-live.akamaized.net/hls/live/590483/rainews1/rainews1/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/Fw91Uq6k5k4",
    playerType: "hls",
    description: "Italy's official state round-the-clock television news service broadcasting Italian and world news.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🇮🇹 RAI NEWS",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-tokyo-sky",
    name: "Tokyo Skytree 4K SkyCam Live",
    category: "Earth & Webcams",
    country: "Japan",
    language: "Natural Sounds",
    logo: "/covers/naturescape.svg",
    streamUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    embedUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    playerType: "embed",
    description: "24/7 ultra-high-definition panoramic sky view from Tokyo Skytree looking across the Tokyo metropolis.",
    quality: "4K UHD",
    isLive: true,
    badge: "🗼 TOKYO SKY",
    sourceType: "webcam",
  },
  {
    id: "iptv-swiss-alps-cam",
    name: "Swiss Alps & Matterhorn Cam",
    category: "Earth & Webcams",
    country: "Switzerland",
    language: "Ambient",
    logo: "/covers/naturescape.svg",
    streamUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    embedUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    playerType: "embed",
    description: "Live 360-degree high alpine panoramic cameras over Zermatt, Matterhorn, and glacier peaks.",
    quality: "1080p 60fps",
    isLive: true,
    badge: "🏔️ SWISS ALPS",
    sourceType: "webcam",
  },
  {
    id: "iptv-drivein-cinema",
    name: "Drive-In Movie Theater 24/7",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg00145-amg00145c11-samsung-au-6579.playouts.now.amagi.tv/playlist.m3u8"),
    playerType: "hls",
    description: "Nostalgic drive-in cinema experience featuring vintage intermission ads, creature features, and classic movies.",
    quality: "1080p HD",
    isLive: true,
    badge: "🍿 DRIVE-IN",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-kungfu-cinema",
    name: "Kung Fu & Martial Arts Cinema 24/7",
    category: "Free Movies",
    country: "Hong Kong / International",
    language: "English / Cantonese",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8"),
    playerType: "hls",
    description: "Shaw Brothers martial arts masterworks, legendary kung fu showdowns, and high-flying combat cinema.",
    quality: "1080p HD",
    isLive: true,
    badge: "🥋 KUNG FU TV",
    sourceType: "fast_tv",
  },
  {
    id: "iptv-sleep-lofi",
    name: "Nightly Lofi & Deep Sleep Ambient TV",
    category: "Music & Lofi",
    country: "International",
    language: "Ambient",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    embedUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    playerType: "embed",
    description: "Gentle rain sounds against city windows, warm analog synth loops designed for focus and sleep.",
    quality: "1080p HD",
    isLive: true,
    badge: "🌙 SLEEP TV",
    sourceType: "youtube_live",
  },
  {
    id: "iptv-symphony-hall",
    name: "Concert Hall & Symphony Live TV",
    category: "Music & Lofi",
    country: "Germany / Austria",
    language: "Classical Music",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    playerType: "embed",
    description: "Full symphonic orchestras performing timeless masterworks of Beethoven, Mozart, Bach, and Vivaldi.",
    quality: "1080p HD",
    isLive: true,
    badge: "🎻 SYMPHONY TV",
    sourceType: "youtube_live",
  }
];

export class IptvService {
  private memoryChannels: LiveTvChannel[] = [...CURATED_IPTV_CHANNELS];
  private isIndexLoaded = false;
  private isLoadingIndex = false;
  private cachedStreams: IptvStream[] = [];
  private cachedMeta: Map<string, IptvChannelMeta> = new Map();

  constructor() {
    // Initiate background warm-up
    this.warmUpIndex();
  }

  private async warmUpIndex(): Promise<void> {
    if (this.isLoadingIndex || this.isIndexLoaded) return;
    this.isLoadingIndex = true;

    try {
      // Fetch open iptv-org streams
      const streamsRes = await fetch('https://iptv-org.github.io/api/streams.json', {
        signal: AbortSignal.timeout(10000),
      });
      if (!streamsRes.ok) throw new Error(`IPTV streams HTTP ${streamsRes.status}`);
      const streams: IptvStream[] = await streamsRes.json();
      this.cachedStreams = streams;

      // Fetch metadata
      const metaRes = await fetch('https://iptv-org.github.io/api/channels.json', {
        signal: AbortSignal.timeout(10000),
      });
      if (metaRes.ok) {
        const metaList: IptvChannelMeta[] = await metaRes.json();
        for (const m of metaList) {
          this.cachedMeta.set(m.id, m);
        }
      }

      this.isIndexLoaded = true;
    } catch {
      // Fallback gracefully to curated built-in index
      this.isIndexLoaded = false;
    } finally {
      this.isLoadingIndex = false;
    }
  }

  public async searchIptv(options: {
    query?: string;
    category?: string;
    country?: string;
    limit?: number;
  }): Promise<{ channels: LiveTvChannel[]; total: number; source: string }> {
    const { query = '', category = 'All', country = 'All', limit = 40 } = options;
    const qLower = query.toLowerCase().trim();

    // 1. Filter curated channels first
    let matched: LiveTvChannel[] = this.memoryChannels.filter((ch) => {
      const matchCat = category === 'All' || ch.category.toLowerCase().includes(category.toLowerCase());
      const matchCountry = country === 'All' || ch.country.toLowerCase().includes(country.toLowerCase());
      const matchQ =
        !qLower ||
        ch.name.toLowerCase().includes(qLower) ||
        ch.description.toLowerCase().includes(qLower) ||
        ch.country.toLowerCase().includes(qLower) ||
        ch.category.toLowerCase().includes(qLower);
      return matchCat && matchCountry && matchQ;
    });

    // 2. If index is available and we need more, query the global stream pool
    if (this.cachedStreams.length > 0) {
      const extraList: LiveTvChannel[] = [];
      for (const s of this.cachedStreams) {
        if (!s.url || !s.url.startsWith('http')) continue;
        const title = s.title || (s.channel ? s.channel.replace(/\.[a-z]+$/i, '') : '');
        if (!title) continue;

        const meta = s.channel ? this.cachedMeta.get(s.channel) : null;
        const channelCountry = meta?.country ? this.formatCountry(meta.country) : 'International';
        const channelCat = meta?.categories?.[0] ? this.formatCategory(meta.categories[0]) : 'General TV';

        if (category !== 'All' && !channelCat.toLowerCase().includes(category.toLowerCase())) continue;
        if (country !== 'All' && !channelCountry.toLowerCase().includes(country.toLowerCase())) continue;

        if (qLower) {
          const haystack = `${title} ${channelCountry} ${channelCat}`.toLowerCase();
          if (!haystack.includes(qLower)) continue;
        }

        const cleanId = `iptv-ext-${(s.channel || title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        // Avoid duplicates
        if (matched.some((m) => m.id === cleanId) || extraList.some((e) => e.id === cleanId)) continue;

        const proxiedStream = `/api/videos/proxy?url=${encodeURIComponent(s.url)}`;

        extraList.push({
          id: cleanId,
          name: title,
          category: channelCat,
          country: channelCountry,
          language: meta?.languages?.[0] || 'International',
          logo: meta?.logo || '/covers/abc-news.svg',
          streamUrl: proxiedStream,
          playerType: 'hls',
          description: `Worldwide open broadcast feed from ${channelCountry} • ${channelCat}`,
          quality: s.quality || '1080p HD',
          isLive: true,
          badge: '🌐 IPTV GLOBAL',
          sourceType: 'iptv',
        });

        if (matched.length + extraList.length >= limit) break;
      }

      matched = [...matched, ...extraList];
    }

    return {
      channels: matched.slice(0, limit),
      total: matched.length,
      source: this.isIndexLoaded ? 'iptv_org_live_directory' : 'curated_worldwide_index',
    };
  }

  public getCategories(): string[] {
    return [
      'All',
      'Sports',
      'News',
      'Free Movies',
      'Kids & Animation',
      'Wildlife & Documentary',
      'Science & Space',
      'Earth & Webcams',
      'Music & Lofi',
      'Finance',
      'General TV',
    ];
  }

  public getCountries(): Array<{ code: string; name: string }> {
    return [
      { code: 'All', name: 'All Countries' },
      { code: 'United States', name: 'United States' },
      { code: 'India', name: 'India' },
      { code: 'United Kingdom', name: 'United Kingdom' },
      { code: 'Japan', name: 'Japan' },
      { code: 'Australia', name: 'Australia' },
      { code: 'Germany', name: 'Germany' },
      { code: 'France', name: 'France' },
      { code: 'Canada', name: 'Canada' },
      { code: 'Italy', name: 'Italy' },
      { code: 'International', name: 'International / Global' },
    ];
  }

  private formatCountry(code: string): string {
    const map: Record<string, string> = {
      US: 'United States',
      IN: 'India',
      UK: 'United Kingdom',
      GB: 'United Kingdom',
      JP: 'Japan',
      AU: 'Australia',
      DE: 'Germany',
      FR: 'France',
      CA: 'Canada',
      IT: 'Italy',
      BR: 'Brazil',
      ES: 'Spain',
    };
    return map[code.toUpperCase()] || code.toUpperCase();
  }

  private formatCategory(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('sport')) return 'Sports';
    if (c.includes('news')) return 'News';
    if (c.includes('movie') || c.includes('film')) return 'Free Movies';
    if (c.includes('kid') || c.includes('anim')) return 'Kids & Animation';
    if (c.includes('doc') || c.includes('nature') || c.includes('wild')) return 'Wildlife & Documentary';
    if (c.includes('sci') || c.includes('space') || c.includes('tech')) return 'Science & Space';
    if (c.includes('music')) return 'Music & Lofi';
    if (c.includes('business') || c.includes('finan')) return 'Finance';
    return 'General TV';
  }
}

export const iptvService = new IptvService();
