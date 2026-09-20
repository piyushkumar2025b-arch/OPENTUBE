import { channelsDb } from "./server/db/channelsDb.js";
import http from 'http';

// We can test each channel's streamUrl and embedUrl
const list = channelsDb.getTvChannels();

async function checkOne(ch) {
  let stream = ch.streamUrl;
  if (stream.startsWith('/api/videos/proxy?url=')) {
    stream = decodeURIComponent(stream.replace('/api/videos/proxy?url=', ''));
  }
  let streamOk = false;
  let streamErr = '';
  try {
    const res = await fetch(stream, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
    streamOk = res.ok || res.status < 400;
    if (!streamOk) streamErr = `HTTP ${res.status}`;
  } catch (e) {
    streamErr = e.name;
  }

  let embedOk = false;
  let embedErr = '';
  if (ch.embedUrl) {
    try {
      const res = await fetch(ch.embedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
      embedOk = res.ok || res.status < 400;
      if (!embedOk) embedErr = `HTTP ${res.status}`;
    } catch (e) {
      embedErr = e.name;
    }
  }

  return {
    id: ch.id,
    name: ch.name,
    playerType: ch.playerType,
    streamOk,
    streamErr,
    embedOk,
    embedErr,
    working: streamOk || embedOk
  };
}

async function run() {
  console.log(`Auditing ${list.length} channels...`);
  const results = [];
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5);
    const r = await Promise.all(batch.map(checkOne));
    results.push(...r);
  }
  const broken = results.filter(r => !r.working);
  console.log(`TOTAL: ${results.length}, WORKING: ${results.length - broken.length}, TRULY BROKEN: ${broken.length}`);
  for (const b of broken) {
    console.log(`BROKEN: [${b.id}] ${b.name} -> streamErr:${b.streamErr} embedErr:${b.embedErr || 'none'}`);
  }
}

run();
