/**
 * M3U / M3U8 Playlist Importer, Parser & Generator Service
 * Supports importing custom IPTV playlists, URL fetching, parsing EXTINF headers,
 * 1-click curated playlist presets, and standard M3U export.
 */

import { LiveTvChannel } from '../db/channelsDb';

export interface M3uPreset {
  id: string;
  name: string;
  description: string;
  channelCount: number;
  badge: string;
  icon: string;
  channels: LiveTvChannel[];
}

export class M3uService {
  /**
   * Parse raw M3U / M3U8 playlist content
   */
  public parseM3u(content: string, defaultGroup = 'Imported M3U'): LiveTvChannel[] {
    const lines = content.split(/\r?\n/);
    const channels: LiveTvChannel[] = [];

    let currentMeta: Partial<LiveTvChannel> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      if (rawLine.startsWith('#EXTINF:')) {
        currentMeta = this.parseExtInf(rawLine, defaultGroup);
      } else if (rawLine.startsWith('#EXTGRP:')) {
        const grp = rawLine.replace('#EXTGRP:', '').trim();
        if (currentMeta && grp) {
          currentMeta.category = grp;
        }
      } else if (!rawLine.startsWith('#') && (rawLine.startsWith('http://') || rawLine.startsWith('https://'))) {
        if (currentMeta) {
          const streamUrl = rawLine;
          const isEmbed = streamUrl.includes('youtube.com') || streamUrl.includes('dailymotion.com');
          const proxiedUrl = isEmbed ? streamUrl : (streamUrl.startsWith('/api/videos/proxy') ? streamUrl : `/api/videos/proxy?url=${encodeURIComponent(streamUrl)}`);

          const channelId = currentMeta.id || `m3u-${Date.now()}-${channels.length + 1}`;

          channels.push({
            id: channelId,
            name: currentMeta.name || `Channel ${channels.length + 1}`,
            category: currentMeta.category || defaultGroup,
            country: currentMeta.country || 'International',
            language: currentMeta.language || 'English',
            logo: currentMeta.logo || '/covers/abc-news.svg',
            streamUrl: proxiedUrl,
            embedUrl: isEmbed ? streamUrl : undefined,
            playerType: isEmbed ? 'embed' : 'hls',
            description: currentMeta.description || `Imported M3U stream: ${currentMeta.name || 'Live Channel'}`,
            quality: currentMeta.quality || '1080p HD',
            isLive: true,
            badge: currentMeta.badge || '📥 M3U STREAM',
            sourceType: 'm3u',
            isCustom: true,
          });

          currentMeta = null;
        }
      }
    }

    return channels;
  }

  /**
   * Fetch an M3U playlist from a remote URL and parse it
   */
  public async fetchAndParse(url: string, defaultGroup = 'Imported Playlist'): Promise<LiveTvChannel[]> {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        Accept: 'application/x-mpegurl, audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch M3U playlist from URL (HTTP ${res.status})`);
    }

    const text = await res.text();
    return this.parseM3u(text, defaultGroup);
  }

  /**
   * Parse an individual #EXTINF line
   */
  private parseExtInf(line: string, defaultGroup: string): Partial<LiveTvChannel> {
    const meta: Partial<LiveTvChannel> = {
      category: defaultGroup,
      country: 'International',
      language: 'English',
      quality: '1080p HD',
    };

    // Extract attributes like tvg-id="...", tvg-name="...", tvg-logo="...", group-title="..."
    const tvgId = this.matchAttr(line, 'tvg-id');
    const tvgName = this.matchAttr(line, 'tvg-name');
    const tvgLogo = this.matchAttr(line, 'tvg-logo');
    const groupTitle = this.matchAttr(line, 'group-title');
    const tvgCountry = this.matchAttr(line, 'tvg-country');
    const tvgLanguage = this.matchAttr(line, 'tvg-language');

    if (tvgId) meta.id = `m3u-${tvgId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    if (tvgLogo) meta.logo = tvgLogo;
    if (groupTitle) meta.category = groupTitle;
    if (tvgCountry) meta.country = tvgCountry;
    if (tvgLanguage) meta.language = tvgLanguage;

    // The display name is after the last comma
    const commaIndex = line.lastIndexOf(',');
    if (commaIndex !== -1 && commaIndex < line.length - 1) {
      meta.name = line.substring(commaIndex + 1).trim();
    } else if (tvgName) {
      meta.name = tvgName;
    }

    return meta;
  }

  private matchAttr(line: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
    const match = line.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Generate an M3U file string from channels
   */
  public generateM3u(channels: LiveTvChannel[]): string {
    let output = '#EXTM3U url-tvg="http://iptv-org.github.io/epg/guides.xml"\n\n';

    for (const ch of channels) {
      const cleanName = ch.name.replace(/,/g, '');
      const cleanLogo = ch.logo || '';
      const cleanGroup = ch.category || 'General';
      const cleanCountry = ch.country || 'Global';

      output += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${cleanName}" tvg-logo="${cleanLogo}" tvg-country="${cleanCountry}" group-title="${cleanGroup}", ${cleanName}\n`;
      // Extract original source URL if proxied
      let rawUrl = ch.streamUrl;
      if (rawUrl.startsWith('/api/videos/proxy?url=')) {
        try {
          rawUrl = decodeURIComponent(rawUrl.replace('/api/videos/proxy?url=', ''));
        } catch {}
      }
      output += `${rawUrl}\n\n`;
    }

    return output;
  }

  /**
   * Curated 1-Click Preset M3U Playlists
   */
  public getPresets(): M3uPreset[] {
    return [
      {
        id: 'preset-global-news',
        name: 'Global 24/7 News Network',
        description: 'Instant 24/7 breaking news channels from BBC, ABC, DW, France 24, Sky News, CGTN, and Aaj Tak.',
        channelCount: 10,
        badge: '📰 24/7 WORLD NEWS',
        icon: 'Globe',
        channels: [
          {
            id: 'preset-bbc-news',
            name: 'BBC News Live HD',
            category: 'News',
            country: 'United Kingdom',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://vs-hls-push-ww-live.akamaized.net/x=4/i=urn:bbc:pips:service:bbc_news_channel_hd/t=3840/v=pv14/b=5070016/main.m3u8'),
            playerType: 'hls',
            description: 'BBC News continuous 24/7 global television broadcast covering breaking world headlines and live reports.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '📡 BBC NEWS',
          },
          {
            id: 'preset-sky-news',
            name: 'Sky News UK HD',
            category: 'News',
            country: 'United Kingdom',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8'),
            playerType: 'hls',
            description: 'Sky News live 24/7 continuous breaking news stream from London studio playout.',
            quality: '1080p HD',
            isLive: true,
            badge: '📡 SKY NEWS',
          },
          {
            id: 'preset-abc-news',
            name: 'ABC News Live HD',
            category: 'News',
            country: 'United States',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: 'https://www.youtube.com/embed/gCNeDWCI0vo',
            embedUrl: 'https://www.youtube.com/embed/gCNeDWCI0vo',
            playerType: 'embed',
            description: 'American Broadcasting Company 24/7 direct digital broadcast feed with live anchor coverage.',
            quality: '1080p HD',
            isLive: true,
            badge: '📡 ABC NEWS',
          },
          {
            id: 'preset-leadstory',
            name: 'LeadStory Global News',
            category: 'News',
            country: 'International',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://amg02703-leadstory-leadstory-samsungau-rr75f.amagi.tv/playlist/amg02703-leadstory-leadstory-samsungau/playlist.m3u8'),
            playerType: 'hls',
            description: 'Fast-paced continuous global news summary and analysis.',
            quality: '1080p HD',
            isLive: true,
            badge: '📰 LEADSTORY',
          },
          {
            id: 'preset-cgtn-news',
            name: 'CGTN English News Live',
            category: 'News',
            country: 'International',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://news.cgtn.com/resource/live/english/cgtn-news.m3u8'),
            playerType: 'hls',
            description: 'CGTN 24/7 international English news channel featuring global correspondents and business analysis.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '📡 CGTN LIVE',
          },
          {
            id: 'preset-euronews',
            name: 'Euronews Live HD',
            category: 'News',
            country: 'Europe',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://euronews-euronews-world-1-au.samsung.wurl.tv/playlist.m3u8'),
            playerType: 'hls',
            description: 'Pan-European 24/7 multilingual news television network covering European and world events.',
            quality: '1080p HD',
            isLive: true,
            badge: '🇪🇺 EURONEWS',
          },
          {
            id: 'preset-cna-singapore',
            name: 'CNA Channel NewsAsia Live',
            category: 'News',
            country: 'Singapore',
            language: 'English',
            logo: '/covers/abc-news.svg',
            streamUrl: 'https://www.youtube.com/embed/XWq5kBlakcQ',
            embedUrl: 'https://www.youtube.com/embed/XWq5kBlakcQ',
            playerType: 'embed',
            description: '24/7 Asian news and current affairs television network based in Singapore.',
            quality: '1080p HD',
            isLive: true,
            badge: '🇸🇬 CNA ASIA',
          },
          {
            id: 'preset-rtve-24h',
            name: 'RTVE 24 Horas HD',
            category: 'News',
            country: 'Spain',
            language: 'Spanish',
            logo: '/covers/abc-news.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://rtvelivestream.akamaized.net/rtvesec/24h/24h_main.m3u8'),
            playerType: 'hls',
            description: 'Spain national public broadcaster continuous 24-hour satellite news channel.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '🇪🇸 RTVE 24H',
          },
        ],
      },
      {
        id: 'preset-sports-racing',
        name: 'Motorsport, Extreme Sports & Combat',
        description: 'High-octane racing, championship poker, extreme athletics, and full-contact sports streams.',
        channelCount: 5,
        badge: '🏎️ SPEED & SPORTS',
        icon: 'Trophy',
        channels: [
          {
            id: 'preset-mtrspt',
            name: 'MTRSPT 1 Live Racing',
            category: 'Sports',
            country: 'United States',
            language: 'English',
            logo: '/covers/dd-sports.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://amg02873-kravemedia-mtrspt1-samsungau-2anp4.amagi.tv/playlist/amg02873-kravemedia-mtrspt1-samsungau/playlist.m3u8'),
            playerType: 'hls',
            description: '24/7 World motorsport racing network covering supercars, GT endurance, and rally stages.',
            quality: '1080p HD',
            isLive: true,
            badge: '🏎️ RACING TV',
          },
          {
            id: 'preset-redbull',
            name: 'Red Bull TV Live HD',
            category: 'Sports',
            country: 'Austria',
            language: 'English',
            logo: '/covers/dd-sports.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'),
            playerType: 'hls',
            description: 'Global extreme sports, Formula 1 documentaries, mountain biking, cliff diving, and action sports.',
            quality: '1080p HD',
            isLive: true,
            badge: '⚡ RED BULL TV',
          },
          {
            id: 'preset-combat',
            name: 'Combat Sports TV 24/7',
            category: 'Sports',
            country: 'International',
            language: 'English',
            logo: '/covers/dd-sports.svg',
            streamUrl: 'https://www.youtube.com/embed/9Auq9mYxFEE',
            embedUrl: 'https://www.youtube.com/embed/9Auq9mYxFEE',
            playerType: 'embed',
            description: 'Championship kickboxing, Muay Thai, MMA, and martial arts showcases 24/7.',
            quality: '1080p HD',
            isLive: true,
            badge: '🥊 COMBAT TV',
          },
          {
            id: 'preset-wpt',
            name: 'World Poker Tour Championship',
            category: 'Sports',
            country: 'United States',
            language: 'English',
            logo: '/covers/dd-sports.svg',
            streamUrl: 'https://www.youtube.com/embed/5qap5aO4i9A',
            embedUrl: 'https://www.youtube.com/embed/5qap5aO4i9A',
            playerType: 'embed',
            description: '24/7 continuous championship tournaments, final tables, and high-stakes poker hands.',
            quality: '1080p HD',
            isLive: true,
            badge: '♠️ WPT LIVE',
          },
        ],
      },
      {
        id: 'preset-cinema-movies',
        name: 'Action, Sci-Fi & Hollywood Cinema',
        description: '24/7 free full-length movie channels featuring classic Hollywood, action blockbusters, and sci-fi cinema.',
        channelCount: 5,
        badge: '🎬 24/7 MOVIES',
        icon: 'Film',
        channels: [
          {
            id: 'preset-action-movies',
            name: 'Action Hollywood Movies 24/7',
            category: 'Free Movies',
            country: 'United States',
            language: 'English',
            logo: '/covers/hollywood-movies.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8'),
            playerType: 'hls',
            description: 'Non-stop action, thriller, martial arts, and blockbuster adventure cinema playout.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '🎬 ACTION TV',
          },
          {
            id: 'preset-scifi',
            name: 'Sci-Fi Central TV',
            category: 'Free Movies',
            country: 'United States',
            language: 'English',
            logo: '/covers/hollywood-movies.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://amg00145-amg00145c11-samsung-au-6579.playouts.now.amagi.tv/playlist.m3u8'),
            playerType: 'hls',
            description: 'Classic science fiction feature films, alien encounters, space epics, and retro dystopian cinema.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '🚀 SCI-FI',
          },
          {
            id: 'preset-classic-hollywood',
            name: 'Classic Hollywood Cinema 24/7',
            category: 'Free Movies',
            country: 'United States',
            language: 'English',
            logo: '/covers/hollywood-movies.svg',
            streamUrl: '/api/videos/proxy?url=' + encodeURIComponent('https://jmp2.uk/plu-691e0561e32eb094b835c418.m3u8'),
            embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
            playerType: 'hls',
            description: 'Golden age Hollywood masterworks, dramatic film noir, and vintage adventure stories.',
            quality: '1080p Satellite HD',
            isLive: true,
            badge: '🎬 GOLDEN AGE',
          },
        ],
      },
      {
        id: 'preset-nature-earthcams',
        name: 'Wildlife, Space & EarthCams',
        description: 'Breathtaking live cameras from orbit, deep ocean habitats, African wildlife waterholes, and famous cityscapes.',
        channelCount: 6,
        badge: '🌍 EARTH & SPACE',
        icon: 'Compass',
        channels: [
          {
            id: 'preset-iss-earth',
            name: 'NASA ISS Live Earth Views',
            category: 'Science & Space',
            country: 'United States',
            language: 'Ambient',
            logo: '/covers/nasa.svg',
            streamUrl: 'https://www.youtube.com/embed/xRPjKOmTrEA',
            embedUrl: 'https://www.youtube.com/embed/xRPjKOmTrEA',
            playerType: 'embed',
            description: 'Live High Definition views of Earth from the International Space Station traveling 250 miles above.',
            quality: '1080p Orbit HD',
            isLive: true,
            badge: '🛰️ ISS ORBIT',
          },
          {
            id: 'preset-kelp-cam',
            name: 'Monterey Bay Kelp Forest Cam',
            category: 'Wildlife & Documentary',
            country: 'United States',
            language: 'Natural Sounds',
            logo: '/covers/natgeo-wild.svg',
            streamUrl: 'https://www.youtube.com/embed/fD3lM1zJpX0',
            embedUrl: 'https://www.youtube.com/embed/fD3lM1zJpX0',
            playerType: 'embed',
            description: 'Live underwater habitat with leopard sharks, sea otters, and giant kelp.',
            quality: '1080p 60fps',
            isLive: true,
            badge: '🌊 OCEAN CAM',
          },
          {
            id: 'preset-aurora',
            name: 'Aurora Borealis Northern Lights Live',
            category: 'Earth & Webcams',
            country: 'Arctic',
            language: 'Ambient',
            logo: '/covers/natgeo-wild.svg',
            streamUrl: 'https://www.youtube.com/embed/cw7qL5Yd3oY',
            embedUrl: 'https://www.youtube.com/embed/cw7qL5Yd3oY',
            playerType: 'embed',
            description: 'Live all-sky camera capturing real-time Aurora Borealis northern lights.',
            quality: '1080p HD',
            isLive: true,
            badge: '🌌 AURORA CAM',
          },
          {
            id: 'preset-shibuya',
            name: 'Tokyo Shibuya Crossing Live Cam',
            category: 'Earth & Webcams',
            country: 'Japan',
            language: 'Natural Sounds',
            logo: '/covers/natgeo-wild.svg',
            streamUrl: 'https://www.youtube.com/embed/gFRtAAmiFbE',
            embedUrl: 'https://www.youtube.com/embed/gFRtAAmiFbE',
            playerType: 'embed',
            description: 'Continuous live stream of Shibuya Scramble Crossing in Tokyo, Japan.',
            quality: '1080p HD',
            isLive: true,
            badge: '🗼 TOKYO CAM',
          },
        ],
      },
      {
        id: 'preset-chill-music',
        name: 'Electronic, Lo-Fi & Chillout TV',
        description: '24/7 visual live streams for studying, gaming, coding, and relaxation.',
        channelCount: 4,
        badge: '🎧 24/7 MUSIC',
        icon: 'Music',
        channels: [
          {
            id: 'preset-monstercat',
            name: 'Monstercat TV 24/7 EDM',
            category: 'Music & Lofi',
            country: 'Canada',
            language: 'Electronic',
            logo: '/covers/9x-jalwa.svg',
            streamUrl: 'https://www.youtube.com/embed/7NOSDKb0HlU',
            embedUrl: 'https://www.youtube.com/embed/7NOSDKb0HlU',
            playerType: 'embed',
            description: 'Non-stop electronic dance music broadcast featuring bass, house, synthwave, and drum & bass.',
            quality: '1080p HD',
            isLive: true,
            badge: '🎧 MONSTERCAT',
          },
          {
            id: 'preset-synthwave',
            name: 'Synthwave / Cyberpunk Radio TV',
            category: 'Music & Lofi',
            country: 'International',
            language: 'Synthwave',
            logo: '/covers/9x-jalwa.svg',
            streamUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY',
            embedUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY',
            playerType: 'embed',
            description: 'Retro 80s cyberpunk synthwave, darksynth, and outrun driving visuals 24/7.',
            quality: '1080p HD',
            isLive: true,
            badge: '🌆 SYNTHWAVE',
          },
          {
            id: 'preset-lofi-girl',
            name: 'Lofi Girl 24/7 Chill Beats TV',
            category: 'Music & Lofi',
            country: 'France',
            language: 'Instrumental',
            logo: '/covers/lofi-girl.svg',
            streamUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
            embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
            playerType: 'embed',
            description: 'Iconic relaxing lo-fi hip hop beats stream for studying, sleeping, and relaxing.',
            quality: '1080p HD',
            isLive: true,
            badge: '🎧 24/7 LO-FI',
          },
        ],
      },
    ];
  }
}

export const m3uService = new M3uService();
