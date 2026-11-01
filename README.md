# Chánh Điện Tịnh Tâm

Thiền đường 2.5D cho TikTok LIVE, chạy **nhiều kênh cùng lúc** từ một máy. Người xem bình luận là bước vào thiền đường, ngồi xuống bồ đoàn. Có nhạc nền, chuông, mõ theo thời tụng, tụng kinh định kỳ, lời nhắc thiền, và giọng đọc tiếng Việt tự chào người mới, đáp lời cầu an, cảm ơn quà, theo dõi, chia sẻ.

| Thư mục | Là gì |
|---|---|
| `live/` | Bộ phát LIVE: server Node đa kênh, bảng tổng, bảng điều khiển từng kênh, overlay 9:16 |
| `index.html`, `assets/` | Bản web tĩnh để tự vào ngồi thử, và hình, nhạc dùng chung |
| `deploy/linux/` | Phát 24h trên VPS Linux không màn hình: Xvfb, PulseAudio, Chrome, ffmpeg, systemd |
| `docs/` | Hướng dẫn chạy nhiều kênh, chạy 24h trên VPS, báo cáo đánh giá |

## Chạy

Cần Node.js 20 trở lên. Trên Windows, bấm đúp **`Chay-Live.cmd`**: lần đầu tự cài thư viện, mở bảng tổng, và tự khởi động lại server nếu có sự cố (phù hợp LIVE 10h, 24h).

Hoặc chạy tay:

```bash
cd live
npm ci --ignore-scripts
npm start
```

1. Mở `http://localhost:3000/`: **bảng tổng**, mặc định có 4 kênh (thêm được tới 8).
2. Mỗi kênh: nhập `@username` TikTok rồi bấm **Kết nối**. Bấm trước hay sau khi lên LIVE đều được: server tự chờ đến lúc kênh LIVE, rớt mạng thì tự nối lại.
3. Đưa overlay của từng kênh vào phần mềm phát:
   - **OBS** (khuyên dùng khi phát nhiều kênh): Browser source trỏ tới `http://localhost:3000/live/overlay.html?ch=kenh1`, 1080×1920, tích *Control audio via OBS*. Âm thanh tự bật.
   - **TikTok LIVE Studio** (một kênh): chạy `Mo-Overlay.cmd`, rồi *Add source → Window capture* chọn cửa sổ overlay.
4. Bảng điều khiển từng kênh (`/live/control.html?ch=kenh1`): giọng đọc, nhạc, mõ, thời tụng, câu nói tự động, tên thiền đường, thử tương tác.

Chưa LIVE vẫn thử được: **Thử tương tác**, **Đổ người mẫu**, **Bot mô phỏng**. Khi bấm Kết nối TikTok, phần giả lập tự bị khóa và người mẫu, bot được dọn khỏi màn hình, để không có tương tác giả nào lên LIVE thật.

Chạy nhiều kênh, chạy 24h, chạy trên VPS: xem [docs/HUONG-DAN-DA-KENH.md](docs/HUONG-DAN-DA-KENH.md).

### Người xem làm được gì

- **Bình luận bất kỳ**: vào ngồi (tối đa 100 chỗ, tự mở rộng 24 → 36 → 64 → 100), được chào bằng giọng đọc.
- **Bình luận có ý cầu nguyện** (cầu an, cầu siêu, cha mẹ, sức khỏe, công việc, thi cử, sám hối…): giọng đọc đáp một lời cầu an theo chủ đề. Ai bình luận cũng như nhau, không phụ thuộc quà.
- **Bình luận đúng một từ** `nam`, `nữ`, `sư`, `ni`, `tiểu`, `bà`, `cao tăng`: đổi hình nhân vật.
- **Tặng quà**: hiệu ứng theo giá trị quà, lời cảm ơn (gom nhiều quà liên tiếp thành một câu), tên lên bảng *Tri Ân*.
- **Thả tim, theo dõi, chia sẻ**: tim bay trên đầu nhân vật, lời cảm ơn.

### Nhạc, kinh, thiền

- **Kinh**: một vòng thời khóa ngắn theo nghi thức phổ thông: Kệ khai kinh → Bát Nhã Tâm Kinh → Niệm Phật, Vãng sanh → Quán Thế Âm → Sám nguyện → Hồi hướng (kèm tên những người vừa bình luận). Văn bản Hán Việt truyền thống, không vướng bản quyền.
- **Mõ** chỉ gõ trong lúc tụng; giữa các thời tụng là khoảng thiền yên lặng có nhạc nền, chuông và lời nhắc thở.
- **Nhạc**: mọi file `.mp3` trong `assets/music/`. Muốn mỗi kênh nhạc riêng, tạo thư mục `assets/music/kenh1/`, `assets/music/kenh2/`… Chỉ dùng nhạc tự làm, nhạc AI bạn có quyền dùng, hoặc nhạc có giấy phép cho phép phát LIVE. Nhạc Phật giáo trên mạng phần lớn có chủ sở hữu và có thể khiến LIVE bị tắt tiếng hoặc dừng.

## An toàn và tuân thủ

- **Không dùng tài khoản TikTok.** Server chỉ đọc sự kiện công khai của phòng LIVE theo username, không cần, không hỏi, không lưu mật khẩu hay cookie.
- **Chỉ mở trên máy mình.** Server nghe `127.0.0.1`; Host phải là localhost (chống DNS rebinding); WebSocket chỉ nhận trang của chính server; overlay chỉ nghe, không gửi lệnh được.
- **File tĩnh theo danh sách trắng**: chỉ `/assets` và `/live`, chỉ đuôi trang và media; mã nguồn, cấu hình, `data/`, `node_modules`, `.git` đều trả 404.
- **Lọc chữ lên màn hình**: bình luận và tên có từ bậy, link, số điện thoại, Zalo/Telegram, kiểu rao "400/1h" không hiện lên LIVE. Thêm từ riêng trong `live/blocklist.txt`.
- **Quà không đổi lấy cầu nguyện**: quà chỉ được cảm ơn và chúc chung. Lời cầu an, hồi hướng dành cho mọi người như nhau. Theo quy định TikTok, nội dung tìm cách thao túng người xem tặng quà không được đề xuất và không được kiếm tiền; luật Việt Nam cấm lợi dụng hoạt động tôn giáo để trục lợi.
- **Ghi rõ AI**: dòng nhỏ "hình minh họa, nhạc và giọng đọc tạo bằng AI" trên overlay (tắt được).

Những rủi ro code không tự xử lý được (LIVE không người, nhiều kênh cùng nội dung, thư viện không chính thức) được ghi trong [docs/DANH-GIA.md](docs/DANH-GIA.md).

## Kiểm tra

```bash
cd live
npm test           # 28 bước: bảo mật, tách kênh, lọc chữ, khóa giả lập, giọng đọc, lưu cấu hình
npm run soak -- 30 # chạy thử 30 phút với 4 overlay và bot, đo bộ nhớ, để bắt rò rỉ trước khi LIVE dài
```

## Ghi chú

- `tiktok-live-connector` là thư viện cộng đồng, không phải API chính thức của TikTok; nó dùng máy chủ ký của Euler Stream. Gói miễn phí giới hạn lượt kết nối theo IP; chạy từ 2 kênh trở lên nên đăng ký khóa miễn phí ở eulerstream.com và đặt `SIGN_API_KEY` (xem `Chay-Live.cmd`).
- Giọng đọc dùng dịch vụ Read Aloud của Microsoft Edge qua mạng (giọng Nam Minh, Hoài My).
- Hình ảnh trong `assets/` tạo bằng Google Flow, nhạc nền tạo bằng Gemini. Kiểm tra điều khoản của các dịch vụ đó trước khi dùng thương mại, hoặc thay bằng tài nguyên của bạn.
- Dự án không đại diện cho chùa hay tổ chức tôn giáo nào. Xin giữ sự tôn kính khi dùng nội dung Phật giáo.

## Giấy phép

MIT, xem `LICENSE`.
