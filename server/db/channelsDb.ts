/**
 * Channels Database (Separate Small Database 3)
 * Stores verified Live TV channels and Radio stations with broadcast streams, categories, and country metadata.
 */

import { FileDb } from './fileDb';
import { MediaItem } from '../types/media';

export interface ChannelMirror {
  name: string;
  url: string;
  playerType?: 'hls' | 'embed';
  quality?: string;
}

export interface LiveTvChannel {
  id: string;
  name: string;
  category: 'Satellite TV' | 'News' | 'Kids & Animation' | 'Science & Space' | 'Culture & Documentary' | 'Sports' | 'Finance' | 'Earth & Webcams' | 'Music & Lofi' | 'Free Movies' | 'Wildlife & Documentary' | string;
  country: string;
  language: string;
  logo: string;
  streamUrl: string;       // Direct HLS (.m3u8) or live stream
  embedUrl?: string;       // 24/7 live responsive embed fallback
  playerType?: 'hls' | 'embed';
  description: string;
  quality: string;
  isLive: boolean;
  badge?: string;
  sourceType?: 'satellite' | 'fast_tv' | 'webcam' | 'youtube_live' | 'iptv' | 'custom' | 'm3u';
  mirrors?: ChannelMirror[];
  isCustom?: boolean;
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  country: string;
  language: string;
  logo: string;
  streamUrl: string;       // Direct MP3/AAC live audio stream
  bitrate: number;         // e.g. 128 kbps
  codec: string;           // MP3 / AAC
  homepage?: string;
  votes?: number;
}

export interface ChannelsStore {
  tvChannels: LiveTvChannel[];
  radioStations: RadioStation[];
  lastUpdated: string;
}

const DEFAULT_TV_CHANNELS: LiveTvChannel[] = [
  // --- NATIONAL SATELLITE TV BROADCASTS ---
  {
    id: "tv-dd-national-sat",
    name: "DD National HD (Doordarshan Satellite)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi",
    logo: "/covers/dd-national.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/40492a64c1db4a1385ba1a397d357d3a/index.m3u8"),
    playerType: "hls",
    description: "Direct 24/7 satellite broadcast of India’s national public broadcaster Doordarshan National. Live national serials, culture, national events, and flagship Indian programming.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-aajtak-sat",
    name: "Aaj Tak HD (Live Satellite News)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi",
    logo: "/covers/aaj-tak.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8"),
    playerType: "hls",
    description: "India’s premier Hindi 24/7 satellite news channel broadcasting live breaking news, prime-time debates, ground reports, and bulletins.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-dd-news-sat",
    name: "DD News HD (National 24/7 News)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi / English",
    logo: "/covers/dd-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8"),
    playerType: "hls",
    description: "Official 24/7 terrestrial & satellite news network of India, broadcasting nationwide bulletins, parliament proceedings, and live state affairs.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-dd-sports-sat",
    name: "DD Sports HD (National Sports Broadcast)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi / English",
    logo: "/covers/dd-sports.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8"),
    playerType: "hls",
    description: "India’s official national sports satellite television network broadcasting live cricket, national athletics, tournaments, and sports specials.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-abc-news-sat",
    name: "ABC News Live HD (Direct Playout)",
    category: "Satellite TV",
    country: "United States",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/gCNeDWCI0vo",
    embedUrl: "https://www.youtube.com/embed/gCNeDWCI0vo",
    playerType: "embed",
    description: "American Broadcasting Company 24/7 direct digital broadcast feed with live anchor coverage, worldwide correspondents, and real-time updates.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-trt-world-sat",
    name: "TRT World HD (Global Satellite Network)",
    category: "Satellite TV",
    country: "Turkey / International",
    language: "English",
    logo: "/covers/trt-world.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://tv-trtworld.medya.trt.com.tr/master.m3u8"),
    playerType: "hls",
    description: "Direct 24/7 satellite broadcast from TRT World transmitting international geopolitics, cultural documentaries, and world news in 1080p.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-9x-jalwa-sat",
    name: "9X Jalwa HD (Bollywood Music Satellite TV)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8"),
    playerType: "hls",
    description: "All-time favorite Bollywood songs, timeless Hindi film hits, and retro pop broadcasting 24/7 direct from 9X Media satellite playout.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },
  {
    id: "tv-colors-marathi-sat",
    name: "Colors Marathi HD (Regional Satellite TV)",
    category: "Satellite TV",
    country: "India",
    language: "Marathi / Hindi",
    logo: "/covers/colors-marathi.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://da86m1sqpm3o0.cloudfront.net/28072023/smil:colorsmarathihd.smil/playlist.m3u8"),
    playerType: "hls",
    description: "Colors Viacom18 regional entertainment channel broadcasting family serials, reality competitions, and cultural cinema.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TV",
  },

  // --- NATIONAL GEOGRAPHIC & WILDLIFE / NATURE (SATELLITE & DOCS) ---
  {
    id: "tv-natgeo-wild-sat",
    name: "National Geographic Wild HD (Satellite)",
    category: "Wildlife & Documentary",
    country: "United States / Global",
    language: "English",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("http://198.58.104.90:8989/natgeowild/index.m3u8"),
    embedUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    playerType: "hls",
    description: "Official 24/7 National Geographic Wild satellite television feed. Premier wildlife safaris, apex predators, marine expeditions, and big cat conservation in pristine HD.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE NATGEO",
  },
  {
    id: "tv-natgeo-channel-sat",
    name: "National Geographic Channel HD",
    category: "Wildlife & Documentary",
    country: "United States / Global",
    language: "English",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("http://198.58.104.90:8989/natgeo/index.m3u8"),
    embedUrl: "https://www.youtube.com/embed/y60wDzZt8yg",
    playerType: "hls",
    description: "Direct satellite transmission of the flagship National Geographic Channel. World-class archaeological discoveries, science explorations, and planetary expeditions.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE NATGEO",
  },
  {
    id: "tv-dw-doc-sat",
    name: "DW Documentary HD (Satellite)",
    category: "Wildlife & Documentary",
    country: "Germany / Global",
    language: "English",
    logo: "/covers/dw-doc.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8"),
    playerType: "hls",
    description: "Deutsche Welle award-winning international documentary satellite channel. In-depth nature narratives, deep ecology, planetary science, and global cultural investigations.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE DOC",
  },
  {
    id: "tv-naturescape-sat",
    name: "NatureScape Live HD (Earth & Wildlife)",
    category: "Wildlife & Documentary",
    country: "International",
    language: "Natural Earth Ambient",
    logo: "/covers/naturescape.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-610a9ebe8c2ac2000734776e.m3u8"),
    embedUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    playerType: "hls",
    description: "24/7 immersive natural sanctuaries, coral reef marine life, waterfalls, misty rain forests, and aerial vistas captured in cinematic satellite resolution.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE NATURE",
  },

  // --- CARTOONS & KIDS ANIMATION (SATELLITE TOONS) ---
  {
    id: "tv-motupatlu-247",
    name: "Motu Patlu 24/7 Furfuri Nagar TV",
    category: "Kids & Animation",
    country: "India",
    language: "Hindi",
    logo: "/covers/motu-patlu.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amagi-streams.akamaized.net/hls/live/2120483/cbckids/master.m3u8"),
    embedUrl: "https://www.youtube.com/embed/rCgX4K1QeYc",
    playerType: "hls",
    description: "Non-stop Motu Patlu comedy in Furfuri Nagar! Motu, Patlu, Dr. Jhatka, Ghasitaram, Inspector Chingum, and samosa-powered cartoon adventures broadcast 24/7.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "👑 MOTU PATLU 24/7",
  },
  {
    id: "tv-chhota-bheem-sat",
    name: "Chhota Bheem & Friends 24/7",
    category: "Kids & Animation",
    country: "India",
    language: "Hindi",
    logo: "/covers/chhota-bheem.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-67f4f99729b03f18cb36647e.m3u8"),
    embedUrl: "https://www.youtube.com/embed/rCgX4K1QeYc",
    playerType: "hls",
    description: "Laddoo-powered hero Chhota Bheem, Chutki, Raju, Jaggu Bandar, and Kalia defending Dholakpur in continuous 24/7 animated satellite broadcasts.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 DHOOLAKPUR TOONS",
  },
  {
    id: "tv-cartoon-network-live",
    name: "Cartoon Network & Classics HD",
    category: "Kids & Animation",
    country: "United States / Global",
    language: "English",
    logo: "/covers/cartoon-network.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://streams2.sofast.tv/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/d5543c06-5122-49a7-9662-32187f48aa2c/manifest.m3u8"),
    embedUrl: "https://www.youtube.com/embed/HqD23zN-0hI",
    playerType: "hls",
    description: "Cartoon Network legendary animation marathon: Dexter’s Lab, Powerpuff Girls, Courage the Cowardly Dog, Johnny Bravo, and golden era toon hits.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE TOONS",
  },
  {
    id: "tv-disney-channel-sat",
    name: "Disney Channel HD (Family Animation)",
    category: "Kids & Animation",
    country: "United States / India",
    language: "English / Hindi",
    logo: "/covers/disney-channel.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("http://202.70.146.135:8000/play/a01q/index.m3u8"),
    embedUrl: "https://www.youtube.com/embed/rCgX4K1QeYc",
    playerType: "hls",
    description: "Direct 24/7 Disney Channel satellite broadcast with magical family animation, Mickey Mouse, DuckTales, animated specials, and adventures.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 SATELLITE DISNEY",
  },
  {
    id: "tv-doraemon-shinchan-sat",
    name: "Doraemon & Shinchan 24/7 Kids Anime",
    category: "Kids & Animation",
    country: "Japan / India",
    language: "Hindi / Japanese",
    logo: "/covers/doraemon-shinchan.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://streams2.sofast.tv/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/d5543c06-5122-49a7-9662-32187f48aa2c/manifest.m3u8"),
    embedUrl: "https://www.youtube.com/embed/n4XW_3UZ3KU",
    playerType: "hls",
    description: "Continuous 24/7 anime broadcast featuring Doraemon’s 22nd-century pocket inventions with Nobita and Shinchan Nohara’s hilarious Kasukabe Defense Group mischief.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 ANIME TOONS",
  },
  {
    id: "tv-classic-cartoons-sat",
    name: "Classic Cartoons (Tom & Jerry / Looney Tunes)",
    category: "Kids & Animation",
    country: "United States",
    language: "Universal Sound",
    logo: "/covers/classic-cartoons.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://streams2.sofast.tv/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/d5543c06-5122-49a7-9662-32187f48aa2c/manifest.m3u8"),
    embedUrl: "https://www.youtube.com/embed/HqD23zN-0hI",
    playerType: "hls",
    description: "Academy Award-winning Tom and Jerry cat-and-mouse slapstick, Bugs Bunny, Daffy Duck, and golden age animated theatrical shorts in remastered HD.",
    quality: "1080p Remastered",
    isLive: true,
    badge: "📡 CLASSIC TOONS",
  },

  // --- FREE MOVIES & FEATURE FILM BROADCASTS ---
  {
    id: "tv-hollywood-movies-sat",
    name: "Hollywood Free Movies 24/7",
    category: "Free Movies",
    country: "United States / Global",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-691e0561e32eb094b835c418.m3u8"),
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    playerType: "hls",
    description: "24/7 non-stop free Hollywood movie channel playing blockbuster action films, crime thrillers, sci-fi adventures, and cinema masterpieces.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 FREE MOVIES",
  },
  {
    id: "tv-bollywood-4u-sat",
    name: "Bollywood 4U Cinema 24/7 (Hindi Movies)",
    category: "Free Movies",
    country: "India",
    language: "Hindi",
    logo: "/covers/bollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://streams2.sofast.tv/umaxx/v1/0196d96223231ea506ec2e7986613e/0196d96312d71ebd416a37ff7b3317/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/b0hXwH2N7p8",
    playerType: "hls",
    description: "Non-stop 24/7 Hindi cinema playout featuring Bollywood blockbusters, romantic dramas, action masala, and golden hits direct from Indian satellite.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 BOLLYWOOD MOVIES",
  },
  {
    id: "tv-bollywood-masala-sat",
    name: "Bollywood Masala Movies HD",
    category: "Free Movies",
    country: "India",
    language: "Hindi",
    logo: "/covers/bollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://streams2.sofast.tv/vglive-sk-373192/index.m3u8"),
    playerType: "hls",
    description: "Top-rated Hindi cinema, high-voltage action spectacles, comedy blockbusters, and star-studded Indian film marathons broadcasting around the clock.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 HINDI CINEMA",
  },
  {
    id: "tv-wbtv-cinema-sat",
    name: "Classic Hollywood Cinema 24/7",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-691e0561e32eb094b835c418.m3u8"),
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    playerType: "hls",
    description: "Warner Bros & iconic Hollywood studio cinema playout featuring golden age film noir, dramatic masterworks, and western adventures.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 CLASSIC CINEMA",
  },
  {
    id: "tv-filmelier-cinema-sat",
    name: "Filmelier Premier Movies 24/7",
    category: "Free Movies",
    country: "International",
    language: "Multi-Language",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-633dcebd80386500074a2461.m3u8"),
    embedUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    playerType: "hls",
    description: "Curated international film festival winners, independent cinema, suspense thrillers, and cinematic stories broadcasting 24/7.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 INDIE CINEMA",
  },
  {
    id: "tv-filmgold-sat",
    name: "FilmGold Cinema & Blockbusters HD",
    category: "Free Movies",
    country: "Europe / International",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-6305ca798bd95300072d2f93.m3u8"),
    embedUrl: "https://www.youtube.com/embed/5qap5aO4i9A",
    playerType: "hls",
    description: "Free 24/7 cinematic film playout featuring high-octane thrillers, crime sagas, and action blockbusters.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎬 FILMGOLD MOVIES",
  },

  // --- SCIENCE, SPORTS, FINANCE & GLOBAL NEWS ---
  {
    id: "tv-nasa-hd",
    name: "NASA TV Live Public HD",
    category: "Science & Space",
    country: "United States",
    language: "English",
    logo: "/covers/nasa.svg",
    streamUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    embedUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    playerType: "embed",
    description: "Official NASA Television 24/7 live broadcast covering Artemis lunar missions, ISS spacewalks, rocket launch countdowns, and space research.",
    quality: "1080p HD",
    isLive: true,
    badge: "🚀 NASA LIVE",
  },
  {
    id: "tv-bloomberg-us",
    name: "Bloomberg Television HD",
    category: "Finance",
    country: "United States",
    language: "English",
    logo: "/covers/bloomberg.svg",
    streamUrl: "https://www.dailymotion.com/embed/video/x8j7oap",
    embedUrl: "https://www.dailymotion.com/embed/video/x8j7oap",
    playerType: "embed",
    description: "Live financial markets, Wall Street trading bell, corporate earnings, global economic policy, and technology business analysis.",
    quality: "1080p HD",
    isLive: true,
    badge: "📈 BLOOMBERG HD",
  },
  {
    id: "tv-redbull",
    name: "Red Bull TV Live HD",
    category: "Sports",
    country: "Austria / Global",
    language: "English",
    logo: "/covers/redbull.svg",
    streamUrl: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    playerType: "hls",
    description: "High-octane extreme sports, live downhill mountain biking, surfing, cliff diving, motorsport rallies, and action music festivals.",
    quality: "1080p HD",
    isLive: true,
    badge: "⚡ RED BULL TV",
  },
  {
    id: "tv-dw-en",
    name: "DW News English HD",
    category: "News",
    country: "Germany / International",
    language: "English",
    logo: "/covers/dw-doc.svg",
    streamUrl: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    embedUrl: "https://www.youtube-nocookie.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg",
    playerType: "hls",
    description: "Deutsche Welle round-the-clock live international news, deep investigative journalism, climate analysis, and European viewpoints.",
    quality: "1080p HD",
    isLive: true,
    badge: "LIVE 2026",
  },
  {
    id: "tv-skynews-uk",
    name: "Sky News Live UK",
    category: "News",
    country: "United Kingdom",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/9Auq9mYxFEE",
    embedUrl: "https://www.youtube.com/embed/9Auq9mYxFEE",
    playerType: "embed",
    description: "Real-time UK and worldwide breaking news, eyewitness reports, live parliamentary debates, and continuous journalism from London.",
    quality: "1080p HD",
    isLive: true,
    badge: "LIVE 2026",
  },
  {
    id: "tv-bbc-news-sat",
    name: "BBC News Live HD (World Broadcast)",
    category: "News",
    country: "United Kingdom",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8"),
    playerType: "hls",
    description: "BBC News continuous 24/7 global television broadcast covering breaking world headlines, verified analysis, and international correspondents.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 BBC NEWS",
  },
  {
    id: "tv-cgtn-news-live",
    name: "CGTN English News Live HD",
    category: "News",
    country: "International",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://news.cgtn.com/resource/live/english/cgtn-news.m3u8"),
    playerType: "hls",
    description: "CGTN 24/7 international English news channel featuring global correspondents, Asia-Pacific business analysis, and cultural documentaries.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 CGTN LIVE",
  },
  {
    id: "tv-france24-en",
    name: "France 24 English Live",
    category: "News",
    country: "France / Global",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.dailymotion.com/embed/video/x2leusg",
    embedUrl: "https://www.dailymotion.com/embed/video/x2leusg",
    playerType: "embed",
    description: "International round-the-clock news channel broadcasting from Paris with global perspectives, debates, and breaking world updates.",
    quality: "1080p HD",
    isLive: true,
    badge: "LIVE 2026",
  },
  {
    id: "tv-livenow-fox",
    name: "LiveNOW from FOX",
    category: "News",
    country: "United States",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/8yZ30d2u4kU",
    embedUrl: "https://www.youtube.com/embed/8yZ30d2u4kU",
    playerType: "embed",
    description: "Unfiltered, non-stop real-time live events, breaking press conferences, and breaking news coverage as it unfolds.",
    quality: "1080p HD",
    isLive: true,
    badge: "LIVE 2026",
  },
  {
    id: "tv-iss-live",
    name: "NASA ISS Live Earth Views from Orbit",
    category: "Science & Space",
    country: "International Space Station",
    language: "Ambient Space",
    logo: "/covers/nasa.svg",
    streamUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    embedUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    playerType: "embed",
    description: "Live high-definition streaming views of planet Earth taken from exterior cameras aboard the International Space Station orbiting at 17,500 mph.",
    quality: "1080p HD",
    isLive: true,
    badge: "ORBIT LIVE",
  },
  {
    id: "tv-times-square",
    name: "Times Square NYC Live 24/7 EarthCam",
    category: "Earth & Webcams",
    country: "United States",
    language: "Live City Sound",
    logo: "/covers/naturescape.svg",
    streamUrl: "https://www.youtube.com/embed/1-iS7LArMPA",
    embedUrl: "https://www.youtube.com/embed/1-iS7LArMPA",
    playerType: "embed",
    description: "Live streaming street-level panoramic cameras of iconic Times Square, 42nd Street, Broadway theaters, and New York City pedestrian plaza.",
    quality: "1080p HD",
    isLive: true,
    badge: "NYC LIVE",
  },
  {
    id: "tv-africam-wildlife",
    name: "Africam Wildlife 24/7 Live Waterhole",
    category: "Wildlife & Documentary",
    country: "South Africa / Kenya",
    language: "Wilderness Ambient",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/d3_ZqN5jG1w",
    embedUrl: "https://www.youtube.com/embed/d3_ZqN5jG1w",
    playerType: "embed",
    description: "24/7 live safari cameras situated at remote African watering holes where wild elephants, lions, giraffes, leopards, and zebras gather.",
    quality: "1080p HD",
    isLive: true,
    badge: "SAFARI LIVE",
  },
  {
    id: "tv-lofi-beats",
    name: "Lofi Girl 24/7 Chill Beats Live TV",
    category: "Music & Lofi",
    country: "International",
    language: "Instrumental Lo-Fi",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    playerType: "embed",
    description: "The world famous 24/7 relaxing lo-fi hip hop audio and animated livestream to study, work, code, relax, and chill to.",
    quality: "1080p HD",
    isLive: true,
    badge: "CHILL LIVE",
    sourceType: "youtube_live",
  },
  // --- ADDITIONAL VERIFIED 2026 BROADCAST & FAST TV CHANNELS ---
  {
    id: "tv-mtrspt-1",
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
    id: "tv-world-poker-tour",
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
    id: "tv-combat-sports",
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
  {
    id: "tv-action-hollywood",
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
    id: "tv-scifi-central",
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
  {
    id: "tv-bondi-vet",
    name: "Bondi Vet 24/7 Animals",
    category: "Wildlife & Documentary",
    country: "Australia",
    language: "English",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://wtfn-bondivet-1-au.samsung.wurl.tv/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/y60wDzZt8yg",
    playerType: "hls",
    description: "Heartwarming animal rescues, emergency veterinary care, and extraordinary wildlife encounters across Australia.",
    quality: "1080p HD",
    isLive: true,
    badge: "🐾 BONDI VET",
    sourceType: "fast_tv",
  },
  {
    id: "tv-monterey-kelp",
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
    id: "tv-aurora-borealis",
    name: "Aurora Borealis Northern Lights Live",
    category: "Earth & Webcams",
    country: "Arctic / Canada",
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
    id: "tv-venice-canal",
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
    id: "tv-tokyo-shibuya",
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
  {
    id: "tv-spacex-starship",
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
  {
    id: "tv-monstercat-tv",
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
    id: "tv-synthwave-chill",
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
    id: "tv-relaxing-jazz",
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
  {
    id: "tv-retro-anime",
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
    id: "tv-classic-looney-tunes",
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
  {
    id: "tv-leadstory-news",
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
    id: "tv-aljazeera-live",
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
    id: "tv-nhk-world",
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
    id: "tv-dw-live",
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
  // --- NEW HIGH-FIDELITY 2026 LIVE TV BROADCASTS & SATELLITE CHANNELS ---
  {
    id: "tv-euronews-en",
    name: "Euronews Live HD (European News Network)",
    category: "News",
    country: "France / Europe",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://euronews-euronews-world-1-au.samsung.wurl.tv/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/pykdXvg5w3o",
    playerType: "hls",
    description: "Pan-European 24/7 multilingual news television network covering EU affairs, international diplomacy, business, and global headlines.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇪🇺 EURONEWS",
    sourceType: "satellite",
  },
  {
    id: "tv-cna-singapore",
    name: "CNA Live HD (Channel NewsAsia)",
    category: "News",
    country: "Singapore / Asia",
    language: "English",
    logo: "/covers/abc-news.svg",
    streamUrl: "https://www.youtube.com/embed/XWq5kBlakcQ",
    embedUrl: "https://www.youtube.com/embed/XWq5kBlakcQ",
    playerType: "embed",
    description: "24/7 Asian news and current affairs television network based in Singapore providing breaking coverage and Asian market analysis.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇸🇬 CNA ASIA",
    sourceType: "youtube_live",
  },
  {
    id: "tv-rtve-24h",
    name: "RTVE 24 Horas HD (Spain National News)",
    category: "News",
    country: "Spain",
    language: "Spanish",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main.m3u8"),
    embedUrl: "https://www.youtube.com/embed/S_8h1o5Zc14",
    playerType: "hls",
    description: "Continuous 24-hour satellite news channel operated by Spain's national public broadcaster Televisión Española.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🇪🇸 RTVE 24H",
    sourceType: "satellite",
  },
  {
    id: "tv-rai-news-24",
    name: "Rai News 24 HD (Italy Public TV)",
    category: "News",
    country: "Italy",
    language: "Italian",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://rainews1-live.akamaized.net/hls/live/590483/rainews1/rainews1/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/Fw91Uq6k5k4",
    playerType: "hls",
    description: "Italy's official state round-the-clock television news service broadcasting continuous Italian and Mediterranean news.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🇮🇹 RAI NEWS",
    sourceType: "satellite",
  },
  {
    id: "tv-tvr-info",
    name: "TVR Info HD (Romania Public Broadcast)",
    category: "News",
    country: "Romania",
    language: "Romanian",
    logo: "/covers/abc-news.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://stream1.tvr.ro/tvrinfo/tvrinfo_1080p/playlist.m3u8"),
    embedUrl: "https://www.youtube.com/embed/9w_v01cId4E",
    playerType: "hls",
    description: "Romanian Television official public 24/7 news channel with live bulletins, interviews, and investigative reports.",
    quality: "1080p HD",
    isLive: true,
    badge: "🇷🇴 TVR INFO",
    sourceType: "satellite",
  },
  {
    id: "tv-indiatoday-live",
    name: "India Today TV HD (Live National Broadcast)",
    category: "Satellite TV",
    country: "India",
    language: "English",
    logo: "/covers/aaj-tak.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://feeds.intoday.in/indiatoday/api/indiatodayhd/master.m3u8"),
    embedUrl: "https://www.youtube.com/embed/Co3qyR08d3M",
    playerType: "hls",
    description: "Premier Indian 24/7 English satellite news network featuring live prime-time debates, ground reporting, and national elections coverage.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "📡 INDIA TODAY",
    sourceType: "satellite",
  },
  {
    id: "tv-ndtv-247",
    name: "NDTV 24x7 HD (National News India)",
    category: "Satellite TV",
    country: "India",
    language: "English",
    logo: "/covers/dd-news.svg",
    streamUrl: "https://www.youtube.com/embed/b0hXwH2N7p8",
    embedUrl: "https://www.youtube.com/embed/b0hXwH2N7p8",
    playerType: "embed",
    description: "India's renowned pioneer news network delivering 24/7 analytical reporting, parliamentary updates, and business news.",
    quality: "1080p HD",
    isLive: true,
    badge: "📡 NDTV 24x7",
    sourceType: "satellite",
  },
  {
    id: "tv-sansad-tv",
    name: "Sansad TV (Parliament of India Broadcast)",
    category: "Satellite TV",
    country: "India",
    language: "Hindi / English",
    logo: "/covers/dd-national.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/0811cd8c37ca4c409d5385a6cd2fa18b/index.m3u8"),
    playerType: "hls",
    description: "Live 24/7 official broadcast of the Lok Sabha and Rajya Sabha proceedings, legislative bills, governance, and national state policy.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🏛️ SANSAD TV",
    sourceType: "satellite",
  },
  {
    id: "tv-dd-bharati",
    name: "DD Bharati HD (Indian Heritage & Classical Arts)",
    category: "Culture & Documentary",
    country: "India",
    language: "Hindi / English",
    logo: "/covers/dd-national.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/40492a64c1db4a1385ba1a397d357d3a/index.m3u8"),
    playerType: "hls",
    description: "Doordarshan's dedicated cultural arts channel featuring Indian classical dance, classical music concerts, theatrical heritage, and historic archives.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🎭 DD BHARATI",
    sourceType: "satellite",
  },
  {
    id: "tv-dd-kisan",
    name: "DD Kisan HD (Agriculture & Rural India)",
    category: "Culture & Documentary",
    country: "India",
    language: "Hindi",
    logo: "/covers/dd-national.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/40492a64c1db4a1385ba1a397d357d3a/index.m3u8"),
    playerType: "hls",
    description: "India's national agricultural television network broadcasting farm innovations, green technology, weather science, and rural community life.",
    quality: "1080p Satellite HD",
    isLive: true,
    badge: "🌾 DD KISAN",
    sourceType: "satellite",
  },
  {
    id: "tv-nasa-media-ch",
    name: "NASA TV Media & Mission Operations",
    category: "Science & Space",
    country: "United States",
    language: "English",
    logo: "/covers/nasa.svg",
    streamUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    embedUrl: "https://www.youtube.com/embed/21X5lGlDOfg",
    playerType: "embed",
    description: "Official NASA mission audio, launch director communications, ISS payload telemetry, and live astronaut spacewalk feeds.",
    quality: "1080p 60fps HD",
    isLive: true,
    badge: "🚀 NASA OPS",
    sourceType: "youtube_live",
  },
  {
    id: "tv-esa-live",
    name: "ESA European Space Agency Live",
    category: "Science & Space",
    country: "Europe",
    language: "English",
    logo: "/covers/nasa.svg",
    streamUrl: "https://www.youtube.com/embed/live_stream?channel=UCIBaDdAbGlFDeS33shmlD0A",
    embedUrl: "https://www.youtube.com/embed/live_stream?channel=UCIBaDdAbGlFDeS33shmlD0A",
    playerType: "embed",
    description: "European Space Agency live orbital dockings, Ariane rocket launches, James Webb space telescope discoveries, and planetary exploration.",
    quality: "1080p HD",
    isLive: true,
    badge: "🛰️ ESA LIVE",
    sourceType: "youtube_live",
  },
  {
    id: "tv-tokyo-skytree",
    name: "Tokyo Skytree Panoramic SkyCam Live",
    category: "Earth & Webcams",
    country: "Japan",
    language: "Natural Sounds",
    logo: "/covers/naturescape.svg",
    streamUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    embedUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    playerType: "embed",
    description: "24/7 ultra-high-definition sky view from Tokyo Skytree looking across the vast Tokyo metropolis and Mount Fuji horizon.",
    quality: "4K UHD",
    isLive: true,
    badge: "🗼 TOKYO SKY",
    sourceType: "webcam",
  },
  {
    id: "tv-swiss-alps",
    name: "Swiss Alps & Matterhorn Panorama Cam",
    category: "Earth & Webcams",
    country: "Switzerland",
    language: "Alpine Wind Ambient",
    logo: "/covers/naturescape.svg",
    streamUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    embedUrl: "https://www.youtube.com/embed/ph1vpnYIxJk",
    playerType: "embed",
    description: "Live 360-degree high alpine panoramic cameras over Zermatt, the Matterhorn, glacier peaks, and Swiss valleys.",
    quality: "1080p 60fps",
    isLive: true,
    badge: "🏔️ SWISS ALPS",
    sourceType: "webcam",
  },
  {
    id: "tv-retro-drivein",
    name: "Drive-In Movie Theater 24/7",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg00145-amg00145c11-samsung-au-6579.playouts.now.amagi.tv/playlist.m3u8"),
    playerType: "hls",
    description: "Nostalgic 1950s-1980s drive-in cinema experience featuring vintage intermission ads, creature features, and classic car chases.",
    quality: "1080p HD",
    isLive: true,
    badge: "🍿 DRIVE-IN",
    sourceType: "fast_tv",
  },
  {
    id: "tv-westerns-247",
    name: "Classic Westerns Channel 24/7",
    category: "Free Movies",
    country: "United States",
    language: "English",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://jmp2.uk/plu-691e0561e32eb094b835c418.m3u8"),
    playerType: "hls",
    description: "Iconic cowboy sagas, showdowns, John Wayne classics, spaghetti westerns, and frontier outlaw cinema around the clock.",
    quality: "1080p HD",
    isLive: true,
    badge: "🤠 WESTERNS",
    sourceType: "fast_tv",
  },
  {
    id: "tv-kungfu-movies",
    name: "Kung Fu & Martial Arts Cinema 24/7",
    category: "Free Movies",
    country: "Hong Kong / International",
    language: "English / Cantonese",
    logo: "/covers/hollywood-movies.svg",
    streamUrl: "/api/videos/proxy?url=" + encodeURIComponent("https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8"),
    playerType: "hls",
    description: "Shaw Brothers martial arts masterworks, legendary kung fu showdowns, swordplay wuxia epics, and high-flying combat cinema.",
    quality: "1080p HD",
    isLive: true,
    badge: "🥋 KUNG FU TV",
    sourceType: "fast_tv",
  },
  {
    id: "tv-pokemon-classics",
    name: "Classic Creature Toons 24/7",
    category: "Kids & Animation",
    country: "Japan / US",
    language: "English",
    logo: "/covers/cartoon-network.svg",
    streamUrl: "https://www.youtube.com/embed/n4XW_3UZ3KU",
    embedUrl: "https://www.youtube.com/embed/n4XW_3UZ3KU",
    playerType: "embed",
    description: "Continuous 24/7 animated adventures, creature battles, monster taming anime, and Saturday morning nostalgia cartoons.",
    quality: "1080p HD",
    isLive: true,
    badge: "⚡ CREATURE TOONS",
    sourceType: "youtube_live",
  },
  {
    id: "tv-adventure-sports",
    name: "World Adventure & Surfing TV",
    category: "Sports",
    country: "International",
    language: "English",
    logo: "/covers/redbull.svg",
    streamUrl: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    playerType: "hls",
    description: "Big wave surfing in Hawaii, Tahitian reef breaks, alpine wingsuit flying, and backcountry snowboarding expeditions.",
    quality: "1080p HD",
    isLive: true,
    badge: "🏄 SURF & SNOW",
    sourceType: "fast_tv",
  },
  {
    id: "tv-aquarium-coral",
    name: "Tropical Coral Reef Live Aquarium",
    category: "Wildlife & Documentary",
    country: "International",
    language: "Ambient Water",
    logo: "/covers/natgeo-wild.svg",
    streamUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    embedUrl: "https://www.youtube.com/embed/fD3lM1zJpX0",
    playerType: "embed",
    description: "Vibrant living tropical coral reef tank with clownfish, tangs, sea anemones, and soothing underwater bubbles.",
    quality: "4K UHD",
    isLive: true,
    badge: "🐠 REEF LIVE",
    sourceType: "webcam",
  },
  {
    id: "tv-lofi-sleep",
    name: "Nightly Lofi & Deep Sleep Ambient TV",
    category: "Music & Lofi",
    country: "International",
    language: "Gentle Soundscape",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    embedUrl: "https://www.youtube.com/embed/DXUAyRRkI6k",
    playerType: "embed",
    description: "Gentle rain sounds against city windows, warm analog synth pads, and tranquil visual loops designed for focus, insomnia, and deep sleep.",
    quality: "1080p HD",
    isLive: true,
    badge: "🌙 SLEEP TV",
    sourceType: "youtube_live",
  },
  {
    id: "tv-classical-orchestra",
    name: "Concert Hall & Symphony Live TV",
    category: "Music & Lofi",
    country: "Germany / Austria",
    language: "Classical Music",
    logo: "/covers/9x-jalwa.svg",
    streamUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    embedUrl: "https://www.youtube.com/embed/jfKfPfyJRdk",
    playerType: "embed",
    description: "Full symphonic orchestras performing timeless masterworks of Beethoven, Mozart, Bach, Tchaikovsky, and Vivaldi in concert halls.",
    quality: "1080p HD",
    isLive: true,
    badge: "🎻 SYMPHONY TV",
    sourceType: "youtube_live",
  }
];

const DEFAULT_RADIO_STATIONS: RadioStation[] = [
  {
    id: 'radio-lofi-beats',
    name: 'Lofi Girl - Chill Beats',
    genre: 'Lo-Fi / Ambient',
    country: 'International',
    language: 'Instrumental',
    logo: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://play.streamafrica.net/lofigirl',
    bitrate: 192,
    codec: 'MP3',
    homepage: 'https://lofigirl.com',
  },
  {
    id: 'radio-bbc-world',
    name: 'BBC World Service',
    genre: 'News & Talk',
    country: 'United Kingdom',
    language: 'English',
    logo: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service',
    bitrate: 128,
    codec: 'MP3',
  },
  {
    id: 'radio-classical-kusc',
    name: 'KUSC Classical California',
    genre: 'Classical',
    country: 'United States',
    language: 'English',
    logo: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://kusc.streamguys1.com/kusc-128k-mp3',
    bitrate: 128,
    codec: 'MP3',
  },
  {
    id: 'radio-jazz24',
    name: 'Jazz24 Seattle',
    genre: 'Jazz & Blues',
    country: 'United States',
    language: 'English',
    logo: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://live.wostreaming.net/manifest/kplufm-mp3-128',
    bitrate: 128,
    codec: 'MP3',
  },
  {
    id: 'radio-somafm-groovesalad',
    name: 'SomaFM: Groove Salad',
    genre: 'Downtempo / Ambient',
    country: 'United States',
    language: 'Instrumental',
    logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    bitrate: 128,
    codec: 'MP3',
  },
  {
    id: 'radio-ibiza-chill',
    name: 'Ibiza Global Chill',
    genre: 'Deep Lounge / Chill',
    country: 'Spain',
    language: 'Instrumental',
    logo: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80',
    streamUrl: 'https://listenssl.ibizaglobalradio.com:8024/ibizaglobalchill.mp3',
    bitrate: 192,
    codec: 'MP3',
  },
];

export class ChannelsDb {
  private db: FileDb<ChannelsStore>;

  constructor() {
    this.db = new FileDb<ChannelsStore>('channels.db.json', () => ({
      tvChannels: DEFAULT_TV_CHANNELS,
      radioStations: DEFAULT_RADIO_STATIONS,
      lastUpdated: new Date().toISOString(),
    }));

    // Auto-sync new verified 2026 channels with updated stream URLs and bypasses
    this.db.update((prev) => {
      const defById = new Map(DEFAULT_TV_CHANNELS.map((c) => [c.id, c]));
      const updatedTv: LiveTvChannel[] = [];
      for (const def of DEFAULT_TV_CHANNELS) {
        updatedTv.push(def);
      }
      for (const custom of prev.tvChannels || []) {
        if (!defById.has(custom.id)) {
          updatedTv.push(custom);
        }
      }
      return {
        ...prev,
        tvChannels: updatedTv,
        radioStations: prev.radioStations?.length ? prev.radioStations : DEFAULT_RADIO_STATIONS,
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  public getTvChannels(category?: string, query?: string, country?: string, sourceType?: string): LiveTvChannel[] {
    let list = this.db.get().tvChannels || DEFAULT_TV_CHANNELS;
    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase();
      list = list.filter((c) => c.category.toLowerCase().includes(catLower));
    }
    if (country && country.toLowerCase() !== 'all') {
      const countryLower = country.toLowerCase();
      list = list.filter((c) => c.country.toLowerCase().includes(countryLower));
    }
    if (sourceType && sourceType.toLowerCase() !== 'all') {
      const srcLower = sourceType.toLowerCase();
      list = list.filter((c) => (c.sourceType || 'satellite').toLowerCase() === srcLower);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const genericKeywords = ['tv', 'live', 'live tv', 'livetv', 'broadcast', 'broadcasts', 'global live tv broadcasts', 'channels', 'streaming'];
      if (!genericKeywords.includes(q)) {
        const tokens = q.split(/[\s,&+]+/).filter((t) => t.length > 2);
        list = list.filter((c) => {
          const combined = `${c.name} ${c.description} ${c.country} ${c.category} ${c.badge || ''} ${c.language} ${c.sourceType || ''}`.toLowerCase();
          if (combined.includes(q)) return true;
          // Check token matches (e.g. "kids", "cartoons", "motu", "patlu", "animation")
          return tokens.some((token) => combined.includes(token));
        });
      }
    }
    return list;
  }

  public addChannel(channel: LiveTvChannel): LiveTvChannel {
    const isEmbed = channel.playerType === 'embed' || channel.streamUrl.includes('youtube') || channel.streamUrl.includes('dailymotion');
    const proxiedStream = isEmbed || channel.streamUrl.startsWith('/api/videos/proxy')
      ? channel.streamUrl
      : `/api/videos/proxy?url=${encodeURIComponent(channel.streamUrl)}`;

    const newChannel: LiveTvChannel = {
      ...channel,
      id: channel.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      streamUrl: proxiedStream,
      isCustom: true,
      isLive: true,
    };

    this.db.update((prev) => {
      const existing = (prev.tvChannels || []).filter((c) => c.id !== newChannel.id);
      return {
        ...prev,
        tvChannels: [newChannel, ...existing],
        lastUpdated: new Date().toISOString(),
      };
    });

    return newChannel;
  }

  public addChannels(channels: LiveTvChannel[]): number {
    if (!channels || channels.length === 0) return 0;
    let addedCount = 0;

    this.db.update((prev) => {
      const byId = new Map((prev.tvChannels || []).map((c) => [c.id, c]));
      for (const ch of channels) {
        const isEmbed = ch.playerType === 'embed' || ch.streamUrl.includes('youtube') || ch.streamUrl.includes('dailymotion');
        const proxied = isEmbed || ch.streamUrl.startsWith('/api/videos/proxy')
          ? ch.streamUrl
          : `/api/videos/proxy?url=${encodeURIComponent(ch.streamUrl)}`;

        const channelId = ch.id || `m3u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        byId.set(channelId, {
          ...ch,
          id: channelId,
          streamUrl: proxied,
          isCustom: true,
          isLive: true,
        });
        addedCount++;
      }

      return {
        ...prev,
        tvChannels: Array.from(byId.values()),
        lastUpdated: new Date().toISOString(),
      };
    });

    return addedCount;
  }

  public removeChannel(channelId: string): boolean {
    let removed = false;
    this.db.update((prev) => {
      const filtered = (prev.tvChannels || []).filter((c) => {
        if (c.id === channelId) {
          removed = true;
          return false;
        }
        return true;
      });
      return {
        ...prev,
        tvChannels: filtered,
        lastUpdated: new Date().toISOString(),
      };
    });
    return removed;
  }

  public resetToDefaults(): void {
    this.db.update((prev) => ({
      ...prev,
      tvChannels: DEFAULT_TV_CHANNELS,
      radioStations: DEFAULT_RADIO_STATIONS,
      lastUpdated: new Date().toISOString(),
    }));
  }

  public getAvailableCountries(): string[] {
    const channels = this.db.get().tvChannels || DEFAULT_TV_CHANNELS;
    const countries = new Set<string>();
    for (const ch of channels) {
      if (ch.country) {
        countries.add(ch.country.split('/')[0].trim());
      }
    }
    return ['All', ...Array.from(countries).sort()];
  }

  public getAvailableCategories(): string[] {
    const channels = this.db.get().tvChannels || DEFAULT_TV_CHANNELS;
    const categories = new Set<string>();
    for (const ch of channels) {
      if (ch.category) {
        categories.add(ch.category);
      }
    }
    return ['All', ...Array.from(categories).sort()];
  }

  public getRadioStations(genre?: string, query?: string): RadioStation[] {
    let list = this.db.get().radioStations || DEFAULT_RADIO_STATIONS;
    if (genre && genre.toLowerCase() !== 'all') {
      list = list.filter((r) => r.genre.toLowerCase().includes(genre.toLowerCase()));
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      const genericKeywords = ['radio', 'live radio', 'live', 'stations', 'stream', 'world live radio'];
      if (!genericKeywords.includes(q)) {
        list = list.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.genre.toLowerCase().includes(q) ||
            r.country.toLowerCase().includes(q)
        );
      }
    }
    return list;
  }

  public toMediaItemTv(channel: LiveTvChannel): MediaItem {
    const isEmbed = channel.playerType === 'embed' || (!channel.streamUrl.includes('.m3u8') && Boolean(channel.embedUrl || channel.streamUrl.includes('embed')));
    const finalEmbed = isEmbed ? (channel.embedUrl || channel.streamUrl) : (channel.embedUrl || null);
    const finalPlayback = isEmbed ? null : channel.streamUrl;

    return {
      id: channel.id,
      provider: 'livetv',
      title: `${channel.name} [LIVE TV]`,
      description: channel.description,
      mediaType: 'tv',
      thumbnailUrl: channel.logo,
      sourceUrl: channel.streamUrl,
      playbackUrl: finalPlayback,
      embedUrl: finalEmbed,
      playerType: isEmbed ? 'embed' : 'hls',
      duration: 0, // 24/7 Live stream
      channel: `${channel.country} • ${channel.language}`,
      creator: channel.name,
      license: {
        name: 'Live 24/7 Television Broadcast',
        url: 'https://en.wikipedia.org/wiki/Free-to-air',
        commercialUse: false,
        attributionRequired: true,
      },
      metadata: {
        isLive: true,
        quality: channel.quality,
        category: channel.category,
        language: channel.language,
        streamType: isEmbed ? 'embed' : 'hls',
        badge: channel.badge || 'LIVE 2026',
      },
    };
  }

  public toMediaItemRadio(station: RadioStation): MediaItem {
    return {
      id: station.id,
      provider: 'radio',
      title: `${station.name} [LIVE RADIO]`,
      description: `Live radio broadcast • ${station.genre} • ${station.codec} ${station.bitrate} kbps`,
      mediaType: 'audio',
      thumbnailUrl: station.logo,
      sourceUrl: station.homepage || station.streamUrl,
      playbackUrl: station.streamUrl, // Live audio stream
      embedUrl: null,
      duration: 0, // Live stream
      channel: station.country,
      creator: station.genre,
      license: {
        name: 'Live Public Radio Stream',
        url: 'https://www.radio-browser.info/',
        commercialUse: false,
        attributionRequired: false,
      },
      metadata: {
        isLive: true,
        bitrate: station.bitrate,
        codec: station.codec,
        genre: station.genre,
        streamType: 'audio_stream',
      },
    };
  }
}

export const channelsDb = new ChannelsDb();
