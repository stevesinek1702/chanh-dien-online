# Đánh giá và nâng cấp dự án (01/11/2026)

## 1. Repo gốc có an toàn không

Nguồn: `github.com/kentjuno/chanh-dien-online`, 4 commit ngày 31/10/2026, giấy phép MIT. Đã đọc toàn bộ mã trước khi kéo về.

- **Không có mã độc**: không chạy lệnh hệ thống, không đọc file ngoài thư mục, không gửi dữ liệu đi đâu ngoài Google Fonts, TikTok (qua thư viện), Euler Stream (máy chủ ký của thư viện) và dịch vụ giọng đọc của Microsoft Edge.
- **Thư viện đúng gốc**: `tiktok-live-connector` 2.5.0 (zerodytrash/isaackogan), `tiktok-live-api-sdk` (EulerStream), `msedge-tts`, `ws`; mã băm trong `package-lock.json` khớp npm. `msedge-tts` có script `preinstall` gọi `npx only-allow pnpm` nên cài bằng `npm ci --ignore-scripts` (không thư viện nào cần bước build).
- **Có một đoạn mã bị làm rối** tên "lantern ambience" trong `overlay.html` và `index.html`: giải mã ra là cứ 5–10 phút hiện dòng "✦ Mã nguồn được chia sẻ bởi Kent Juno ✦" lên màn hình LIVE trong 7 giây. Không độc hại nhưng giấu ý đồ. **Đã xóa**, cùng các dòng ghi công trên giao diện và mục chuyển khoản ủng hộ trong README. File `LICENSE` giữ nguyên vì giấy phép MIT bắt buộc giữ thông báo bản quyền trong mã nguồn (không bắt buộc hiện trên màn hình).

## 2. Lỗi của bản gốc đã sửa

| Lỗi | Hậu quả | Đã sửa |
|---|---|---|
| Thư viện 2.5 đổi tên trường: username là `displayId`, bình luận là `content`, quà là `giftDetails.name`, tim là `count`, người xem là `total` | Bản gốc **không nhận được bình luận nào** từ LIVE thật | Đọc đúng trường mới (vẫn nhận tên cũ) |
| Bật `enableExtendedGiftInfo` | Euler từ chối ("cần gói Business"), **không kết nối được LIVE** | Tắt; tên quà và số xu đã có sẵn trong sự kiện |
| Không tự nối lại | Rớt mạng hoặc TikTok ngắt là overlay đứng im tới khi có người bấm lại | Vòng đời chờ LIVE → nối → rớt thì nối lại, giãn thời gian khi lỗi |
| Giọng đọc treo thì kẹt vĩnh viễn | Sau một lần mạng chập chờn, LIVE mất tiếng đọc | Giới hạn 20 giây mỗi câu |
| Mỗi đoạn âm thanh tạo nút mới trong bộ trộn, không tháo | Rò bộ nhớ, chạy vài giờ là nặng dần | Tháo nút khi phát xong |
| Overlay chưa bật tiếng thì câu đọc dồn vô hạn | Bật tiếng lên là đọc liền một tràng câu cũ | Giữ tối đa 6 câu, bỏ câu cũ hơn 90 giây |
| Chạy nhiều tiến trình cho nhiều kênh dùng chung thư mục giọng đọc và xóa file của nhau | Không chạy song song được | Một server quản nhiều kênh, mỗi kênh thư mục riêng |
| Cài đặt chỉ nằm trong bộ nhớ | Khởi động lại là mất | Lưu `live/data/channels.json` |

## 3. Đã thêm

- **Đa kênh**: một server, tối đa 8 kênh, bảng tổng xem trạng thái tất cả (người xem, bình luận, quà, tim, overlay có hình có tiếng chưa), thêm/xóa/đổi tên kênh, kết nối hoặc ngắt tất cả.
- **Câu nói tự động** (`live/lines.mjs`): cảm ơn quà theo 3 mức và gom nhiều quà thành một câu; chào người mới; đáp lời cầu an theo 8 chủ đề; cảm ơn theo dõi, chia sẻ; lời nhắc thiền giữa các thời tụng. Chọn ngẫu nhiên, tránh lặp, có nhịp tối thiểu nên LIVE đông cũng không nói dồn.
- **Kinh**: vòng 8 bài theo nghi thức phổ thông, văn bản Hán Việt đã đối chiếu; hồi hướng xướng tên người vừa bình luận. Mõ chỉ gõ khi tụng.
- **Lọc chữ**: từ bậy, link, số điện thoại, Zalo/Telegram, "ib tele", kiểu rao "400/1h"; thêm từ riêng trong `live/blocklist.txt`.
- **Chạy dài**: `Chay-Live.cmd` tự khởi động lại, nhật ký theo ngày, `/health`, dọn kết nối chết, `Mo-Overlay.cmd` mở overlay không bị Chrome tạm dừng, overlay tự bật tiếng trong OBS.
- **Kiểm thử**: `npm test` (28 bước) và `npm run soak` (chạy dài đo bộ nhớ).

## 4. Kết quả kiểm thử

- `npm test`: 28/28 đạt, gồm cả giọng đọc thật qua Edge TTS.
- Nối **3 phòng LIVE công khai cùng lúc** trong 90 giây (chỉ đọc, như người xem): nhận 140–186 người xem mỗi phòng, 25 bình luận, tim, theo dõi, chia sẻ; giọng đọc tự chào, đáp lời cầu an, cảm ơn theo dõi, chia sẻ đúng. Chưa gặp quà thật trong lúc thử; đường xử lý quà dựa trên định nghĩa trường của thư viện và đã chạy với quà giả lập.
- Kiểm tra kênh có thật nhưng chưa LIVE: chuyển sang "chờ LIVE, kiểm tra lại mỗi 90 giây".
- Chạy thử dài với 4 overlay trong Chrome ẩn: kết quả ở mục 7.

## 5. Quy định TikTok: đã làm gì, còn rủi ro gì

Đã làm cho nội dung **thật sự hợp lệ** chứ không lách hay che giấu: lách hệ thống phát hiện của TikTok là cách nhanh nhất để mất cả loạt tài khoản.

**Đã xử lý trong code**

- *Quà đổi lấy cầu nguyện, công đức*: bản gốc đọc "Phật tử X thành tâm dâng…" kèm lời nguyện, bảng xếp hạng quà tên "Công Đức", bảng hướng dẫn ghi "Tặng quà được xướng tên hồi hướng". TikTok ghi rõ nội dung "tìm cách thao túng người xem tặng quà" không được đề xuất, và LIVE không đủ điều kiện đề xuất thì cũng không được kiếm tiền. Luật Tín ngưỡng, tôn giáo 2016 cấm lợi dụng hoạt động tôn giáo để trục lợi. Nay quà chỉ được cảm ơn, chúc chung; bảng đổi thành "Tri Ân"; lời cầu an, hồi hướng dành cho mọi người như nhau.
- *Tương tác giả*: người mẫu, bot, quà giả không lên được LIVE thật (tự khóa và dọn khi bấm Kết nối).
- *Ba vị thầy có tên giả* ("Sư Trụ Trì"…) trên màn hình dễ khiến người xem tưởng có tu sĩ thật chủ trì: bỏ tên, giữ hình minh họa.
- *Nội dung AI*: thêm dòng ghi chú hình, nhạc, giọng đọc tạo bằng AI.
- *Bình luận rác lên hình*: lọc trước khi vẽ lên video, vì video là của kênh.

**Code không tự xử lý được, bạn cần cân nhắc**

1. **LIVE không người 24/24**: các bản tổng hợp quy định LIVE xếp phòng trống, không người dẫn vào nhóm chất lượng thấp, bị hạn chế đề xuất và kiếm tiền. Overlay có chuyển động và tương tác thật nên không phải ảnh tĩnh, nhưng vẫn nên có người thật vào nói chuyện, trả lời bình luận định kỳ.
2. **Nhiều kênh cùng một nội dung cùng lúc**: có thể bị coi là nội dung trùng lặp hoặc spam. Làm mỗi kênh khác nhau thật sự (mục 5 của hướng dẫn đa kênh), hoặc lệch khung giờ.
3. **Thư viện không chính thức**: đọc sự kiện qua thư viện cộng đồng và máy chủ ký của bên thứ ba, không phải API TikTok cấp phép. Không đụng vào tài khoản của bạn nhưng có thể ngừng chạy bất cứ lúc nào TikTok đổi hệ thống.
4. **Pháp lý Việt Nam**: tài khoản LIVE có doanh thu phải xác thực theo Nghị định 147/2024; thu nhập từ quà thuộc diện kê khai thuế. Đây là lưu ý chung, không phải tư vấn pháp lý.

## 6. BrowserNest (`D:\rea-main\REA GPM\browsernest`) có giúp LIVE đa kênh không

Đã đọc README, `package.json`, cấu trúc mã; không chạy file `.exe` (chưa ký số).

BrowserNest là trình quản lý profile trình duyệt kiểu antidetect (dựng lại theo GPMLogin): mỗi profile một thư mục dữ liệu riêng, **giả dấu vân tay trình duyệt** (canvas, WebGL, WebRTC, múi giờ, User-Agent…) và **proxy riêng** từng profile.

**Kết luận: không giúp gì cho việc phát LIVE đa kênh, và không nên dùng phần giả dấu vân tay cho TikTok.**

- TikTok không cho phát LIVE từ trình duyệt; phát phải qua LIVE Studio, ứng dụng điện thoại hoặc stream key (OBS). BrowserNest không đẩy được video.
- Server của dự án không cần đăng nhập TikTok nên không cần tách profile.
- Việc hợp lệ duy nhất là giữ đăng nhập 4 tài khoản ở 4 profile riêng để vào LIVE Center lấy stream key hoặc xem bình luận. Hồ sơ người dùng của Chrome làm được việc đó.
- Dùng dấu vân tay giả và proxy để TikTok không nhận ra các tài khoản cùng một người vận hành chính là kiểu hành vi mà quy định "nhiều tài khoản được, nhưng không để lừa dối người khác hay vi phạm quy tắc" nhắm tới. Khi bị phát hiện, các tài khoản liên kết thường bị xử lý cả loạt.

## 7. Chạy thử dài (soak)

`npm run soak -- 25`: 4 kênh, 4 overlay trong Chrome ẩn (mỗi overlay một cửa sổ), 40 bot mỗi kênh, tụng kinh mỗi 2 phút, nhắc thiền mỗi 3 phút, giọng đọc thật qua Edge TTS.

| Phút | Server RSS / heap (MB) | Bộ nhớ JS overlay (MB, 4 kênh) | Âm thanh | FPS |
|---|---|---|---|---|
| 0 | 71 / 11 | 1,2 · 0,8 · 0,9 · 1,5 | bật | 31–41 |
| 11 | 74 / 11 | 1,3 · 1,2 · 1,2 · 1,5 | bật | 47–49 |
| 15 | 80 / 12 | 0,9 · 1,1 · 1,4 · 0,9 | bật | 44–48 |
| 25 | 75 / 11 | 1,6 · 1,1 · 1,0 · 1,0 | bật | 33–34 |

Kết quả: heap server nửa sau thấp hơn nửa đầu 0,8 MB, heap overlay không đổi, RSS dao động 70–80 MB không tăng dần, âm thanh bật suốt 25 phút. **Không thấy rò bộ nhớ.**

Có 9 lần dịch vụ giọng đọc Edge trả chậm quá 20 giây hoặc đóng giữa chừng, rơi vào lúc đang chạy song song các bài test khác cũng gọi Edge. Mỗi lần chỉ mất đúng một câu; hàng đợi chạy tiếp bình thường. Khi LIVE thật, thỉnh thoảng mất một câu đọc là bình thường; nhật ký `live/data/logs/` ghi lại từng lần.
