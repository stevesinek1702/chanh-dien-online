# Chạy nhiều kênh và LIVE 24 giờ

## 1. Mô hình

```
                    ┌─────────────── một server (live/server.mjs) ───────────────┐
TikTok @kenhA ──▶  │ kenh1: người ngồi · giọng đọc · thời tụng · tự nối lại     │ ──▶ overlay ?ch=kenh1 ──▶ OBS #1 ──▶ TikTok @kenhA
TikTok @kenhB ──▶  │ kenh2: …                                                   │ ──▶ overlay ?ch=kenh2 ──▶ OBS #2 ──▶ TikTok @kenhB
TikTok @kenhC ──▶  │ kenh3: …                                                   │ ──▶ overlay ?ch=kenh3 ──▶ OBS #3 ──▶ TikTok @kenhC
                    └──────────────── bảng tổng http://localhost:3000/ ──────────┘
```

Server lo phần **đọc sự kiện và dựng hình, tiếng** cho từng kênh. Phần **đẩy video lên TikTok** do phần mềm phát lo, mỗi tài khoản một luồng riêng.

## 2. Đẩy hình lên TikTok cho nhiều tài khoản

TikTok LIVE Studio đăng nhập một tài khoản mỗi lần, nên phát nhiều tài khoản trên một máy thì dùng **OBS + khóa phát (stream key)**:

1. Mỗi tài khoản cần có quyền lấy stream key (TikTok LIVE Center / LIVE Producer). Tài khoản nào chưa có quyền này thì không phát song song từ một máy được; khi đó mỗi tài khoản cần một máy hoặc điện thoại riêng.
2. Mở OBS nhiều cửa sổ: `obs64.exe --multi --profile "Kenh1" --collection "Kenh1"` (tương tự Kenh2, Kenh3…). Mỗi profile một stream key, mỗi bộ cảnh một overlay.
3. Trong mỗi OBS: *Sources → + → Browser*
   - URL: `http://localhost:3000/live/overlay.html?ch=kenh1` (đổi `kenh1` theo kênh; nút **Chép link OBS** trên bảng tổng).
   - Width 1080, Height 1920, FPS 30.
   - Tích **Control audio via OBS**: tiếng của kênh nào chỉ đi vào luồng của kênh đó, không bị trộn.
   - Không tích *Shutdown source when not visible*.
4. *Settings → Video*: canvas 1080×1920 (hoặc 720×1280 cho nhẹ máy), 30 fps.
5. *Settings → Output*: bộ mã hóa NVENC nếu có card NVIDIA, bitrate 2500–3500 kbps mỗi kênh.
6. *Settings → Advanced → Automatically Reconnect*: bật, thử lại 10 giây, không giới hạn số lần.
7. *Settings → Audio*: tắt Desktop Audio và Mic để chỉ còn tiếng overlay.

Trên bảng tổng, mỗi thẻ kênh báo **overlay đã mở chưa, âm thanh đã bật chưa**. Có cảnh báo vàng nghĩa là kênh đó đang không có hình hoặc tiếng.

**Một kênh bằng TikTok LIVE Studio**: chạy `Mo-Overlay.cmd kenh1`, rồi *Add source → Window capture* chọn cửa sổ đó. Script mở Chrome với cờ cho phép tự phát tiếng và không tạm dừng cửa sổ bị che, nên để chồng cửa sổ khác lên vẫn chạy.

### Máy hiện tại (i5-11300H, GTX 1650, 24 GB RAM)

- 3 kênh 720×1280 30 fps bằng NVENC: chạy được. 4 kênh: được nếu mạng upload ≥ 15–20 Mbps và máy thoáng nhiệt; laptop chạy 24h nên kê đế tản nhiệt và cắm sạc.
- Overlay vẽ canvas 1080×1920 ở 30–40 fps, mỗi overlay tốn vài trăm MB RAM trong OBS. Bộ nhớ đã được đo ổn định (xem `npm run soak`).

## 3. Chạy 10h, 20h, 24h

Những gì đã có sẵn trong code:

| Sự cố | Cách xử lý |
|---|---|
| Kênh chưa LIVE lúc bấm Kết nối | Server hỏi TikTok mỗi 90 giây, kênh lên LIVE là tự nối (không tốn lượt ký Euler) |
| Rớt kết nối, TikTok kết thúc phiên | Tự nối lại sau 20 giây; lỗi liên tiếp thì giãn dần 30s → 15 phút |
| Kết nối "chết lặng" | 10 phút không nhận gì là tự nối lại |
| Máy chủ ký báo quá giới hạn | Chờ 15 phút rồi thử lại; các kênh nối cách nhau ≥ 15 giây |
| Dịch vụ giọng đọc treo | Mỗi câu tối đa 20 giây, quá thì bỏ qua câu đó, không kẹt hàng đợi |
| Server chết | `Chay-Live.cmd` khởi động lại sau 5 giây; cấu hình kênh nằm trong `live/data/channels.json` nên không mất |
| Overlay bị nạp lại (OBS, mạng chập chờn) | Tự nối lại server, nhận lại toàn bộ trạng thái |
| Rò bộ nhớ âm thanh khi chạy dài | Mỗi đoạn âm thanh được tháo khỏi bộ trộn khi phát xong; bộ đệm ảnh đại diện có giới hạn; câu nói cũ quá 90 giây bị bỏ |
| Cần xem lại chuyện xảy ra lúc vắng mặt | Nhật ký theo ngày trong `live/data/logs/`, giữ 14 ngày |
| Theo dõi từ xa | `http://localhost:3000/health` trả trạng thái từng kênh, bộ nhớ server |

Những gì bạn cần làm trên máy:

- Tắt chế độ ngủ, tắt màn hình không ảnh hưởng (Windows: *Power & sleep → Never*).
- Đặt giờ hoạt động cho Windows Update để máy không tự khởi động lại giữa buổi.
- Đăng ký khóa Euler Stream miễn phí và đặt `SIGN_API_KEY` trong `Chay-Live.cmd` khi chạy từ 2 kênh.
- Trước buổi đầu: `cd live && npm run soak -- 30` để chắc máy chịu được.

## 4. Chạy trên VPS

Hai cách, cách nào cũng cần stream key cho từng tài khoản (mục 2, bước 1):

- **VPS Windows**: làm y hệt máy nhà (Node.js, Chrome, OBS, `Chay-Live.cmd`), điều khiển qua Remote Desktop. Dễ nhất nếu đã quen OBS.
- **VPS Linux** (Ubuntu 22.04/24.04, Debian 12): không cần màn hình, không cần OBS, không cần card đồ họa. Rẻ hơn và nhẹ hơn; mọi thứ tự chạy lại bằng systemd. Script nằm trong `deploy/linux/`.

Chung cho cả hai:

- **Không mở cổng 3000 ra Internet.** Server cố ý chỉ nghe `127.0.0.1` và không có đăng nhập. Windows: vào bảng tổng qua Remote Desktop. Linux: qua đường hầm SSH (bên dưới).
- **IP trung tâm dữ liệu**: TikTok có thể xử lý luồng phát từ IP máy chủ khác với IP nhà mạng, và gói Euler miễn phí giới hạn theo IP. Theo dõi kỹ vài ngày đầu.
- **Lưu lượng**: một kênh 3000 + 128 kbps chạy 24h là khoảng **34 GB/ngày, ~1 TB/tháng**. 4 kênh là ~4 TB/tháng. Nhiều gói VPS giới hạn 1–2 TB/tháng rồi bóp băng thông hoặc tính thêm tiền: xem kỹ trước khi mua.

### 4.1. VPS Windows

- **Cấu hình gợi ý cho 3–4 kênh** (OBS mã hóa bằng CPU x264 *veryfast*, 720×1280 30fps): 8–12 vCPU, 16 GB RAM, upload ≥ 20 Mbps. Thử một kênh trước, xem CPU, rồi mới thêm.
- **Tự chạy khi VPS khởi động lại**: Task Scheduler → *At log on* → chạy `Chay-Live.cmd`; bật tự đăng nhập Windows; OBS thêm tham số `--startstreaming` vào lối tắt của từng profile.

### 4.2. VPS Linux

Mỗi kênh là một dịch vụ systemd `chanh-dien-kenh@<mã kênh>` gồm bốn phần chạy cùng nhau:

```
Xvfb :101  (màn hình ảo 720×1280, không cần card đồ họa)   ─┐
Chrome kiosk  → http://localhost:3000/live/overlay.html?ch=kenh1 ├─▶ ffmpeg (x11grab + pulse, x264 veryfast, AAC 128k) ─▶ RTMP TikTok @kenhA
PulseAudio riêng của kênh, null-sink chanhdien_kenh1             ─┘
```

Tiếng của Chrome kênh nào chỉ vào sink của kênh đó, nên các kênh không lẫn tiếng nhau. Server `chanh-dien-server` dùng chung cho mọi kênh, như trên Windows.

**Cài đặt** (SSH vào VPS bằng user có `sudo`):

```bash
# 1. Node.js 22 và git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs git

# 2. Đặt dự án ở /opt (không đặt trong /root: user chạy dịch vụ không đọc được)
sudo git clone https://github.com/stevesinek1702/chanh-dien-online.git /opt/chanh-dien-online

# 3. Cài Xvfb, PulseAudio, ffmpeg, Google Chrome, font; tạo user chanhdien; bật dịch vụ cho kenh1
sudo bash /opt/chanh-dien-online/deploy/linux/cai-dat.sh kenh1

# 4. Dán Server URL và Stream key của tài khoản phát kenh1
sudo nano /etc/chanh-dien/kenh1.env
```

Trong vòng 60 giây sau khi lưu file, kênh tự bắt đầu đẩy luồng. Vào TikTok LIVE Center thấy có tín hiệu thì bấm phát.

Khóa phát nằm trong `/etc/chanh-dien/` (chỉ root và user `chanhdien` đọc được), không nằm trong thư mục dự án. `.gitignore` chặn mọi file `*.env` phòng khi lỡ chép vào dự án. Nhật ký chỉ in 4 ký tự đầu của khóa.

**Mở bảng tổng từ máy của bạn** (để nối tài khoản TikTok, chỉnh từng kênh):

```bash
ssh -L 3000:127.0.0.1:3000 <user>@<IP VPS>
```

Giữ cửa sổ SSH đó, rồi mở `http://localhost:3000/` trên máy mình. Cổng bên máy bạn phải đúng là `3000`, vì server chỉ nhận đúng tên `localhost:3000`. Nếu máy nhà đang chạy `Chay-Live.cmd` thì tắt trước.

Trên VPS Linux, mỗi thẻ kênh có thêm dòng **Đẩy luồng** cho biết luồng có đang lên TikTok không:

- **Xanh** `đang phát 720x1280 · 30 fps · 3120 kbps · tốc độ 1x · 2g 15p`: đang phát bình thường.
- **Đỏ**: rớt và đang chờ phát lại (kèm mã lỗi, số giây còn lại). Cũng đỏ khi tốc độ mã hóa dưới 0,95x, tức CPU không kịp và hình sẽ giật. Cũng đỏ khi script phát im lặng quá 30 giây.
- **Vàng**: đang nối tới máy chủ RTMP, hoặc chưa điền khóa phát.
- Số "đã nối lại N lần" đếm từ lần khởi động kênh gần nhất. Số này tăng đều thì xem nhật ký của kênh.

**Kiểm tra hình và tiếng** (không cần màn hình):

```bash
sudo bash /opt/chanh-dien-online/deploy/linux/kiem-tra.sh kenh1
```

Lệnh in trạng thái dịch vụ, số overlay đang mở và có tiếng. Nó chụp một ảnh màn hình ảo vào `/var/lib/chanh-dien/anh-kenh1.png` (tải về bằng `scp`), rồi đo âm lượng 8 giây của kênh.

**Thêm kênh**: chạy lại `cai-dat.sh` với đủ danh sách, ví dụ `sudo bash …/cai-dat.sh kenh1 kenh2 kenh3`. Lệnh không ghi đè file cấu hình đã có. Sau đó điền khóa vào `kenh2.env`, `kenh3.env`. Mã kênh phải trùng mã trên bảng tổng (`kenh1`…`kenh4` có sẵn).

**Vận hành hằng ngày**

| Việc | Lệnh |
|---|---|
| Xem nhật ký một kênh | `journalctl -u chanh-dien-kenh@kenh1 -f` |
| Xem nhật ký server | `journalctl -u chanh-dien-server -f` (thêm nhật ký theo ngày ở `/var/lib/chanh-dien/data/logs/`) |
| Trạng thái tất cả | Bảng tổng, hoặc `systemctl status 'chanh-dien-*'` và `curl -s http://127.0.0.1:3000/health` (có cả trạng thái đẩy luồng) |
| Đổi stream key | sửa `/etc/chanh-dien/kenh1.env`. Lần nối lại kế tiếp tự dùng khóa mới; muốn ngay: `sudo systemctl restart chanh-dien-kenh@kenh1` |
| Tạm dừng một kênh | `sudo systemctl stop chanh-dien-kenh@kenh1` (thêm `disable` để khởi động lại máy cũng không chạy) |
| Cập nhật code | `cd /opt/chanh-dien-online && sudo git pull && sudo bash deploy/linux/cai-dat.sh kenh1 kenh2 …` |

**Tự phục hồi khi chạy 24h**

| Sự cố | Cách xử lý |
|---|---|
| ffmpeg rớt (mạng, TikTok ngắt luồng, khóa hết hạn) | Phát lại sau 5 giây. Lỗi liên tiếp thì giãn dần tới 2 phút. Mỗi lần phát lại đọc lại file cấu hình |
| Chưa điền khóa | Kênh vẫn dựng hình và tiếng (xem được bằng `kiem-tra.sh`), cứ 60 giây đọc lại file khóa |
| Chrome chết | Mở lại ngay, mỗi lần một hồ sơ trắng (không có hộp "khôi phục trang", không có trang "có gì mới" sau khi Chrome cập nhật) |
| Overlay mất hình hoặc mất tiếng (server thấy 0 overlay hoặc 0 overlay có tiếng trong ~90 giây) | Mở lại Chrome. Vẫn lỗi thì lần sau chờ lâu hơn, tới tối đa 15 phút |
| Xvfb hoặc PulseAudio chết | systemd dựng lại cả kênh sau 10 giây |
| Server chết | systemd chạy lại sau 5 giây; overlay tự nối lại, không cần mở lại Chrome |
| VPS khởi động lại | Các dịch vụ đã bật tự chạy; kênh chờ server lên rồi mới mở Chrome |

**Cấu hình VPS gợi ý cho 3–4 kênh 720×1280 30fps**

Mỗi kênh tốn CPU cho hai việc: Chrome vẽ overlay bằng CPU (không có card đồ họa), và x264 *veryfast* mã hóa hình. Ước tính 2–3 vCPU và khoảng 1–1,5 GB RAM mỗi kênh.

| Số kênh | vCPU | RAM | Upload |
|---|---|---|---|
| 1 (chạy thử) | 4 | 4 GB | ≥ 10 Mbps |
| 3 | 8–10 | 8 GB | ≥ 20 Mbps |
| 4 | 10–12 | 12–16 GB | ≥ 25 Mbps |

- Nên chọn gói **vCPU riêng (dedicated)**. vCPU dùng chung hay bị máy khác chiếm, làm hình giật và rớt khung.
- 1080×1920 tốn gần gấp đôi CPU so với 720×1280; trên VPS không có card đồ họa nên giữ 720×1280.
- Con số trên là ước tính, chưa đo trên VPS thật. Chạy **một kênh trước**, xem `top` vài giờ. CPU dưới 70% thì thêm kênh. CPU cao thì đổi `X264_PRESET=superfast` hoặc hạ `FPS=25` trong file `.env` của kênh.
- **Cập nhật tự động**: `unattended-upgrades` mặc định không tự khởi động lại máy; đừng bật `Automatic-Reboot`. Lỡ khởi động lại thì các dịch vụ tự chạy lại.

**Tình trạng kiểm thử phần Linux**

- Đã kiểm trên máy phát triển: dùng đúng bộ tham số ffmpeg của script, đẩy RTMP tới một server RTMP cục bộ (`ffmpeg -listen 1`). Luồng nhận được là H.264 High 720×1280 30fps + AAC 44,1 kHz stereo, khoảng 3,2 Mbps, khung khóa đúng mỗi 2 giây; khóa kiểu TikTok có `?…&…` đi qua nguyên vẹn. Chrome bật cờ autoplay mở overlay thì server báo "1 overlay, 1 có tiếng" (đúng cái bộ canh overlay đọc). Phần đo hình và tiếng của `kiem-tra.sh` phân biệt được có tiếng và im lặng. Dòng "Đẩy luồng" đi đúng các bước đang khởi động → đang nối → đang phát (có fps, kbps, tốc độ) → rớt chờ phát lại, và hiện đúng trên bảng tổng. File trạng thái không chứa khóa phát.
- **Chưa kiểm**, vì máy phát triển không có WSL/Docker: chạy thật Xvfb + PulseAudio + Chrome kiosk + chụp `x11grab`/`pulse` trên Linux, `cai-dat.sh`, các unit systemd, mức CPU thực tế, và đẩy lên TikTok thật. Lần đầu cài lên VPS, chạy `kiem-tra.sh` và xem `journalctl` trước khi bấm phát.

## 5. Để các kênh không bị coi là nội dung trùng lặp

TikTok cho phép một người có nhiều tài khoản nhưng "không để lừa dối người khác hay vi phạm quy tắc", và nội dung "không nguyên bản hoặc dùng lại mà không thêm gì mới" thì không được đề xuất. Bốn kênh phát y hệt nhau cùng lúc rất dễ rơi vào trường hợp này. Mỗi kênh nên khác nhau thật sự:

- Tên thiền đường, dòng phụ, giọng đọc (Nam Minh / Hoài My), nhịp tụng, nhịp nhắc thiền khác nhau (bảng điều khiển từng kênh).
- Nhạc riêng cho từng kênh (`assets/music/kenh1/`…).
- Tốt nhất là mỗi kênh một chủ đề, một khung giờ, và có người thật ghé vào nói chuyện, trả lời bình luận định kỳ.
