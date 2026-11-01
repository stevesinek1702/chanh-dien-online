#!/usr/bin/env bash
# Xem một kênh trên VPS có hình và tiếng không, không cần màn hình:
#   sudo deploy/linux/kiem-tra.sh kenh1
# In trạng thái dịch vụ, trạng thái overlay trên server, chụp một ảnh màn hình ảo và đo âm lượng 8 giây của sink.
# Ảnh lưu ở /var/lib/chanh-dien/anh-kenh1.png; tải về máy: scp root@IP_VPS:/var/lib/chanh-dien/anh-kenh1.png .
set -uo pipefail
CH=${1:?Thiếu tên kênh. Ví dụ: kiem-tra.sh kenh1}
[[ $CH =~ ^[a-z0-9_-]{1,20}$ ]] || { echo "Tên kênh không hợp lệ: $CH" >&2; exit 2; }
PORT=${PORT:-3000}

if (( EUID == 0 )); then
  command -v systemctl >/dev/null && echo "Dịch vụ: server $(systemctl is-active chanh-dien-server) · kênh $(systemctl is-active "chanh-dien-kenh@$CH")"
  id chanhdien >/dev/null 2>&1 && exec runuser -u chanhdien -- env HOME=/var/lib/chanh-dien bash "$0" "$@"
fi

state=''
for d in "${STATE_DIRECTORY:-}" /var/lib/chanh-dien "$HOME/.chanh-dien"; do
  [[ -n $d && -r $d/$CH.chay ]] && { state=$d; break; }
done
[[ -n $state ]] || { echo "Kênh $CH chưa chạy (không thấy file $CH.chay). Xem: journalctl -u chanh-dien-kenh@$CH -n 50"; exit 1; }
# shellcheck disable=SC1090
. "$state/$CH.chay"
export PULSE_SERVER

echo -n "Server: "
node -e 'fetch(`http://127.0.0.1:${process.argv[2]}/health`, { signal: AbortSignal.timeout(5000) }).then(r => r.json())
  .then(h => { const c = h.channels.find(c => c.id === process.argv[1]);
    console.log(c ? `kênh ${c.id}: ${c.overlays} overlay, ${c.audio ?? "?"} có tiếng, TikTok: ${c.status}, ${c.seated} người ngồi` : "không có kênh này"); })
  .catch(() => console.log("không trả lời (dịch vụ chanh-dien-server có chạy không?)"))' "$CH" "$PORT"

img=$state/anh-$CH.png
if ffmpeg -hide_banner -loglevel error -y -f x11grab -video_size "${XW}x${XH}" -i ":$DISP" -frames:v 1 "$img"; then
  y=$(ffmpeg -hide_banner -nostats -i "$img" -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG -f null - 2>&1 | grep -o 'YAVG=[0-9.]*' | cut -d= -f2)
  echo "Hình: đã chụp $img (độ sáng trung bình ${y:-?}/255$( [[ ${y%.*} -lt 8 ]] 2>/dev/null && echo ', gần như đen: overlay chưa hiện?'))"
else
  echo "Hình: không chụp được màn hình :$DISP"
fi

vol=$(ffmpeg -hide_banner -nostats -f pulse -ac 2 -ar 44100 -i "$SINK.monitor" -t 8 -af volumedetect -f null - 2>&1 | grep -E 'mean_volume|max_volume' | sed 's/.*\] //' | tr '\n' ' ')
max=$(grep -o 'max_volume: [-0-9.]*' <<<"$vol" | grep -o '[-0-9.]*$')
if [[ -z $max ]]; then echo "Tiếng: không đọc được sink $SINK"
elif (( ${max%.*} < -60 )); then echo "Tiếng: im lặng trong 8 giây ($vol). Bảng tổng có báo 'chưa bật âm thanh' không? Nhạc nền có bật không?"
else echo "Tiếng: có ($vol)"
fi
