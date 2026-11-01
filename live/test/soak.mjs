// Chạy thử dài hạn trước khi LIVE 24h: `npm run soak -- 30` (số phút, mặc định 10).
// Dựng server riêng (dữ liệu tạm), mở overlay của mọi kênh trong Chrome/Edge chạy ẩn (tắt tiếng), bật bot trên mọi kênh,
// rồi mỗi phút đo bộ nhớ server và bộ nhớ JS của từng overlay. Bộ nhớ tăng đều không dừng là dấu hiệu rò rỉ.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const here = path.dirname(fileURLToPath(import.meta.url));
const MINUTES = +process.argv[2] || 10;
const PORT = 3800 + Math.floor(Math.random() * 90), DBG = 9300 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'chanhdien-soak-'));
const CHANNELS = ['kenh1', 'kenh2', 'kenh3', 'kenh4'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BROWSERS = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const browserPath = BROWSERS.find(p => fs.existsSync(p));
if (!browserPath) { console.error('Không tìm thấy Chrome/Edge (đặt biến CHROME=đường dẫn)'); process.exit(1); }

const server = spawn(process.execPath, [path.join(here, '..', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA }, stdio: ['ignore', 'pipe', 'inherit'] });
let ttsErrors = 0;
server.stdout.on('data', d => { for (const l of String(d).split('\n')) if (/TTS lỗi|Lỗi/.test(l)) { ttsErrors++; if (ttsErrors <= 5) console.log('  server:', l.trim()); } });
await sleep(1500);
const profile = path.join(DATA, 'chrome');
const browser = spawn(browserPath, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, '--mute-audio', '--no-first-run',
  '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
let cleaned = false;
async function cleanup(code){
  if (cleaned) return; cleaned = true;
  browser.kill(); server.kill(); await sleep(800);
  try { fs.rmSync(DATA, { recursive: true, force: true }); } catch {}
  process.exit(code);
}
process.on('SIGINT', () => cleanup(130));

async function json(url, method = 'GET'){ for (let i = 0; i < 40; i++) { try { return await (await fetch(url, { method })).json(); } catch { await sleep(250); } } throw new Error('không kết nối được ' + url); }
function cdp(wsUrl){
  const ws = new WebSocket(wsUrl), pending = new Map(); let id = 0;
  ws.on('message', d => { const m = JSON.parse(d); pending.get(m.id)?.(m); pending.delete(m.id); });
  const ready = new Promise(r => ws.once('open', r));
  const call = async (method, params) => {
    await ready; const n = ++id; ws.send(JSON.stringify({ id: n, method, params }));
    return Promise.race([new Promise(r => pending.set(n, r)), sleep(8000).then(() => ({}))]);
  };
  return { ready, call, eval: async expr => (await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value };
}
function control(ch){
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?role=control&ch=${ch}`, { origin: `http://localhost:${PORT}`, headers: { host: `localhost:${PORT}` } });
  return new Promise(r => ws.once('open', () => r(cmd => ws.send(JSON.stringify({ t: 'ctl', ...cmd })))));
}

try {
  // each overlay in its own window, like the real setup: a background tab would not render frames
  const root = cdp((await json(`http://127.0.0.1:${DBG}/json/version`)).webSocketDebuggerUrl);
  const pages = [];
  for (const ch of CHANNELS) {
    const url = `http://localhost:${PORT}/live/overlay.html?ch=${ch}`;
    await root.call('Target.createTarget', { url, newWindow: true, width: 540, height: 960 });
    await sleep(500);
    const t = (await json(`http://127.0.0.1:${DBG}/json/list`)).find(x => x.url === url);
    const c = cdp(t.webSocketDebuggerUrl); await c.ready; pages.push({ ch, c });
  }
  await sleep(3000);
  for (const ch of CHANNELS) {
    const send = await control(ch);
    send({ cmd: 'settings', settings: { chantEveryMin: 2, mindfulEveryMin: 3 } });
    send({ cmd: 'bots', on: true, n: 40, pace: 'slow' });
  }
  console.log(`Chạy thử ${MINUTES} phút: ${CHANNELS.length} kênh, 40 bot mỗi kênh, tụng kinh mỗi 2 phút, nhắc thiền mỗi 3 phút\n`);
  console.log('phút | server RSS/heap MB | overlay heap MB (từng kênh)       | âm thanh | fps');
  const rows = [];
  const probe = `({ heap: Math.round(performance.memory.usedJSHeapSize/1048576*10)/10, audio: typeof audioOn!=='undefined' && audioOn && AC.state==='running' })`;
  for (let m = 0; m <= MINUTES; m++) {
    if (m) await sleep(60_000);
    const h = await json(`http://127.0.0.1:${PORT}/health`);
    const ov = [];
    for (const p of pages) {
      const v = await p.c.eval(probe) || {};
      const fps = await p.c.eval(`(async () => { let n=0; const t0=performance.now(); await new Promise(r => { const f=()=>{ n++; if (performance.now()-t0<1000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); }); return n; })()`).catch(() => 0);
      ov.push({ ...v, fps });
    }
    rows.push({ m, rss: h.rssMB, heap: h.heapMB, ov });
    console.log(`${String(m).padStart(4)} | ${String(h.rssMB).padStart(6)} / ${String(h.heapMB).padEnd(9)} | ${ov.map(o => String(o.heap).padStart(6)).join(' ')} | ${ov.every(o => o.audio) ? 'bật' : 'TẮT'}      | ${ov.map(o => o.fps).join(' ')}`);
  }
  // so sánh nửa sau với nửa đầu để bỏ qua giai đoạn khởi động
  const half = Math.floor(rows.length / 2), avg = (a, f) => a.reduce((s, r) => s + f(r), 0) / a.length;
  const growHeap = avg(rows.slice(half), r => r.heap) - avg(rows.slice(1, half + 1), r => r.heap);
  const growOv = avg(rows.slice(half), r => Math.max(...r.ov.map(o => o.heap))) - avg(rows.slice(1, half + 1), r => Math.max(...r.ov.map(o => o.heap)));
  console.log(`\nTăng trung bình nửa sau so với nửa đầu: server heap ${growHeap.toFixed(1)} MB, overlay heap ${growOv.toFixed(1)} MB · lỗi trong log server: ${ttsErrors}`);
  await cleanup(0);
} catch (e) {
  console.error('Lỗi chạy thử:', e); await cleanup(1);
}
