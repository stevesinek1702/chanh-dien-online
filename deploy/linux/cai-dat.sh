#!/usr/bin/env bash
# Cài Chánh Điện Online lên VPS Ubuntu/Debian (amd64) để phát TikTok LIVE 24h không cần màn hình:
#   sudo bash deploy/linux/cai-dat.sh kenh1 kenh2 kenh3
# Chạy lại bao nhiêu lần cũng được (thêm kênh, cập nhật code). Không ghi đè file cấu hình đã có trong /etc/chanh-dien.
set -euo pipefail

(( EUID == 0 )) || { echo "Chạy bằng root: sudo bash $0 $*"; exit 1; }
command -v apt-get >/dev/null || { echo "Script này dành cho Ubuntu/Debian (apt)."; exit 1; }
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
[[ $ROOT != *[[:space:]]* ]] || { echo "Đường dẫn dự án có dấu cách: $ROOT. Chuyển về /opt/chanh-dien-online."; exit 1; }
CHANNELS=("${@:-kenh1}")
for ch in "${CHANNELS[@]}"; do [[ $ch =~ ^[a-z0-9_-]{1,20}$ ]] || { echo "Mã kênh không hợp lệ: $ch"; exit 1; }; done

v=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
if (( v < 20 )); then
  echo "Cần Node.js 20 trở lên (hiện: $(node -v 2>/dev/null || echo 'chưa cài')). Cài bằng:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs"
  exit 1
fi

echo "== Gói hệ thống"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q --no-install-recommends xvfb pulseaudio pulseaudio-utils ffmpeg curl ca-certificates \
  fonts-noto-core fonts-noto-color-emoji
if ! command -v google-chrome-stable >/dev/null; then
  [[ $(dpkg --print-architecture) == amd64 ]] || { echo "Google Chrome chỉ có bản amd64. VPS này là $(dpkg --print-architecture)."; exit 1; }
  echo "== Google Chrome (dl.google.com)"
  tmp=$(mktemp -d)
  curl -fsSLo "$tmp/chrome.deb" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -q "$tmp/chrome.deb"
  rm -rf "$tmp"
fi

echo "== User chanhdien"
id chanhdien >/dev/null 2>&1 || useradd --system --home-dir /var/lib/chanh-dien --create-home --shell /usr/sbin/nologin chanhdien
runuser -u chanhdien -- test -r "$ROOT/live/server.mjs" ||
  { echo "User chanhdien không đọc được $ROOT. Đặt dự án ở /opt/chanh-dien-online (không đặt trong /root)."; exit 1; }

echo "== Thư viện Node"
(cd "$ROOT/live" && npm ci --ignore-scripts --no-audit --no-fund --omit=dev)

echo "== Cấu hình /etc/chanh-dien"
install -d -m 750 -o root -g chanhdien /etc/chanh-dien
if [[ ! -e /etc/chanh-dien/server.env ]]; then
  printf '%s\n' '# Khóa Euler Stream (nên có khi chạy từ 2 kênh, đăng ký miễn phí tại eulerstream.com). Bỏ dấu # rồi dán khóa.' \
    '#SIGN_API_KEY=' > /etc/chanh-dien/server.env
fi
for ch in "${CHANNELS[@]}"; do
  [[ -e /etc/chanh-dien/$ch.env ]] || cp "$ROOT/deploy/linux/kenh.env.example" "/etc/chanh-dien/$ch.env"
done
chown root:chanhdien /etc/chanh-dien/*.env && chmod 640 /etc/chanh-dien/*.env

echo "== Dịch vụ systemd"
for u in chanh-dien-server.service chanh-dien-kenh@.service; do
  sed "s|@ROOT@|$ROOT|g" "$ROOT/deploy/linux/systemd/$u" > "/etc/systemd/system/$u"
done
systemctl daemon-reload
systemctl enable chanh-dien-server >/dev/null && systemctl restart chanh-dien-server
for ch in "${CHANNELS[@]}"; do systemctl enable "chanh-dien-kenh@$ch" >/dev/null && systemctl restart "chanh-dien-kenh@$ch"; done

cat <<EOF

Xong. Server và ${#CHANNELS[@]} kênh (${CHANNELS[*]}) đã chạy và sẽ tự chạy lại khi chết hoặc khi VPS khởi động lại.
Việc còn lại:
  1. Dán Server URL + Stream key của từng tài khoản:   sudo nano /etc/chanh-dien/${CHANNELS[0]}.env
     (trong vòng 60 giây kênh tự bắt đầu phát; hoặc: sudo systemctl restart chanh-dien-kenh@${CHANNELS[0]})
  2. Mở bảng tổng từ máy của bạn qua đường hầm SSH:   ssh -L 3000:127.0.0.1:3000 <user>@<IP VPS>
     rồi vào http://localhost:3000/ để nối tài khoản TikTok cho từng kênh.
  3. Kiểm tra hình và tiếng:                          sudo bash $ROOT/deploy/linux/kiem-tra.sh ${CHANNELS[0]}
  Nhật ký: journalctl -u chanh-dien-kenh@${CHANNELS[0]} -f      ·  journalctl -u chanh-dien-server -f
EOF
