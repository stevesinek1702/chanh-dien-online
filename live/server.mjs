// Chánh Điện Tịnh Tâm — live server (đa kênh)
// Chạy trên máy phát. Một tiến trình phục vụ nhiều kênh TikTok LIVE cùng lúc: mỗi kênh có overlay 9:16,
// bảng điều khiển, danh sách người ngồi, hàng đợi giọng đọc và kết nối TikTok riêng, tự kết nối lại khi rớt.
//
//   cd live && npm ci && npm start        → bảng tổng http://localhost:3000/
//
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { THANK, WELCOME, FOLLOW, SHARE, PRAYER_GROUP, MINDFUL, INVITE, joinNames, fill, picker, prayerTopic } from './lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');            // repo root: serves /assets, /live
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const TTS_ROOT = path.join(DATA_DIR, 'tts');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const BLOCKLIST_FILE = path.join(__dirname, 'blocklist.txt');
const PORT = +process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const PUSH_DIR = process.env.PUSH_STATUS_DIR ? path.resolve(process.env.PUSH_STATUS_DIR) : null;   // VPS Linux: deploy/linux/phat-kenh.sh ghi vào đây
const MAX_CHANNELS = 8;

const WAIT_POLL_MS = 90_000;         // chưa LIVE: hỏi lại sau 90 giây (hỏi thẳng TikTok, không tốn lượt ký Euler)
const RECONNECT_MS = 20_000;         // rớt kết nối giữa chừng: thử lại sau 20 giây
const CONNECT_GAP_MS = 15_000;       // các kênh không kết nối dồn cùng lúc (tránh giới hạn của máy chủ ký)
const SILENCE_MS = 10 * 60_000;      // đã kết nối mà 10 phút không có dữ liệu nào: coi như chết, nối lại
const TTS_TIMEOUT_MS = 20_000;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });
fs.rmSync(TTS_ROOT, { recursive: true, force: true });
fs.mkdirSync(TTS_ROOT, { recursive: true });
const serverStartedAt = Date.now();

/* ------------------------------------------------------------- helpers */
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errText = e => String(e?.message || e?.info || e?.exception?.message || e || 'lỗi không rõ').slice(0, 300);
const normUser = s => {
  const u = String(s || '').trim().replace(/^.*tiktok\.com\/@?/i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return /^[\w.]{1,30}$/.test(u) ? u : '';
};

// Nhật ký ra file theo ngày, giữ 14 ngày: chạy 24h cần xem lại được chuyện gì đã xảy ra lúc vắng mặt.
for (const f of fs.readdirSync(LOG_DIR)) {
  try { if (now() - fs.statSync(path.join(LOG_DIR, f)).mtimeMs > 14 * 86_400_000) fs.unlinkSync(path.join(LOG_DIR, f)); } catch {}
}
function writeLog(line){
  const d = new Date(), day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  fs.appendFile(path.join(LOG_DIR, `server-${day}.log`), `${d.toISOString()} ${line}\n`, () => {});
  console.log(line);
}

/* ------------------------------------------------------------- lọc chữ */
// Bình luận và tên người xem được vẽ lên video của kênh, nên chữ bẩn, link, số điện thoại bị ẩn.
// Thêm từ riêng vào live/blocklist.txt (mỗi dòng một từ/cụm từ), server tự đọc lại khi file đổi.
const BUILTIN_BLOCK = ['địt', 'đụ', 'đm', 'đmm', 'dm', 'dmm', 'vcl', 'vkl', 'clm', 'lồn', 'buồi', 'cặc', 'đéo', 'đĩ', 'fuck', 'shit', 'bitch', 'porn', 'sex', 'xxx',
  'tele', 'ib', 'inbox', 'sdt', 'zl', 'zalo'];      // kiểu rao "ib tele", "ib zalo" hay gặp trên LIVE Việt
const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|vn|org|io|me|xyz|top|link|shop|site|online)\b|t\.me\/|zalo|telegram)/i;
const PHONE_RE = /(\d[\s.-]?){9,}/;
const PRICE_RE = /[\do]{2,}\s*k?\s*\/\s*\d*\s*(h|giờ|tiếng|đêm|lần|shot)\b/i;   // "400/1h", "5OOk/đêm": rao bán dâm
let BLOCK_WORDS = new Set(), BLOCK_PHRASES = [];
function loadBlocklist(){
  const items = [...BUILTIN_BLOCK];
  try {
    for (const line of fs.readFileSync(BLOCKLIST_FILE, 'utf8').split(/\r?\n/)) {
      const w = line.trim().toLowerCase().normalize('NFC');
      if (w && !w.startsWith('#')) items.push(w);
    }
  } catch {}
  BLOCK_WORDS = new Set(items.filter(w => !w.includes(' ')));
  BLOCK_PHRASES = items.filter(w => w.includes(' '));
}
loadBlocklist();
fs.watchFile(BLOCKLIST_FILE, { interval: 5000 }, loadBlocklist);
function isClean(s){
  const t = String(s || '').toLowerCase().normalize('NFC');
  if (LINK_RE.test(t) || PHONE_RE.test(t) || PRICE_RE.test(t)) return false;
  if (BLOCK_PHRASES.some(p => t.includes(p))) return false;
  return !t.split(/[^\p{L}\p{N}]+/u).some(w => BLOCK_WORDS.has(w));
}
const spoken = s => String(s).replace(/[_@.]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim() || 'bạn';

/* ------------------------------------------------------------- nội dung */
const DEFAULT_SETTINGS = {
  title: 'Chánh Điện Tịnh Tâm',
  subtitle: 'Nam Mô A Di Đà Phật',
  voice: 'vi-VN-NamMinhNeural',      // or vi-VN-HoaiMyNeural
  pitch: -18,                        // Hz
  rate: -20,                         // %
  music: true,
  mo: true, moChantOnly: true, moBpm: 52,   // mõ đi theo lúc tụng kinh, ngoài giờ tụng là thiền tĩnh lặng
  autoChant: true, chantEveryMin: 3, dedicateNames: true,
  thankVoice: true, thankMin: 1,     // cảm ơn quà bằng giọng đọc, không gắn với cầu nguyện hay công đức
  welcomeVoice: true,                // chào người mới bình luận lần đầu
  prayerReplies: true,               // đáp lời cầu an cho bình luận có ý cầu nguyện, ai cũng như nhau
  socialVoice: true,                 // cảm ơn theo dõi, chia sẻ
  mindfulEveryMin: 7,                // lời nhắc thiền giữa các thời tụng (0 = tắt)
  hallEveryMin: 10,                  // có ảnh trong assets/gian-tho thì đổi gian thờ mỗi chừng ấy phút (0 = không đổi)
  seatMode: 'auto',                // auto | 24 | 36 | 64 | 100 | 144 | 200
  joinOnEnter: false,                // also seat viewers who only enter the room
  aiNote: true,                      // dòng nhỏ ghi rõ hình, nhạc, giọng đọc do AI tạo
};
// Only known keys, right types, sane ranges: the panel is local, but nothing from the socket is trusted blindly.
const SETTING_RULES = {
  title: v => String(v).slice(0, 40), subtitle: v => String(v).slice(0, 60),
  voice: (v, cur) => ['vi-VN-NamMinhNeural', 'vi-VN-HoaiMyNeural'].includes(v) ? v : cur,
  pitch: v => clamp(v, -50, 50), rate: v => clamp(v, -50, 50), moBpm: v => clamp(v, 20, 120),
  chantEveryMin: v => clamp(v, 1, 60), thankMin: v => clamp(v, 1, 50000), mindfulEveryMin: v => clamp(v, 0, 60), hallEveryMin: v => clamp(v, 0, 120),
  music: Boolean, mo: Boolean, moChantOnly: Boolean, autoChant: Boolean, dedicateNames: Boolean,
  thankVoice: Boolean, welcomeVoice: Boolean, prayerReplies: Boolean, socialVoice: Boolean, joinOnEnter: Boolean, aiNote: Boolean,
  seatMode: v => ['auto', ...CAPS.map(String)].includes(String(v)) ? String(v) : 'auto',
};
function applySettings(target, o){ for (const [k, fn] of Object.entries(SETTING_RULES)) if (o && k in o) target[k] = fn(o[k], target[k]); }

// Một vòng thời khóa ngắn theo nghi thức tụng niệm phổ thông: khai kinh → Tâm Kinh → niệm Phật → sám nguyện → hồi hướng.
const CHANTS = [
  { title: 'Kệ Khai Kinh', text: 'Vô thượng thậm thâm vi diệu pháp, bách thiên vạn kiếp nan tao ngộ. Ngã kim kiến văn đắc thọ trì, nguyện giải Như Lai chân thật nghĩa.' },
  { title: 'Bát Nhã Tâm Kinh', text: 'Quán Tự Tại Bồ Tát hành thâm Bát Nhã Ba La Mật Đa thời, chiếu kiến ngũ uẩn giai không, độ nhất thiết khổ ách.' },
  { title: 'Bát Nhã Tâm Kinh', text: 'Xá Lợi Tử, sắc bất dị không, không bất dị sắc, sắc tức thị không, không tức thị sắc. Thọ tưởng hành thức diệc phục như thị.' },
  { title: 'Bát Nhã Tâm Kinh', text: 'Yết đế yết đế, ba la yết đế, ba la tăng yết đế, bồ đề tát bà ha.' },
  { title: 'Niệm Phật', text: 'Nam mô A Di Đà Phật. Nguyện sanh Tây phương Tịnh độ trung, cửu phẩm liên hoa vi phụ mẫu. Hoa khai kiến Phật ngộ vô sanh, bất thối Bồ Tát vi bạn lữ.' },
  { title: 'Niệm Bồ Tát', text: 'Nam mô Đại Bi Quán Thế Âm Bồ Tát. Nguyện cho tất cả chúng sanh thân tâm an lạc, tai qua nạn khỏi.' },
  { title: 'Sám Nguyện', text: 'Nguyện tiêu tam chướng trừ phiền não, nguyện đắc trí huệ chân minh liễu. Phổ nguyện tội chướng tất tiêu trừ, thế thế thường hành Bồ Tát đạo.' },
  { title: 'Hồi Hướng', text: 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật. Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.', dedicate: true },
];

/* skins: sprites that exist in /assets. Walking strips exist for man / woman / granny. */
// A comment changes the outfit only when it IS the keyword (≤ 3 words), so "Nam mô A Di Đà Phật" never reads as "nam".
const SKIN_WORDS = [
  ['master', ['cao tăng','cao tang']], ['monk', ['sư','su','sư thầy','su thay','thầy','thay']], ['nun', ['ni','ni cô','ni co','sư cô','su co']],
  ['child', ['tiểu','tieu','chú tiểu','chu tieu','bé','be']], ['granny', ['bà','ba','áo nâu','ao nau','cụ','cu']],
  ['woman', ['nữ','nu','chị','chi','gái','gai']], ['man', ['nam','anh','trai']],
];
function skinFromText(t){
  const w = String(t).toLowerCase().normalize('NFC').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!w || w.split(' ').length > 3) return null;
  for (const [skin, words] of SKIN_WORDS) if (words.some(k => w === k || w.startsWith(k + ' '))) return skin;
  return null;
}
const DEFAULT_SKINS = ['man', 'woman', 'woman', 'man', 'granny'];
const CAPS = [24, 36, 64, 100, 144, 200];
const MAX_SEATS = CAPS.at(-1);
const DEMO_NAMES = ['Diệu Hạnh','Minh Tâm','Thiện Đức','Huệ An','Tịnh Nhã','Quảng Trí','Chơn Như','Pháp Hỷ','Nguyên Thanh','Tâm Đăng','Diệu Liên','Trí Hải','Phước Lộc','Hạnh Nguyện','Như Ý','Bảo Châu','Thanh Lương','Từ Tâm','An Lạc','Giác Hoa','Tuệ Minh','Liên Hương','Thu Hà','Ngọc Lan','Đức Anh','Hải Đăng','Mai Anh','Phương Thảo','Trung Kiên','Quang Huy','Bảo Ngọc','Diệu Linh'];
const BOT_LINES = ['Nam mô A Di Đà Phật', 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật', 'Cầu cho gia đình bình an', 'Con xin thành tâm sám hối', 'nữ', 'nam', 'bà',
  'Nguyện cầu cha mẹ mạnh khỏe', 'Mô Phật, an lạc quá', 'Chúc mọi người một ngày bình an', 'sư', 'Cầu công việc hanh thông',
  'Cầu cho mẹ con mau khỏi bệnh', 'Mai con đi thi, xin cầu cho con bình tĩnh', 'Cầu siêu cho ông nội con mới mất', 'Nghe chuông thấy nhẹ lòng ghê', 'ni', 'tiểu'];

// Hàng chờ câu nói tự động. Lời tụng và lời nhắc thiền đi thẳng vào hàng đợi giọng đọc; các câu phản hồi người xem
// chỉ được nói khi giọng đang rảnh, theo thứ tự ưu tiên và nhịp tối thiểu, nên LIVE đông người cũng không bị nói dồn.
const VOICE_ORDER = ['thank', 'prayer', 'follow', 'welcome', 'share'];
const VOICE_GAP = { thank: 0, prayer: 40_000, follow: 20_000, welcome: 25_000, share: 30_000 };
const VOICE_TTL = { thank: 5 * 60_000, prayer: 10 * 60_000, follow: 3 * 60_000, welcome: 2 * 60_000, share: 3 * 60_000 };
const VOICE_SETTING = { thank: 'thankVoice', prayer: 'prayerReplies', follow: 'socialVoice', welcome: 'welcomeVoice', share: 'socialVoice' };

/* --------------------------------------------------------------- TikTok */
let TikTokLib = null;
// Mỗi lần kết nối tốn một lượt ký của Euler Stream (gói miễn phí giới hạn theo IP), nên các kênh xếp hàng cách nhau.
let lastConnectAt = 0, connectChain = Promise.resolve();
function throttledConnect(fn){
  const run = connectChain.then(async () => {
    const wait = lastConnectAt + CONNECT_GAP_MS - now();
    if (wait > 0) await sleep(wait);
    lastConnectAt = now();
    return fn();
  });
  connectChain = run.catch(() => {});
  return run;
}
// tiktok-live-connector 2.5 (proto v3) names the username `displayId`; older versions used `uniqueId`
const uidOf = u => String(u?.displayId || u?.uniqueId || u?.id || u?.userId || '');
const nm = u => u?.nickname || u?.displayId || u?.uniqueId || 'Khách';
const av = u => u?.avatarThumb?.urlList?.[0] || u?.profilePicture?.urlList?.[0] || u?.profilePicture?.url?.[0] || u?.avatarThumb?.url?.[0] || '';

/* -------------------------------------------------------------- channel */
const channels = new Map();
const SIM_CMDS = new Set(['chat', 'gift', 'fill', 'bots']);

class Channel {
  constructor(cfg = {}){
    this.id = cfg.id;
    this.name = String(cfg.name || cfg.id).slice(0, 30);
    this.uniqueId = normUser(cfg.uniqueId);
    this.want = !!cfg.want && !!this.uniqueId;          // người dùng muốn kênh này đang nối TikTok
    this.settings = { ...DEFAULT_SETTINGS };
    applySettings(this.settings, cfg.settings);
    this.viewers = new Map();          // id -> { id, name, skin, avatar, coins, joinedAt, lastAt, lastText, lastTextAt, demo }
    this.log = [];
    this.startedAt = now();
    this.stats = { comments: 0, hidden: 0, gifts: 0, coins: 0, likes: 0, follows: 0, viewerCount: 0, connects: 0 };
    this.tt = { status: 'idle', text: 'Chưa kết nối' };
    this.conn = null; this.checking = false; this.retryTimer = null; this.nextRetryAt = 0;
    this.failures = 0; this.lastEventAt = 0; this.connectedAt = 0;
    this.ttsQueue = []; this.ttsBusy = false; this.ttsSeq = 0; this.ttsDir = path.join(TTS_ROOT, this.id);
    this.pending = Object.fromEntries(VOICE_ORDER.map(k => [k, []]));
    this.lastSaid = Object.fromEntries(VOICE_ORDER.map(k => [k, 0]));
    this.pick = picker();
    this.chantIdx = Math.floor(Math.random() * CHANTS.length); this.chantTimer = null; this.mindfulTimer = null; this.botTimer = null;
    this.voiceTimer = setInterval(() => this.tickVoice(), 1500);
    fs.mkdirSync(this.ttsDir, { recursive: true });
    this.scheduleChant();
    if (this.want) this.schedule(1000);
  }
  toJSON(){ return { id: this.id, name: this.name, uniqueId: this.uniqueId, want: this.want, settings: this.settings }; }

  /* ---- output ---- */
  broadcast(msg, role){
    const s = JSON.stringify(msg);
    for (const c of wss.clients) if (c.readyState === 1 && c.ch === this.id && (!role || c.role === role)) c.send(s);
  }
  addLog(s){
    const line = `[${new Date().toLocaleTimeString('vi-VN')}] ${s}`;
    this.log.push(line); if (this.log.length > 300) this.log.shift();
    this.broadcast({ t: 'log', line }, 'control');
    writeLog(`[${this.id}] ${s}`);
  }
  overlayClients(){ return [...wss.clients].filter(c => c.readyState === 1 && c.ch === this.id && c.role === 'overlay'); }
  capacity(){ if (this.settings.seatMode !== 'auto') return +this.settings.seatMode; const n = this.viewers.size; return CAPS.find(c => n <= c) || MAX_SEATS; }
  pub(v){ return { id: v.id, name: v.name, skin: v.skin, avatar: v.avatar || '', coins: v.coins, demo: !!v.demo }; }
  snapshot(){
    return { t: 'state', ch: this.id, name: this.name, uniqueId: this.uniqueId, want: this.want, settings: this.settings,
      viewers: [...this.viewers.values()].map(v => this.pub(v)), cap: this.capacity(), startedAt: this.startedAt,
      tiktok: this.tt, music: musicList(this.id), bell: mp3s('chuong', this.id)[0] || null,
      halls: ['/assets/hall.jpg', ...mp3s('gian-tho', this.id, /\.(jpe?g|png|webp)$/i)], bots: !!this.botTimer };
  }
  summary(){
    const ov = this.overlayClients();
    return { id: this.id, name: this.name, uniqueId: this.uniqueId, want: this.want, status: this.tt.status, text: this.tt.text,
      seated: this.viewers.size, stats: this.stats, overlays: ov.length, audio: ov.filter(c => c.audio).length,
      connectedAt: this.connectedAt, lastEventAgo: this.conn ? now() - this.lastEventAt : null, nextRetryAt: this.nextRetryAt,
      bots: !!this.botTimer, title: this.settings.title, push: pushStatus(this.id) };
  }
  setStatus(status, text){
    this.tt = { status, text, uniqueId: this.uniqueId };
    this.broadcast({ t: 'tiktok', ...this.tt });
    dashDirty = true;
  }

  /* ---- seats ---- */
  seat(id, name, opts = {}){
    let v = this.viewers.get(id);
    if (v){ v.lastAt = now(); if (opts.avatar) v.avatar = opts.avatar; return { v, isNew: false }; }
    if (this.viewers.size >= MAX_SEATS){               // full: the longest-quiet non-donor stands up
      const quiet = [...this.viewers.values()].filter(x => x.coins === 0).sort((a, b) => a.lastAt - b.lastAt)[0];
      if (!quiet) return { v: null, isNew: false };
      this.viewers.delete(quiet.id); this.broadcast({ t: 'leave', id: quiet.id });
    }
    const shown = isClean(name) ? String(name || id) : 'Khách';
    v = { id, name: shown.slice(0, 18), skin: opts.skin || DEFAULT_SKINS[this.viewers.size % DEFAULT_SKINS.length],
          avatar: opts.avatar || '', coins: 0, joinedAt: now(), lastAt: now(), demo: !!opts.demo };
    this.viewers.set(id, v);
    this.broadcast({ t: 'join', v: this.pub(v), cap: this.capacity() });
    return { v, isNew: true };
  }
  clearSimulation(){
    if (this.botTimer){ clearInterval(this.botTimer); this.botTimer = null; this.broadcast({ t: 'bots', on: false }, 'control'); }
    let n = 0;
    for (const v of [...this.viewers.values()]) if (v.demo || v.id.startsWith('sim_')) { this.viewers.delete(v.id); this.broadcast({ t: 'leave', id: v.id }); n++; }
    if (n) this.addLog(`Đã dọn ${n} người mẫu / bot trước khi nối LIVE thật`);
  }

  /* ---- events in ---- */
  onChat(id, name, text, avatar){
    if (!id) return;
    text = String(text || '').slice(0, 120);
    this.stats.comments++;
    const clean = isClean(text);
    const want = clean ? skinFromText(text) : null;
    const { v, isNew } = this.seat(id, name, { avatar, skin: want || undefined });
    if (!v) return;
    if (!isNew && want && want !== v.skin){ v.skin = want; this.broadcast({ t: 'skin', id, skin: want }); }
    if (!clean){ this.stats.hidden++; return; }
    v.lastText = text; v.lastTextAt = now();
    this.broadcast({ t: 'chat', id, name: v.name, text });
    if (isNew && v.name !== 'Khách') this.enqueue('welcome', { name: v.name });
    const topic = !want && prayerTopic(text);
    if (topic && v.name !== 'Khách' && !(v.prayedAt > now() - 10 * 60_000)){ v.prayedAt = now(); this.enqueue('prayer', { name: v.name, topic }); }
  }
  onSocial(kind, user){
    const id = uidOf(user); if (!id) return;
    const name = isClean(nm(user)) ? nm(user) : '';
    if (name) this.enqueue(kind, { name: name.slice(0, 18) });
  }
  onGift(id, name, giftName, count, diamonds, avatar){
    if (!id) return;
    giftName = String(giftName || 'quà').slice(0, 30); count = clamp(count, 1, 9999);
    const coins = Math.max(1, (+diamonds || 1) * count);
    this.stats.gifts += count; this.stats.coins += coins;
    const { v } = this.seat(id, name, { avatar });
    if (!v) return;
    v.coins += coins;
    const tier = coins >= 99 ? 3 : coins >= 10 ? 2 : 1;
    this.broadcast({ t: 'gift', id, name: v.name, giftName, count, coins, total: v.coins, tier });
    if (coins >= this.settings.thankMin) this.enqueue('thank', { name: v.name, gift: count > 1 ? `${count} ${giftName}` : giftName, coins });
  }

  /* ---- câu nói tự động: gom theo loại, nói khi giọng rảnh ---- */
  enqueue(kind, item){
    if (!this.settings[VOICE_SETTING[kind]] || !this.overlayClients().length) return;
    const q = this.pending[kind], same = q.find(x => x.name === item.name);
    if (same){ if (kind === 'thank'){ same.coins += item.coins; same.gift = item.gift; } return; }
    q.push({ ...item, at: now() });
    if (q.length > 20) q.shift();
  }
  tickVoice(){
    if (this.ttsBusy || this.ttsQueue.length) return;
    for (const kind of VOICE_ORDER){
      const q = this.pending[kind];
      while (q.length && now() - q[0].at > VOICE_TTL[kind]) q.shift();
      if (!q.length || now() - this.lastSaid[kind] < VOICE_GAP[kind]) continue;
      if (kind === 'thank' && now() - q.at(-1).at < 2500) continue;          // let a gift combo finish before thanking
      const batch = q.splice(0, 4);
      this.lastSaid[kind] = now();
      this.say(this.compose(kind, batch), { tag: kind });
      return;
    }
  }
  compose(kind, batch){
    const names = batch.map(b => spoken(b.name)), one = batch.length === 1, vars = { name: names[0], names: joinNames(names), gift: batch[0].gift };
    if (kind === 'thank') return fill(this.pick(one ? (batch[0].coins >= 99 ? THANK.big : batch[0].coins >= 10 ? THANK.mid : THANK.small) : THANK.group), vars);
    if (kind === 'prayer') return fill(this.pick(one ? batch[0].topic.lines : PRAYER_GROUP), vars);
    const pool = { welcome: WELCOME, follow: FOLLOW, share: SHARE }[kind];
    return fill(this.pick(one ? pool.one : pool.group), vars);
  }
  mindful(){
    const text = Math.random() < .25 ? this.pick(INVITE) : this.pick(MINDFUL);
    this.broadcast({ t: 'chant', title: 'Thở và lắng nghe', text, mindful: true });
    this.say(text, { tag: 'mindful' });
  }

  /* ---- chanting ---- */
  recentNames(n){
    const real = this.want;                                    // khi đang nối LIVE thật thì không xướng tên người mẫu
    return [...this.viewers.values()]
      .filter(v => v.lastTextAt && now() - v.lastTextAt < 30 * 60_000 && !(real && v.demo) && v.name !== 'Khách')
      .sort((a, b) => b.lastTextAt - a.lastTextAt).slice(0, n).map(v => spoken(v.name));
  }
  chant(){
    const c = CHANTS[this.chantIdx++ % CHANTS.length];
    let text = c.text;
    if (c.dedicate && this.settings.dedicateNames){
      const names = this.recentNames(6);
      if (names.length) text += ` Nguyện hồi hướng đến ${names.join(', ')}, cùng tất cả mọi người đang có mặt, thân tâm thường an lạc.`;
    }
    this.broadcast({ t: 'chant', title: c.title, text });
    this.say(text, { tag: 'chant' });
  }
  scheduleChant(){
    clearInterval(this.chantTimer); this.chantTimer = null;
    clearInterval(this.mindfulTimer); this.mindfulTimer = null;
    if (this.settings.autoChant) this.chantTimer = setInterval(() => this.chant(), Math.max(1, this.settings.chantEveryMin) * 60_000);
    if (this.settings.mindfulEveryMin > 0) this.mindfulTimer = setInterval(() => this.mindful(), this.settings.mindfulEveryMin * 60_000);
  }

  /* ---- TTS ---- */
  say(text, meta = {}){
    if (!this.overlayClients().length) return;                 // no overlay open: nobody would hear it, skip the TTS call
    if (this.ttsQueue.length >= 15){ this.addLog('Hàng đợi giọng đọc đầy, bỏ qua 1 câu'); return; }
    this.ttsQueue.push({ text: String(text).slice(0, 500), meta }); this.pumpTTS();
  }
  async pumpTTS(){
    if (this.ttsBusy || !this.ttsQueue.length) return;
    this.ttsBusy = true;
    const { text, meta } = this.ttsQueue.shift();
    const tts = new MsEdgeTTS();
    let timer;
    try {
      const file = `tts_${now()}_${++this.ttsSeq}.mp3`;
      const s = this.settings;
      await tts.setMetadata(s.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(esc(text), { pitch: `${s.pitch >= 0 ? '+' : ''}${s.pitch}Hz`, rate: `${s.rate >= 0 ? '+' : ''}${s.rate}%` });
      const chunks = [];
      await Promise.race([
        new Promise((res, rej) => { audioStream.on('data', c => chunks.push(c)); audioStream.on('close', res); audioStream.on('error', rej); }),
        new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('quá 20 giây không phản hồi')), TTS_TIMEOUT_MS); }),
      ]);
      if (!chunks.length) throw new Error('không nhận được âm thanh');
      fs.writeFileSync(path.join(this.ttsDir, file), Buffer.concat(chunks));
      this.broadcast({ t: 'tts', url: `/tts/${this.id}/${file}`, text, ...meta }, 'overlay');
      const old = fs.readdirSync(this.ttsDir).sort();
      while (old.length > 40) { try { fs.unlinkSync(path.join(this.ttsDir, old.shift())); } catch {} }
    } catch (e) { this.addLog('TTS lỗi: ' + errText(e)); }
    clearTimeout(timer);
    try { tts.close(); } catch {}
    this.ttsBusy = false; setTimeout(() => this.pumpTTS(), 50);
  }

  /* ---- TikTok lifecycle: chờ LIVE → kết nối → rớt thì tự nối lại ---- */
  schedule(ms){
    clearTimeout(this.retryTimer);
    this.nextRetryAt = now() + ms;
    this.retryTimer = setTimeout(() => this.check(), ms);
    dashDirty = true;
  }
  start(uniqueId){
    if (uniqueId !== undefined){
      const u = normUser(uniqueId);
      if (!u){ this.addLog('Username không hợp lệ'); return; }
      if (u !== this.uniqueId){ this.dropConnection(); this.uniqueId = u; }
    }
    if (!this.uniqueId){ this.addLog('Chưa nhập username kênh'); return; }
    this.want = true; this.failures = 0;
    this.clearSimulation();
    persist();
    if (!this.conn && !this.checking) this.schedule(0);
  }
  stop(){
    this.want = false;
    clearTimeout(this.retryTimer); this.retryTimer = null; this.nextRetryAt = 0;
    this.dropConnection();
    this.setStatus('idle', 'Chưa kết nối');
    persist();
  }
  dropConnection(){
    const c = this.conn; this.conn = null; this.connectedAt = 0;
    if (c){ try { c.removeAllListeners(); } catch {} c.disconnect().catch(() => {}); }
  }
  async check(){
    this.retryTimer = null; this.nextRetryAt = 0;
    if (!this.want || !this.uniqueId || this.conn || this.checking) return;
    this.checking = true;
    const uid = this.uniqueId, stale = () => !this.want || uid !== this.uniqueId;
    let conn = null;
    try {
      TikTokLib ||= await import('tiktok-live-connector');
      const { TikTokLiveConnection } = TikTokLib;
      // extended gift info and room info need Euler's paid plan; gift name and diamonds already come with every gift event
      conn = new TikTokLiveConnection(uid, { enableExtendedGiftInfo: false, fetchRoomInfoOnConnect: false, processInitialData: false });
      this.setStatus('checking', `Đang kiểm tra @${uid} có đang LIVE không…`);
      const live = await conn.fetchIsLive();
      if (stale()) return;
      if (!live){
        this.failures = 0;
        this.setStatus('waiting', `@${uid} chưa LIVE · tự kiểm tra lại mỗi ${WAIT_POLL_MS / 1000} giây`);
        this.schedule(WAIT_POLL_MS);
        return;
      }
      this.setStatus('connecting', `@${uid} đang LIVE · đang kết nối…`);
      this.attach(conn);
      const st = await throttledConnect(() => stale() ? Promise.reject(new Error('đã hủy')) : conn.connect());
      if (stale()){ conn.removeAllListeners(); conn.disconnect().catch(() => {}); return; }
      this.conn = conn; conn = null;
      this.failures = 0; this.connectedAt = this.lastEventAt = now(); this.stats.connects++;
      this.setStatus('connected', `Đã kết nối LIVE @${uid}`);
      this.addLog(`✅ Đã kết nối live @${uid}${st?.roomId ? ' · phòng ' + st.roomId : ''}`);
    } catch (e) {
      if (conn){ try { conn.removeAllListeners(); } catch {} conn.disconnect().catch(() => {}); }
      if (stale()) return;
      this.failures++;
      const msg = errText(e);
      const limited = /rate.?limit|429|too many/i.test(msg) || e?.constructor?.name === 'SignatureRateLimitError';
      const delay = limited ? 15 * 60_000 : Math.min(15 * 60_000, 30_000 * 2 ** Math.min(this.failures - 1, 5));
      this.setStatus('error', `${limited ? 'Máy chủ ký báo quá giới hạn' : 'Lỗi'}: ${msg.slice(0, 140)} · thử lại sau ${Math.round(delay / 1000)} giây`);
      this.addLog(`❌ @${uid}: ${msg} · thử lại sau ${Math.round(delay / 1000)} giây`);
      this.schedule(delay);
    } finally {
      this.checking = false;
      if (this.want && !this.conn && !this.retryTimer && uid !== this.uniqueId) this.schedule(0);   // username changed mid-check
    }
  }
  attach(conn){
    const { WebcastEvent, ControlEvent } = TikTokLib;
    conn.on(ControlEvent.DECODED_DATA, () => { this.lastEventAt = now(); });
    conn.on(WebcastEvent.CHAT, d => this.onChat(uidOf(d.user), nm(d.user), d.content ?? d.comment, av(d.user)));
    conn.on(WebcastEvent.GIFT, d => {
      const g = d.giftDetails || {};
      if ((g.type === 1 || g.combo) && !d.repeatEnd) return;        // streak still running: thank once at the end
      const gname = g.name || g.giftName || 'quà';
      const dia = g.diamondCount ?? 1;
      this.onGift(uidOf(d.user), nm(d.user), gname, d.repeatCount || 1, dia, av(d.user));
      this.addLog(`🎁 ${nm(d.user)} tặng ${gname} x${d.repeatCount || 1}`);
    });
    conn.on(WebcastEvent.MEMBER, d => { if (this.settings.joinOnEnter && uidOf(d.user)) this.seat(uidOf(d.user), nm(d.user), { avatar: av(d.user) }); });
    conn.on(WebcastEvent.LIKE, d => { const n = d.count || d.likeCount || 1; this.stats.likes += n; this.broadcast({ t: 'like', id: uidOf(d.user), n }); });
    conn.on(WebcastEvent.ROOM_USER, d => { const v = +(d.total ?? d.totalUser ?? d.viewerCount); if (Number.isFinite(v)) this.stats.viewerCount = v; });
    conn.on(WebcastEvent.FOLLOW, d => { this.stats.follows++; this.onSocial('follow', d.user); });
    conn.on(WebcastEvent.SHARE, d => this.onSocial('share', d.user));
    conn.on(WebcastEvent.STREAM_END, () => this.addLog('📴 TikTok báo phiên LIVE đã kết thúc'));
    conn.on(ControlEvent.DISCONNECTED, () => this.onDropped(conn, 'mất kết nối'));
    conn.on(ControlEvent.ERROR, e => this.addLog('TikTok lỗi: ' + errText(e)));
  }
  onDropped(conn, why){
    if (this.conn !== conn) return;
    this.dropConnection();
    if (!this.want){ this.setStatus('idle', 'Chưa kết nối'); return; }
    this.addLog(`⚠️ TikTok: ${why} · tự kết nối lại sau ${RECONNECT_MS / 1000} giây`);
    this.setStatus('waiting', `${why} · đang chờ kết nối lại…`);
    this.schedule(RECONNECT_MS);
  }

  /* ---- test data ---- */
  fillDemo(n){
    const have = [...this.viewers.values()].filter(v => v.demo).length;
    for (let i = have; i < n && this.viewers.size < MAX_SEATS; i++){
      const name = DEMO_NAMES[i % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? ' ' + (Math.floor(i / DEMO_NAMES.length) + 1) : '');
      this.seat('demo_' + i, name, { demo: true, skin: ['man','woman','woman','man','granny','monk','nun','child'][i % 8] });
    }
  }
  setBots(on, n, pace){
    clearInterval(this.botTimer); this.botTimer = null;
    if (on){
      n = clamp(n, 1, 100);
      for (let i = 0; i < n; i++) this.seat('bot_' + i, DEMO_NAMES[(i + 7) % DEMO_NAMES.length] + ' ·bot', { demo: true });
      const every = { slow: 4000, mid: 1800, fast: 700 }[pace] || 1800;
      this.botTimer = setInterval(() => {
        const ids = [...this.viewers.keys()].filter(id => id.startsWith('bot_')); if (!ids.length) return;
        const id = ids[Math.floor(Math.random() * ids.length)], v = this.viewers.get(id), r = Math.random();
        if (r < .62) this.onChat(id, v.name, BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]);
        else if (r < .9) this.broadcast({ t: 'like', id, n: 1 + Math.floor(Math.random() * 4) });
        else if (r < .985) this.onGift(id, v.name, 'Hoa hồng', 1 + Math.floor(Math.random() * 3), 1);
        else this.onGift(id, v.name, 'Đèn hoa sen', 1, 99);
      }, every);
      this.addLog(`🤖 Bật ${n} bot, nhịp ${pace}`);
    } else {
      for (const id of [...this.viewers.keys()]) if (id.startsWith('bot_')) { this.viewers.delete(id); this.broadcast({ t: 'leave', id }); }
      this.addLog('🤖 Tắt bot');
    }
    this.broadcast({ t: 'bots', on }, 'control');
  }

  /* ---- control ---- */
  onControl(m){
    // Đang nối LIVE thật thì không cho bơm người mẫu, bot, bình luận hay quà giả lên màn hình: đó là tương tác giả.
    if (SIM_CMDS.has(m.cmd) && this.want && !(m.cmd === 'bots' && !m.on)){
      this.addLog('Kênh đang nối TikTok thật: chức năng giả lập bị khóa (bấm Ngắt để thử nghiệm)');
      return;
    }
    switch (m.cmd){
      case 'connect': this.start(m.uniqueId); break;
      case 'disconnect': this.stop(); this.addLog('Đã ngắt kết nối TikTok'); break;
      case 'chat': { const n = String(m.name || 'Khách').slice(0, 18); this.onChat('sim_' + n, n, String(m.text || 'Nam mô A Di Đà Phật').slice(0, 120)); break; }
      case 'mindful': this.mindful(); break;
      case 'gift': { const n = String(m.name || 'Khách').slice(0, 18); this.onGift('sim_' + n, n, String(m.gift || 'Hoa hồng').slice(0, 30), clamp(m.count, 1, 99), clamp(m.diamonds, 1, 50000)); break; }
      case 'fill': this.fillDemo(clamp(m.n, 1, MAX_SEATS)); this.addLog(`Đổ người mẫu: ${this.viewers.size} người`); break;
      case 'clear': this.viewers.clear(); this.broadcast(this.snapshot()); this.addLog('Đã làm trống bồ đoàn'); break;
      case 'bell': this.broadcast({ t: 'bell' }); break;
      case 'mo': this.broadcast({ t: 'mo1' }); break;
      case 'chant': this.chant(); break;
      case 'say': if (m.text) this.say(String(m.text).slice(0, 400), { tag: 'say' }); break;
      case 'settings':
        applySettings(this.settings, m.settings || {});
        this.scheduleChant(); persist();
        this.broadcast({ t: 'settings', settings: this.settings, cap: this.capacity() }); break;
      case 'bots': this.setBots(!!m.on, +m.n || 12, m.pace); break;
    }
    dashDirty = true;
  }
  destroy(){
    this.stop();
    clearInterval(this.chantTimer); clearInterval(this.mindfulTimer); clearInterval(this.botTimer); clearInterval(this.voiceTimer);
    for (const c of wss.clients) if (c.ch === this.id) { try { c.send(JSON.stringify({ t: 'nochannel' })); c.close(4004, 'channel removed'); } catch {} }
    fs.rmSync(this.ttsDir, { recursive: true, force: true });
  }
}
function esc(s){ return String(s).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }

// Trạng thái đẩy luồng RTMP do deploy/linux/phat-kenh.sh ghi mỗi 5 giây vào <PUSH_STATUS_DIR>/<mã kênh>.json.
// Chỉ có trên VPS Linux; Windows dùng OBS nên không có file và bảng tổng không hiện dòng này. File chỉ được đọc, coi như dữ liệu.
const PUSH_STATES = new Set(['starting', 'connecting', 'live', 'retry', 'nokey', 'stopped']);
function pushStatus(chId){
  if (!PUSH_DIR) return null;
  let s; try { s = JSON.parse(fs.readFileSync(path.join(PUSH_DIR, chId + '.json'), 'utf8')); } catch { return null; }
  if (!s || typeof s !== 'object') return null;
  const n = v => v == null || v === '' || !Number.isFinite(+v) ? null : +v, ms = v => n(v) == null ? null : n(v) * 1000;
  return { state: PUSH_STATES.has(s.state) ? s.state : 'starting', at: ms(s.at), since: ms(s.since), retryAt: ms(s.retryAt),
    code: n(s.code), restarts: n(s.restarts), fps: n(s.fps), kbps: n(s.kbps), speed: n(s.speed),
    host: String(s.host ?? '').slice(0, 80), size: String(s.size ?? '').slice(0, 12) };
}

// Nhạc: mọi file .mp3 trong assets/music. Kênh nào có thư mục riêng assets/music/<mã kênh>/ thì dùng nhạc riêng,
// để các kênh không phát y hệt nhau.
// Chuông cũng vậy: file .mp3 đầu tiên trong assets/chuong (hoặc assets/chuong/<mã kênh>/); không có thì overlay tự tạo tiếng chuông.
// Gian thờ: assets/hall.jpg trước, rồi các ảnh trong assets/gian-tho (hoặc assets/gian-tho/<mã kênh>/), overlay luân phiên.
function mp3s(folder, chId, re = /\.mp3$/i){
  const scan = (...dir) => { try { return fs.readdirSync(path.join(ROOT, 'assets', folder, ...dir)).filter(f => re.test(f) && !f.startsWith('.')).sort(); } catch { return []; } };
  const own = scan(chId);
  if (own.length) return own.map(f => `/assets/${folder}/${chId}/${encodeURIComponent(f)}`);
  return scan().map(f => `/assets/${folder}/${encodeURIComponent(f)}`);
}
const musicList = chId => mp3s('music', chId);

/* ------------------------------------------------------- channel store */
let saveTimer = null;
function persist(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 800); }
function saveNow(){
  clearTimeout(saveTimer); saveTimer = null;
  try {
    const tmp = CHANNELS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, channels: [...channels.values()].map(c => c.toJSON()) }, null, 2));
    fs.renameSync(tmp, CHANNELS_FILE);
  } catch (e) { writeLog('Không lưu được cấu hình kênh: ' + errText(e)); }
}
function nextChannelId(){ for (let i = 1; ; i++) if (!channels.has('kenh' + i)) return 'kenh' + i; }
function addChannel(cfg){
  if (channels.size >= MAX_CHANNELS) return null;
  const id = /^[a-z0-9_-]{1,20}$/.test(cfg.id || '') && !channels.has(cfg.id) ? cfg.id : nextChannelId();
  const ch = new Channel({ ...cfg, id, name: cfg.name || 'Kênh ' + id.replace(/^kenh/, '') });
  channels.set(id, ch);
  return ch;
}
function loadChannels(){
  let list = null;
  try { list = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8')).channels; }
  catch (e) {
    if (fs.existsSync(CHANNELS_FILE)){ const bad = CHANNELS_FILE + '.hong-' + now(); fs.renameSync(CHANNELS_FILE, bad); writeLog('File cấu hình kênh hỏng, đã cất sang ' + bad); }
  }
  if (!Array.isArray(list) || !list.length) list = [1, 2, 3, 4].map(i => ({ id: 'kenh' + i, name: 'Kênh ' + i }));
  for (const cfg of list.slice(0, MAX_CHANNELS)) addChannel(cfg || {});
  saveNow();
}

/* ------------------------------------------------------------ dashboard */
let dashDirty = true;
function dashState(){
  return { t: 'dash', serverStartedAt, signKey: !!process.env.SIGN_API_KEY, max: MAX_CHANNELS, now: now(),
    channels: [...channels.values()].map(c => c.summary()) };
}
function pushDash(){
  dashDirty = false;
  const s = JSON.stringify(dashState());
  for (const c of wss.clients) if (c.readyState === 1 && c.role === 'dashboard') c.send(s);
}
async function onDash(m){
  const ch = channels.get(String(m.ch || ''));
  switch (m.cmd){
    case 'add': { const c = addChannel({ name: String(m.name || '').slice(0, 30) || undefined, uniqueId: m.uniqueId }); if (c){ writeLog(`Thêm kênh ${c.id}`); persist(); } break; }
    case 'remove': if (ch && channels.size > 1){ ch.destroy(); channels.delete(ch.id); writeLog(`Xóa kênh ${ch.id}`); persist(); } break;
    case 'rename': if (ch){ ch.name = String(m.name || ch.id).slice(0, 30); persist(); ch.broadcast({ t: 'name', name: ch.name }); } break;
    case 'connect': if (ch) ch.start(m.uniqueId); break;
    case 'disconnect': if (ch){ ch.stop(); ch.addLog('Đã ngắt kết nối TikTok'); } break;
    case 'connectAll': for (const c of channels.values()) if (c.uniqueId) c.start(); break;
    case 'disconnectAll': for (const c of channels.values()) if (c.want) c.stop(); break;
  }
  pushDash();
}

/* -------------------------------------------------------------- server */
// Security notes (this file is meant to be shared publicly):
//  • listens on 127.0.0.1 only; nothing is reachable from the LAN or internet unless HOST is changed on purpose
//  • Host header must be localhost/127.0.0.1 (blocks DNS-rebinding pages from talking to the server)
//  • WebSocket only accepts pages served by this server (Origin check), so other sites open in the
//    same browser cannot send control commands
//  • static files: only /assets and /live, only media/page extensions, no dot-files, no node_modules, no data dir
//  • no TikTok password, cookie or session is ever used or stored; only public room events are read
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.mp3':'audio/mpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);
const okHost = h => ALLOWED_HOSTS.has(String(h || '').toLowerCase());
const SEP = path.sep;
function resolveStatic(urlPath){
  const p = urlPath === '/' ? '/live/dashboard.html' : urlPath;
  if (!/^\/(assets|live)\//.test(p)) return null;
  if (p.split('/').some(seg => seg.startsWith('.') || seg === 'node_modules' || seg === 'data')) return null;
  if (!MIME[path.extname(p).toLowerCase()]) return null;                       // never serve server code, configs or scripts
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + SEP)) return null;
  return file;
}
function resolveTTS(urlPath){
  const m = /^\/tts\/([a-z0-9_-]{1,20})\/(tts_\d+_\d+\.mp3)$/.exec(urlPath);
  return m ? path.join(TTS_ROOT, m[1], m[2]) : null;
}
function sendJSON(res, obj){ res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(obj)); }
const server = http.createServer((req, res) => {
  if (!okHost(req.headers.host)) { res.writeHead(421).end('wrong host'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (p === '/health') {
    const mem = process.memoryUsage();
    sendJSON(res, { ok: true, uptimeSec: Math.round((now() - serverStartedAt) / 1000), rssMB: Math.round(mem.rss / 1048576), heapMB: Math.round(mem.heapUsed / 1048576),
      clients: wss.clients.size, channels: [...channels.values()].map(c => { const ov = c.overlayClients();
        return { id: c.id, status: c.tt.status, seated: c.viewers.size, overlays: ov.length, audio: ov.filter(w => w.audio).length, tts: c.ttsQueue.length, push: pushStatus(c.id) }; }) });
    return;
  }
  const tts = p.startsWith('/tts/');
  const file = tts ? resolveTTS(p) : resolveStatic(p);
  if (!file) { res.writeHead(404).end('not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size,
      'Cache-Control': tts ? 'no-store' : 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
});
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024,
  verifyClient: ({ origin, req }) => {
    if (!okHost(req.headers.host)) return false;
    if (!origin) return true;                                   // OBS / non-browser clients send no Origin
    try { return okHost(new URL(origin).host); } catch { return false; }
  } });
wss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://x').searchParams;
  ws.role = ['control', 'overlay', 'dashboard'].includes(q.get('role')) ? q.get('role') : 'overlay';
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('error', () => {});
  if (ws.role === 'dashboard'){
    ws.send(JSON.stringify(dashState()));
    ws.on('message', buf => { try { const m = JSON.parse(buf); if (m && m.t === 'dash') onDash(m); } catch {} });
    return;
  }
  const ch = channels.get(q.get('ch') || [...channels.keys()][0]);
  if (!ch){ ws.send(JSON.stringify({ t: 'nochannel', ch: q.get('ch') })); ws.close(4004, 'no channel'); return; }
  ws.ch = ch.id;
  ws.send(JSON.stringify(ch.snapshot()));
  if (ws.role === 'control') ws.send(JSON.stringify({ t: 'logs', lines: ch.log }));
  dashDirty = true;
  ws.on('close', () => { dashDirty = true; });
  ws.on('message', buf => {
    let m; try { m = JSON.parse(buf); } catch { return; }
    const c = channels.get(ws.ch); if (!c || !m) return;
    if (ws.role === 'control' && m.t === 'ctl') { try { c.onControl(m); } catch (e) { c.addLog('Lệnh lỗi: ' + errText(e)); } }
    else if (ws.role === 'overlay' && m.t === 'status') { ws.audio = !!m.audio; dashDirty = true; }   // overlays may only report their own audio state
  });
});

// Dọn kết nối chết (OBS reload, máy ngủ…) và canh kết nối TikTok im lặng quá lâu.
setInterval(() => {
  for (const ws of wss.clients){ if (!ws.isAlive){ ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch {} }
}, 30_000);
setInterval(() => {
  for (const ch of channels.values()) if (ch.conn && now() - ch.lastEventAt > SILENCE_MS) ch.onDropped(ch.conn, `${SILENCE_MS / 60_000} phút không nhận dữ liệu`);
}, 60_000);
setInterval(() => { if (dashDirty) pushDash(); }, 1000);
setInterval(pushDash, 5000);

process.on('unhandledRejection', e => writeLog('Lỗi chưa xử lý (bỏ qua, server vẫn chạy): ' + errText(e)));
process.on('uncaughtException', e => writeLog('Lỗi ngoài dự kiến (bỏ qua, server vẫn chạy): ' + (e?.stack || errText(e))));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveNow(); process.exit(0); });

loadChannels();
server.on('error', e => { writeLog('Không mở được cổng ' + PORT + ': ' + errText(e)); process.exit(1); });
server.listen(PORT, HOST, () => writeLog(`Server chạy tại http://localhost:${PORT}  ·  Bảng tổng: http://localhost:${PORT}/  ·  ${channels.size} kênh  ·  Khóa Euler: ${process.env.SIGN_API_KEY ? 'có' : 'không'}`));
