#!/usr/bin/env bash
# Phát một kênh Chánh Điện lên RTMP trên máy Linux không màn hình, không card đồ họa:
#   Xvfb (màn hình ảo) + PulseAudio riêng của kênh (null-sink) + Chrome kiosk mở overlay của kênh
#   + ffmpeg chụp màn hình ảo và tiếng của sink đó rồi đẩy RTMP.
#
#   phat-kenh.sh kenh1              (thường do systemd chạy: chanh-dien-kenh@kenh1)
#
# Cấu hình đọc từ /etc/chanh-dien/<kênh>.env (mẫu: kenh.env.example). Khóa phát không bao giờ được in ra nhật ký.
# ffmpeg rớt (mạng, TikTok ngắt) thì tự phát lại, đọc lại file cấu hình nên đổi khóa xong không cần khởi động lại.
# Xvfb hoặc PulseAudio chết thì thoát để systemd dựng lại cả kênh. Chrome chết hoặc overlay mất hình/tiếng thì mở lại Chrome.
set -uo pipefail

CH=${1:?Thiếu tên kênh. Ví dụ: phat-kenh.sh kenh1}
[[ $CH =~ ^[a-z0-9_-]{1,20}$ ]] || { echo "Tên kênh không hợp lệ: $CH" >&2; exit 2; }
(( EUID != 0 )) || { echo "Không chạy bằng root (PulseAudio và Chrome từ chối). Dùng systemd hoặc: sudo -u chanhdien $0 $CH" >&2; exit 2; }

CONF=${CONF_DIR:-/etc/chanh-dien}/$CH.env
PORT=${PORT:-3000}
RUN=${RUNTIME_DIRECTORY:-/tmp/chanh-dien-$CH}          # systemd: /run/chanh-dien-<kênh> (RAM, mất khi tắt máy)
STATE=${STATE_DIRECTORY:-$HOME/.chanh-dien}            # systemd: /var/lib/chanh-dien
SINK=chanhdien_$CH
mkdir -p -m 700 "$RUN" && mkdir -p "$STATE" || exit 1

log(){ echo "[$CH] $*"; }
alive(){ [[ -n ${1:-} ]] && kill -0 "$1" 2>/dev/null; }

load_conf(){
  [[ -r $CONF ]] || { log "Không đọc được $CONF. Tạo từ deploy/linux/kenh.env.example."; return 1; }
  RTMP_URL='' STREAM_KEY=''
  # shellcheck disable=SC1090
  . "$CONF"
}
load_conf || exit 1
n=${CH//[^0-9]/}
DISP=${DISPLAY_NUM:-$((100 + 10#${n:-0}))}
XW=${WIDTH:-720} XH=${HEIGHT:-1280}                       # kích thước màn hình ảo cố định cho cả lần chạy
CHROME=${CHROME:-$(command -v google-chrome-stable || command -v google-chrome || command -v chromium || command -v chromium-browser)}
[[ -x $CHROME ]] || { log "Không tìm thấy Google Chrome. Chạy lại deploy/linux/cai-dat.sh."; exit 1; }

XVFB='' PULSE='' CHROME_PID='' FF=''
cleanup(){
  trap - EXIT
  for p in "$FF" "$CHROME_PID" "$PULSE" "$XVFB"; do alive "$p" && kill "$p" 2>/dev/null; done
  wait 2>/dev/null
}
trap cleanup EXIT
trap 'exit 0' TERM INT

# ---------------------------------------------------------------- màn hình ảo
lock=/tmp/.X$DISP-lock
if [[ -e $lock ]]; then
  pid=$(tr -dc 0-9 < "$lock")
  if [[ -n $pid && -d /proc/$pid ]]; then log "Màn hình :$DISP đang bị tiến trình $pid dùng. Đặt DISPLAY_NUM khác trong $CONF."; exit 1; fi
  rm -f "$lock" "/tmp/.X11-unix/X$DISP"                  # khóa cũ của lần chết trước
fi
Xvfb ":$DISP" -screen 0 "${XW}x${XH}x24" -nolisten tcp -noreset & XVFB=$!
for _ in {1..50}; do [[ -S /tmp/.X11-unix/X$DISP ]] && break; sleep 0.2; done
[[ -S /tmp/.X11-unix/X$DISP ]] || { log "Xvfb không lên."; exit 1; }

# ---------------------------------------------------------------- âm thanh: một PulseAudio riêng, một null-sink riêng
export XDG_RUNTIME_DIR=$RUN PULSE_RUNTIME_PATH=$RUN/pulse PULSE_SERVER=unix:$RUN/pulse/native PULSE_SINK=$SINK
mkdir -p -m 700 "$PULSE_RUNTIME_PATH"
pulseaudio -n --daemonize=no --exit-idle-time=-1 --disallow-exit --use-pid-file=no --log-target=stderr --log-level=error \
  -L "module-native-protocol-unix socket=$RUN/pulse/native auth-anonymous=1" \
  -L "module-null-sink sink_name=$SINK rate=44100 channels=2" & PULSE=$!
for _ in {1..50}; do pactl info >/dev/null 2>&1 && break; sleep 0.2; done
pactl info >/dev/null 2>&1 || { log "PulseAudio không lên."; exit 1; }
pactl set-default-sink "$SINK"

# ---------------------------------------------------------------- server và Chrome
health(){                                                 # in "<số overlay> <số overlay có tiếng>", "none" hoặc "down"
  node -e 'fetch(`http://127.0.0.1:${process.argv[2]}/health`, { signal: AbortSignal.timeout(5000) }).then(r => r.json())
    .then(h => { const c = h.channels.find(c => c.id === process.argv[1]); console.log(c ? `${c.overlays} ${c.audio ?? 0}` : "none"); })
    .catch(() => console.log("down"))' "$CH" "$PORT"
}
i=0
until [[ $(health) != down ]]; do
  (( i++ % 6 == 0 )) && log "Chờ server ở cổng $PORT…"; sleep 5
done

CHROME_LOG=$STATE/chrome-$CH.log
start_chrome(){
  # Hồ sơ trắng mỗi lần mở: không có hộp "khôi phục trang" sau lần bị giết, không có trang "có gì mới" sau khi Chrome cập nhật
  local prof=$STATE/chrome-$CH
  rm -rf "$prof"; mkdir -p "$prof"
  : > "$CHROME_LOG"
  DISPLAY=:$DISP "$CHROME" --user-data-dir="$prof" --kiosk --window-position=0,0 --window-size="$XW,$XH" \
    --no-first-run --no-default-browser-check --password-store=basic --disable-extensions --noerrdialogs --lang=vi \
    --disk-cache-size=52428800 \
    --disable-features=Translate,MediaRouter --disable-gpu --force-device-scale-factor=1 --hide-scrollbars \
    --autoplay-policy=no-user-gesture-required \
    --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows \
    "http://localhost:$PORT/live/overlay.html?ch=$CH" >>"$CHROME_LOG" 2>&1 &
  CHROME_PID=$!
}
start_chrome
printf 'DISP=%s\nXW=%s\nXH=%s\nPULSE_SERVER=%s\nSINK=%s\n' "$DISP" "$XW" "$XH" "$PULSE_SERVER" "$SINK" > "$STATE/$CH.chay"   # cho kiem-tra.sh
log "Màn hình :$DISP ${XW}x${XH}, sink $SINK, Chrome đã mở overlay."

# ---------------------------------------------------------------- ffmpeg → RTMP
mask(){ local k=$1; (( ${#k} > 8 )) && echo "${k:0:4}…(${#k} ký tự)" || echo "(${#k} ký tự)"; }
start_ffmpeg(){
  local fps=${FPS:-30} vk=${VIDEO_KBPS:-3000}
  local g=$((fps * 2))                                    # khung khóa mỗi 2 giây
  ffmpeg -hide_banner -nostdin -nostats -loglevel error \
    -thread_queue_size 512 -f x11grab -draw_mouse 0 -framerate "$fps" -video_size "${XW}x${XH}" -i ":$DISP" \
    -thread_queue_size 512 -f pulse -ac 2 -ar 44100 -i "$SINK.monitor" \
    -map 0:v -map 1:a \
    -c:v libx264 -preset "${X264_PRESET:-veryfast}" -profile:v high -pix_fmt yuv420p -r "$fps" \
    -b:v "${vk}k" -maxrate "${vk}k" -bufsize "$((vk * 2))k" -g "$g" -keyint_min "$g" -sc_threshold 0 \
    -c:a aac -b:a "${AUDIO_KBPS:-128}k" -ar 44100 -ac 2 \
    -f flv "${RTMP_URL%/}/$STREAM_KEY" &
  FF=$!
  log "Bắt đầu phát tới ${RTMP_URL%/}/$(mask "$STREAM_KEY") · ${XW}x${XH} ${fps}fps ${vk}k"
}

ff_fails=0 ff_next=0 ff_started=0
bad=0 wd_next=$((SECONDS + 90)) wd_wait=60 note_next=0
while :; do
  alive "$XVFB"  || { log "Xvfb đã chết, dựng lại cả kênh."; exit 1; }
  alive "$PULSE" || { log "PulseAudio đã chết, dựng lại cả kênh."; exit 1; }
  if ! alive "$CHROME_PID"; then wait "$CHROME_PID" 2>/dev/null; log "Chrome đã tắt, mở lại."; start_chrome; wd_next=$((SECONDS + 90)); fi

  if [[ -n $FF ]] && ! alive "$FF"; then
    wait "$FF"; rc=$?; FF=''
    (( SECONDS - ff_started > 120 )) && ff_fails=0
    delay=$(( 5 << (ff_fails < 5 ? ff_fails : 5) )); (( delay > 120 )) && delay=120
    ff_fails=$((ff_fails + 1)); ff_next=$((SECONDS + delay))
    log "ffmpeg dừng (mã $rc). Phát lại sau ${delay} giây."
  fi
  if [[ -z $FF ]] && (( SECONDS >= ff_next )); then
    if load_conf && [[ -n $RTMP_URL && -n $STREAM_KEY && $RTMP_URL$STREAM_KEY != *vao_day* ]]; then
      start_ffmpeg; ff_started=$SECONDS
    else
      log "Chưa có RTMP_URL / STREAM_KEY trong $CONF. Thử lại sau 60 giây (hình và tiếng vẫn chạy, xem bằng kiem-tra.sh)."
      ff_next=$((SECONDS + 60))
    fi
  fi

  # Canh overlay: server phải thấy overlay của kênh này đang mở và đang có tiếng.
  if (( SECONDS >= wd_next )); then
    wd_next=$((SECONDS + 30))
    read -r ov au <<<"$(health)"
    case $ov in
      none) (( SECONDS >= note_next )) && { log "Server không có kênh '$CH'. Tạo kênh trên bảng tổng."; note_next=$((SECONDS + 600)); } ;;
      ''|*[!0-9]*) ;;                                     # server tạm vắng: overlay tự nối lại, không đụng tới Chrome
      *)
        if (( ov > 0 && ${au:-0} > 0 )); then bad=0 wd_wait=60; else bad=$((bad + 1)); fi
        if (( bad >= 3 )); then
          log "Overlay: ${ov} cửa sổ, ${au:-0} có tiếng. Mở lại Chrome."
          kill "$CHROME_PID" 2>/dev/null; wait "$CHROME_PID" 2>/dev/null; start_chrome
          bad=0 wd_next=$((SECONDS + wd_wait)); wd_wait=$(( wd_wait * 2 > 900 ? 900 : wd_wait * 2 ))
        fi ;;
    esac
    [[ -f $CHROME_LOG ]] && (( $(stat -c %s "$CHROME_LOG") > 20971520 )) && : > "$CHROME_LOG"
  fi
  sleep 5
done
