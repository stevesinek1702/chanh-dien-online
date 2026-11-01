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

Khuyên dùng **VPS Windows** vì làm y hệt máy nhà: cài Node.js, Chrome, OBS, chép thư mục dự án, chạy `Chay-Live.cmd`, cấu hình OBS như mục 2. Điều khiển qua Remote Desktop.

- **Cấu hình gợi ý cho 3–4 kênh** (VPS thường không có card đồ họa, OBS mã hóa bằng CPU x264 *veryfast*, 720×1280 30fps): 8–12 vCPU, 16 GB RAM, băng thông upload ≥ 20 Mbps. Thử một kênh trước, xem CPU, rồi mới thêm.
- **Không mở cổng 3000 ra Internet.** Server cố ý chỉ nghe `127.0.0.1` và không có đăng nhập; vào bảng tổng qua Remote Desktop.
- **Tự chạy khi VPS khởi động lại**: Task Scheduler → *At log on* → chạy `Chay-Live.cmd`; bật tự đăng nhập Windows; OBS thêm tham số `--startstreaming` vào lối tắt của từng profile.
- **IP trung tâm dữ liệu**: TikTok có thể xử lý luồng phát từ IP máy chủ khác với IP nhà mạng, và gói Euler miễn phí giới hạn theo IP. Theo dõi kỹ vài ngày đầu.
- **VPS Linux**: làm được nhưng cần thêm Xvfb, PulseAudio và ffmpeg để dựng overlay rồi đẩy RTMP. Phần đó chưa có trong dự án và chưa được kiểm thử.

## 5. Để các kênh không bị coi là nội dung trùng lặp

TikTok cho phép một người có nhiều tài khoản nhưng "không để lừa dối người khác hay vi phạm quy tắc", và nội dung "không nguyên bản hoặc dùng lại mà không thêm gì mới" thì không được đề xuất. Bốn kênh phát y hệt nhau cùng lúc rất dễ rơi vào trường hợp này. Mỗi kênh nên khác nhau thật sự:

- Tên thiền đường, dòng phụ, giọng đọc (Nam Minh / Hoài My), nhịp tụng, nhịp nhắc thiền khác nhau (bảng điều khiển từng kênh).
- Nhạc riêng cho từng kênh (`assets/music/kenh1/`…).
- Tốt nhất là mỗi kênh một chủ đề, một khung giờ, và có người thật ghé vào nói chuyện, trả lời bình luận định kỳ.
