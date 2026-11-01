// Kiểm tra nhanh toàn bộ server: chạy `npm test` trong thư mục live.
// Dựng server thật trên cổng riêng với thư mục dữ liệu tạm, nói chuyện qua HTTP + WebSocket như overlay/bảng điều khiển.
// Phần giọng đọc cần Internet (dịch vụ Edge TTS); không có mạng thì các bước đó chỉ cảnh báo.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { tidyName } from '../lines.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3900 + Math.floor(Math.random() * 90);
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'chanhdien-test-'));
const BASE = `http://127.0.0.1:${PORT}`;
const PUSH = path.join(DATA, 'phat');
let server, failed = 0, warned = 0;
const ok = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failed++; };
const warn = msg => { console.log(`  ! ${msg}`); warned++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function start(){
  server = spawn(process.execPath, [path.join(here, '..', 'server.mjs')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: DATA, PUSH_STATUS_DIR: PUSH }, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('server không khởi động')), 15000);
    server.stdout.on('data', d => { if (String(d).includes('Server chạy')) { clearTimeout(t); res(); } });
    server.stderr.on('data', d => process.stderr.write(d));
  });
}
async function stop(){ if (!server) return; const s = server; server = null; s.kill(); await new Promise(r => s.once('exit', r)); }
// node:http instead of fetch: fetch refuses to set a custom Host header
function status(p, headers = {}){
  return new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path: p, headers: { host: `localhost:${PORT}`, ...headers } }, r => { r.resume(); r.on('end', () => res(r.statusCode)); }).on('error', rej));
}
function client(role, ch, origin = `http://localhost:${PORT}`){
  const q = ch ? `role=${role}&ch=${ch}` : `role=${role}`;
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?${q}`, { origin, headers: { host: `localhost:${PORT}` } });
  ws.msgs = [];
  ws.on('message', d => ws.msgs.push(JSON.parse(d)));
  ws.ready = new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); ws.once('unexpected-response', (_, r) => rej(new Error('HTTP ' + r.statusCode))); });
  ws.cmd = (cmd, extra = {}) => ws.send(JSON.stringify({ t: role === 'dashboard' ? 'dash' : 'ctl', cmd, ...extra }));
  ws.wait = async (pred, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { const m = ws.msgs.find(pred); if (m) return m; await sleep(50); } return null; };
  return ws;
}

try {
  console.log(`Server thử nghiệm: cổng ${PORT}, dữ liệu ${DATA}`);
  await start();

  console.log('HTTP · danh sách trắng file tĩnh');
  ok(await status('/') === 200, 'trang chủ là bảng tổng');
  ok(await status('/live/overlay.html') === 200 && await status('/assets/hall.jpg') === 200, 'overlay và ảnh phục vụ được');
  for (const p of ['/live/server.mjs', '/live/lines.mjs', '/live/package.json', '/live/data/channels.json', '/live/%2e%2e/LICENSE', '/.git/config', '/live/node_modules/ws/package.json', '/live/blocklist.txt', '/tts/kenh1/../x.mp3'])
    ok(await status(p) === 404, `chặn ${p}`);
  ok(await status('/live/overlay.html', { host: 'evil.example:' + PORT }) === 421, 'Host lạ bị từ chối (chống DNS rebinding)');
  const health = await (await fetch(BASE + '/health')).json();
  ok(health.ok && health.channels.length === 4, 'mặc định có 4 kênh, /health trả trạng thái');

  console.log('Tên người xem');
  ok(tidyName('𝓜𝓲𝓷𝓱 𝓣𝓪̂𝓶') === 'Minh Tâm' && tidyName('Ｍｉｎｈ') === 'Minh', 'tên kiểu chữ lạ về chữ thường');
  ok(tidyName('Nguyễn Thị Diệu Hạnh') === 'Nguyễn Thị Diệu Hạnh' && tidyName('𒐫𒐫') === '', 'giữ nguyên tiếng Việt, bỏ chữ hình nêm');

  console.log('Trạng thái đẩy luồng (VPS Linux)');
  fs.mkdirSync(PUSH, { recursive: true });
  const t = Math.floor(Date.now() / 1000);
  fs.writeFileSync(path.join(PUSH, 'kenh1.json'), JSON.stringify({ at: t, state: 'live', since: t - 60, restarts: 2, fps: 29.9, kbps: 3120.5, speed: 1, host: 'push.example', size: '720x1280' }));
  fs.writeFileSync(path.join(PUSH, 'kenh2.json'), JSON.stringify({ at: 'x', state: '<img src=x>', fps: 'abc', host: 'h'.repeat(500) }));
  fs.writeFileSync(path.join(PUSH, 'kenh3.json'), '{hỏng');
  const hp = Object.fromEntries((await (await fetch(BASE + '/health')).json()).channels.map(c => [c.id, c.push]));
  ok(hp.kenh1?.state === 'live' && hp.kenh1.fps === 29.9 && hp.kenh1.since === (t - 60) * 1000 && hp.kenh1.restarts === 2, 'đọc được trạng thái phát của kênh 1');
  ok(hp.kenh2?.state === 'starting' && hp.kenh2.fps === null && hp.kenh2.at === null && hp.kenh2.host.length === 80, 'giá trị lạ trong file bị lọc');
  ok(hp.kenh3 === null && hp.kenh4 === null, 'file hỏng hoặc không có file: không có dòng đẩy luồng');

  console.log('WebSocket · nguồn gốc và vai trò');
  const evil = client('control', 'kenh1', 'https://evil.example');
  ok(await evil.ready.then(() => false, () => true), 'trang web lạ không mở được kết nối điều khiển');
  const dash = client('dashboard'); await dash.ready;
  const c1 = client('control', 'kenh1'), c2 = client('control', 'kenh2');
  const o1 = client('overlay', 'kenh1'), o2 = client('overlay', 'kenh2'), o3 = client('overlay', 'kenh3'), c3 = client('control', 'kenh3');
  await Promise.all([c1.ready, c2.ready, o1.ready, o2.ready, o3.ready, c3.ready]);
  ok((await o1.wait(m => m.t === 'state'))?.music?.length >= 1, 'overlay nhận danh sách nhạc');

  console.log('Tách biệt giữa các kênh');
  c1.cmd('chat', { name: 'Minh An', text: 'Nam mô A Di Đà Phật' });
  ok(!!await o1.wait(m => m.t === 'chat' && m.name === 'Minh An'), 'bình luận kênh 1 lên overlay kênh 1');
  await sleep(300);
  ok(!o2.msgs.some(m => m.t === 'chat'), 'overlay kênh 2 không nhận bình luận của kênh 1');
  o1.send(JSON.stringify({ t: 'ctl', cmd: 'fill', n: 10 }));
  await sleep(400);
  ok(!o1.msgs.some(m => m.t === 'join' && m.v.demo), 'overlay không gửi lệnh điều khiển được');

  console.log('Lọc chữ trên màn hình');
  c1.cmd('chat', { name: 'Spam', text: 'vào zalo 0912 345 678 nhận quà' });
  c1.cmd('chat', { name: 'Ai đó', text: 'xem www.lua-dao.com nhé' });
  c1.cmd('chat', { name: 'vcl', text: 'Nam mô' });
  c1.cmd('chat', { name: 'kín Ib Tele : @trang267', text: '4OO/1h nhaaa' });            // mẫu spam bắt được trên LIVE thật
  await sleep(500);
  ok(!o1.msgs.some(m => m.t === 'chat' && /zalo|lua-dao|4OO/.test(m.text)), 'link, số điện thoại, kiểu rao "400/1h" không hiện thành bong bóng');
  ok(o1.msgs.filter(m => m.t === 'join' && m.v.name === 'Khách').length === 2, 'tên bậy, tên rao "ib tele" được thay bằng "Khách"');

  console.log('Câu nói tự động (cần Internet)');
  c3.cmd('chat', { name: 'Thu Hà', text: 'Cầu cho mẹ con mau khỏi bệnh' });
  const pr = await o3.wait(m => m.t === 'tts' && m.tag === 'prayer', 20000);
  if (pr) ok(/Thu Hà/.test(pr.text) && !/khỏi bệnh$/.test(pr.text), `đáp lời cầu an theo chủ đề: "${pr.text}"`); else warn('không nhận được lời cầu an (mạng tới Edge TTS?)');
  c3.cmd('gift', { name: 'Thu Hà', gift: 'Hoa hồng', diamonds: 1, count: 1 });
  c3.cmd('gift', { name: 'Bảo Ngọc', gift: 'Đèn hoa sen', diamonds: 30, count: 1 });
  const th = await o3.wait(m => m.t === 'tts' && m.tag === 'thank', 25000);
  if (th) ok(/Thu Hà/.test(th.text) && /Bảo Ngọc/.test(th.text), `gom quà liên tiếp thành một câu cảm ơn: "${th.text}"`); else warn('không nhận được lời cảm ơn quà');
  if (th) ok(!/công đức|phước|gia hộ|phù hộ/i.test(th.text), 'lời cảm ơn quà không hứa công đức, phước báu');
  const wl = await o3.wait(m => m.t === 'tts' && m.tag === 'welcome', 40000);
  if (wl) ok(/Thu Hà|Bảo Ngọc/.test(wl.text), `chào người mới: "${wl.text}"`); else warn('không nhận được lời chào người mới');
  if (pr) { const f = fs.readdirSync(path.join(DATA, 'tts', 'kenh3')); ok(f.length >= 1 && f.every(x => /^tts_\d+_\d+\.mp3$/.test(x)), 'file giọng đọc nằm trong thư mục riêng của kênh 3'); ok(await status(pr.url) === 200, 'overlay tải được file giọng đọc'); }

  console.log('Khóa giả lập khi nối LIVE thật');
  c2.cmd('fill', { n: 5 });
  await o2.wait(m => m.t === 'join' && m.v.demo);
  c2.cmd('connect', { uniqueId: '@aaaa' + Math.random().toString(36).slice(2, 12) });   // tài khoản gần như chắc chắn không tồn tại
  ok(!!await o2.wait(m => m.t === 'leave' && /^demo_/.test(m.id)), 'bấm Kết nối thì người mẫu được dọn khỏi màn hình');
  const n = o2.msgs.length;
  c2.cmd('fill', { n: 20 }); c2.cmd('gift', { name: 'Giả', gift: 'Hoa hồng', diamonds: 1 }); c2.cmd('bots', { on: true, n: 5 });
  await sleep(600);
  ok(!o2.msgs.slice(n).some(m => m.t === 'join' || m.t === 'gift'), 'không bơm được người mẫu, quà giả, bot khi đang nối TikTok');
  const st = await c2.wait(m => m.t === 'tiktok' && m.status !== 'idle');
  ok(!!st, `trạng thái kết nối: ${st?.status} · ${st?.text}`);
  c2.cmd('disconnect');
  ok(!!await c2.wait(m => m.t === 'tiktok' && m.status === 'idle'), 'Ngắt đưa kênh về trạng thái nghỉ');

  console.log('Bảng tổng · thêm, đổi tên, xóa kênh, lưu cấu hình');
  dash.cmd('add');
  ok(!!await dash.wait(m => m.t === 'dash' && m.channels.length === 5), 'thêm kênh thứ 5');
  dash.cmd('rename', { ch: 'kenh5', name: 'Kênh Đêm' });
  c1.cmd('settings', { settings: { title: 'Thiền Viện Ánh Trăng', chantEveryMin: 999, voice: 'evil-voice', moChantOnly: false } });
  await sleep(1500);
  dash.msgs.length = 0; dash.cmd('remove', { ch: 'kenh4' });
  ok(!!await dash.wait(m => m.t === 'dash' && m.channels.length === 4 && !m.channels.some(c => c.id === 'kenh4')), 'xóa kênh 4');
  await sleep(1200);
  for (const w of [dash, c1, c2, c3, o1, o2, o3]) w.close();
  await stop(); await start();
  const after = client('control', 'kenh1'); await after.ready;
  const s = (await after.wait(m => m.t === 'state')).settings;
  ok(s.title === 'Thiền Viện Ánh Trăng' && s.moChantOnly === false, 'cài đặt còn nguyên sau khi khởi động lại');
  ok(s.chantEveryMin === 60 && s.voice === 'vi-VN-NamMinhNeural', 'cài đặt sai bị kẹp về giới hạn');
  const d2 = client('dashboard'); await d2.ready;
  const list = (await d2.wait(m => m.t === 'dash')).channels;
  ok(list.some(c => c.id === 'kenh5' && c.name === 'Kênh Đêm') && !list.some(c => c.id === 'kenh4'), 'danh sách kênh còn nguyên sau khi khởi động lại');
  after.close(); d2.close();
} catch (e) {
  console.error('Lỗi test:', e); failed++;
} finally {
  await stop();
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log(failed ? `\n${failed} bước HỎNG` : `\nTất cả đều đạt${warned ? ` (${warned} cảnh báo)` : ''}`);
  process.exit(failed ? 1 : 0);
}
