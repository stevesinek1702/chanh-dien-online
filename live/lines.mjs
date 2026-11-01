// Câu nói tự động của thiền đường.
// Nguyên tắc, theo quy định TikTok LIVE ("nội dung tìm cách thao túng người xem tặng quà" không đủ điều kiện đề xuất
// và kiếm tiền) và tinh thần nhà Phật:
//  • quà chỉ được cảm ơn và chúc chung, không hứa phước báu, công đức hay cầu nguyện riêng để đổi lấy quà
//  • lời cầu an, hồi hướng dành cho mọi người bình luận như nhau, có tặng quà hay không cũng vậy
//  • không xin quà, không kêu gọi thả tim, theo dõi để đổi lấy bất cứ điều gì
// Câu được chọn ngẫu nhiên và tránh lặp lại câu vừa nói, mỗi kênh một thứ tự riêng.

// Quà: lời cảm ơn và lời CHÚC (không "nguyện cầu", không nhắc phước báu, công đức). Quà lớn (từ 99 xu) luôn có tiếng chuông.
export const THANK = {
  small: [
    'Cảm ơn {name} đã gửi {gift}. Chúc bạn lòng nhẹ như mây, bước chân an như đất.',
    'A Di Đà Phật, cảm ơn {name} đã gửi {gift}. Chúc bạn một ngày êm đềm như mặt hồ không gió.',
    'Cảm ơn {name} đã gửi {gift}. Mong nụ cười luôn ở trên môi, và bình yên luôn ở trong lòng bạn.',
    'Cảm ơn {name}. Như đóa sen nhỏ giữa hồ, chúc bạn luôn tươi mát giữa những bộn bề.',
    '{gift} của {name} vừa đến thiền đường. Cảm ơn bạn, chúc bạn thân khỏe, tâm an.',
    'Cảm ơn {name} đã gửi {gift}. Chúc mỗi hơi thở của bạn hôm nay đều nhẹ nhàng, thong thả.',
    'Xin cảm ơn {name}. Chúc bạn đi đâu cũng gặp người hiền, làm gì cũng gặp duyên lành.',
    'Cảm ơn {name} đã gửi {gift}. Chúc bạn và người thương luôn khỏe mạnh, đủ đầy.',
    'A Di Đà Phật. Cảm ơn tấm lòng của {name}. Chúc bạn tìm thấy niềm vui trong từng việc nhỏ.',
  ],
  mid: [
    'Thiền đường xin cảm ơn {name} đã gửi tặng {gift}. Chúc bạn thân an, tâm lạc, nhà cửa ấm êm, công việc thuận hòa.',
    'Cảm ơn {name} đã gửi tặng {gift}. Chúc bạn sáng thức dậy thấy lòng nhẹ nhõm, tối trở về có người thương chờ đợi.',
    'A Di Đà Phật. Xin cảm ơn {name} với món quà {gift}. Chúc bạn gặp nhiều duyên lành, đi đâu cũng được người thương mến.',
    'Cảm ơn {name} đã gửi tặng {gift}. Như hương trầm lan nhẹ trong thiền đường, chúc sự an yên cũng lan đến bạn và gia đình.',
    'Xin chân thành cảm ơn {name}. Chúc bạn vững như núi trước gió, mềm như nước quanh đá, an nhiên giữa đời.',
    'Cảm ơn {name} đã gửi tặng {gift}. Chúc những điều bạn đang lo được nhẹ dần, những điều bạn đang mong sớm thành tựu.',
    'Thiền đường cảm ơn {name}. Chúc bạn có sức khỏe để làm điều mình thích, có bình yên để thương những người mình thương.',
  ],
  big: [
    'Thiền đường xin chắp tay cảm ơn {name} đã gửi tặng {gift}. Kính chúc bạn và gia đình thân tâm an lạc, phúc lộc đầy nhà, vạn sự như ý.',
    'Tiếng chuông vừa ngân lên, thiền đường xin trân trọng cảm ơn {name} đã gửi tặng {gift}. Chúc bạn như sen tỏa hương giữa đầm, như trăng rằm sáng giữa trời.',
    'Xin cảm ơn tấm lòng rộng mở của {name} với món quà {gift}. Chúc bạn sức khỏe dồi dào, trí tuệ sáng suốt, gia đạo bình an, mọi việc hanh thông.',
    'A Di Đà Phật. Cảm ơn {name} đã gửi tặng {gift} và đã ngồi lại cùng mọi người hôm nay. Chúc bạn qua ngày giông gió vẫn giữ được lòng bình lặng, gặp ngày nắng đẹp lại càng thêm rạng rỡ.',
    'Trân trọng cảm ơn {name} đã gửi tặng {gift}. Chúc bạn và những người thân yêu luôn khỏe mạnh, luôn có nhau, mỗi ngày đều thấy đủ đầy.',
    'Theo tiếng chuông này, thiền đường gửi lời cảm ơn sâu sắc đến {name} vì {gift}. Chúc bạn tâm sáng như gương, lòng rộng như biển, đời an như núi.',
  ],
  group: [
    'Thiền đường xin cảm ơn {names} đã gửi quà. Chúc các bạn và gia đình thân an, tâm lạc, mọi điều tốt lành.',
    'Cảm ơn {names}. Chúc các bạn một ngày êm đềm, lòng nhẹ như mây, bước chân thong thả.',
    'A Di Đà Phật, cảm ơn {names} đã gửi những món quà dễ thương. Chúc mọi người luôn khỏe mạnh, an vui bên người thương.',
    'Xin cảm ơn {names}. Như những đóa sen cùng nở trong một hồ, chúc các bạn cùng an yên, cùng hạnh phúc.',
    'Cảm ơn {names} đã gửi quà và ngồi lại cùng thiền đường. Chúc các bạn gặp nhiều duyên lành, mọi việc hanh thông.',
  ],
};

export const WELCOME = {
  one: [
    'Chào mừng {name} đã vào thiền đường.',
    'A Di Đà Phật, chào {name}. Mời bạn an tọa, thở nhẹ và thư giãn.',
    'Hoan hỷ chào đón {name}. Chúc bạn có những phút giây an yên ở đây.',
    'Chào {name}. Mời bạn ngồi xuống, buông bỏ mọi lo toan một chút nhé.',
    'Thiền đường chào đón {name}. Mời bạn cùng thở và lắng nghe.',
  ],
  group: [
    'Chào mừng {names} đã vào thiền đường. Mời mọi người an tọa.',
    'Hoan hỷ chào đón {names}. Chúc các bạn những phút giây tĩnh lặng.',
    'A Di Đà Phật, chào {names}. Mời các bạn ngồi xuống, thở nhẹ và thư giãn.',
  ],
};

export const FOLLOW = {
  one: ['Cảm ơn {name} đã theo dõi kênh.', 'Cảm ơn {name} đã theo dõi. Hẹn gặp lại bạn ở những buổi thiền sau.', 'Cảm ơn {name} đã theo dõi thiền đường. Chúc bạn an vui.'],
  group: ['Cảm ơn {names} đã theo dõi kênh.', 'Cảm ơn {names} đã theo dõi. Hẹn gặp lại các bạn ở những buổi thiền sau.'],
};

export const SHARE = {
  one: ['Cảm ơn {name} đã chia sẻ buổi thiền với mọi người.', 'Cảm ơn {name} đã lan tỏa sự bình yên này.'],
  group: ['Cảm ơn {names} đã chia sẻ buổi thiền với mọi người.'],
};

// Lời cầu an đáp lại bình luận có ý cầu nguyện. Đọc theo chủ đề, không đọc nguyên văn bình luận của người xem.
// Chỉ khớp nguyên từ: "cua cốm" không được hiểu thành "ốm".
function words(...list){ return new RegExp(`(?<!\\p{L})(${list.join('|')})(?!\\p{L})`, 'u'); }
export const PRAYER_TOPICS = [
  // Chỉ những từ chắc chắn nói về người đã khuất ("mới mất việc", "người mất ví" không được coi là tang).
  // Không nhắc riêng người đã mất: nguyện chung cho Cửu Huyền Thất Tổ, tên người xem đứng đầu câu là người cùng nguyện.
  { re: words('cầu siêu', 'hương linh', 'vong linh', 'qua đời', 'đã khuất', 'siêu thoát', 'vãng sanh', 'vãng sinh', 'tạ thế', 'từ trần', 'quy tiên', 'lâm chung'), lines: [
    'Thiền đường xin cùng {name} nguyện cho Cửu Huyền Thất Tổ được siêu sanh Tịnh độ.',
    '{name} ơi, thiền đường cùng bạn hồi hướng, nguyện Cửu Huyền Thất Tổ được siêu sanh Tịnh độ, an nhiên nơi cõi lành.',
  ] },
  { re: words('cha mẹ', 'bố mẹ', 'ba mẹ', 'ba má', 'song thân', 'ông bà'), lines: [
    'Nguyện cầu cho song thân của {name} luôn mạnh khỏe, sống lâu cùng con cháu.',
    'Nguyện cho cha mẹ, ông bà của {name} thân tâm an lạc, tuổi già an vui.',
  ] },
  { re: words('sức khỏe', 'sức khoẻ', 'mạnh khỏe', 'mạnh khoẻ', 'mau khỏe', 'mau khỏi', 'khỏi bệnh', 'bệnh', 'ốm', 'bình phục', 'phẫu thuật', 'chữa trị', 'nằm viện', 'ung thư'), lines: [
    'Nguyện cầu cho {name} và người thân sớm an khang, thân tâm nhẹ nhàng.',
    'Nguyện cho người thân của {name} sớm bình phục, bệnh tật tiêu trừ.',
  ] },
  { re: words('công việc', 'làm ăn', 'buôn bán', 'kinh doanh', 'việc làm', 'hanh thông', 'tài lộc'), lines: [
    'Nguyện cầu cho {name} công việc hanh thông, mọi sự thuận lợi.',
    'Nguyện cho {name} làm ăn suôn sẻ, gặp nhiều duyên lành.',
  ] },
  { re: words('thi cử', 'kỳ thi', 'đi thi', 'thi đỗ', 'thi đậu', 'học hành', 'học tập', 'tốt nghiệp'), lines: [
    'Nguyện cầu cho {name} sáng suốt, học hành tấn tới, tâm vững vàng.',
    'Nguyện cho {name} bình tĩnh, tự tin, đạt được ước nguyện học hành.',
  ] },
  { re: words('sám hối'), lines: [
    'Nguyện cho {name} tâm được thanh tịnh, buông bỏ phiền não.',
    'Tùy hỷ tâm sám hối của {name}. Nguyện cho bạn nhẹ lòng, an vui.',
  ] },
  { re: words('bình an', 'gia đạo', 'an lành', 'bình yên', 'an lạc'), lines: [
    'Nguyện cầu cho gia đình {name} luôn bình an, đầm ấm.',
    'Nguyện cho {name} và những người thân yêu luôn được an lành.',
  ] },
  { re: words('cầu cho', 'cầu mong', 'cầu nguyện', 'cầu an', 'nguyện cầu', 'con nguyện', 'xin phật', 'phù hộ', 'gia hộ', 'độ trì'), lines: [
    'Nguyện cho {name} thân tâm an lạc, vạn sự cát tường.',
    'Thiền đường xin cùng {name} nguyện cầu mọi điều tốt lành.',
  ] },
];
export const PRAYER_GROUP = [
  'Thiền đường xin hồi hướng lời nguyện của {names}: nguyện cho các bạn và gia đình thân tâm an lạc, mọi điều tốt lành.',
  'Nguyện cầu cho {names} cùng gia quyến luôn bình an, mạnh khỏe.',
];

// Lời nhắc thiền giữa các thời tụng: nội dung được tạo ra ngay trong buổi LIVE, mỗi lần một khác.
export const MINDFUL = [
  'Mời quý vị nhẹ nhàng thở vào, biết mình đang thở vào. Thở ra, biết mình đang thở ra.',
  'Hãy để đôi vai thả lỏng, lưng thẳng tự nhiên, gương mặt thư giãn.',
  'Mỗi hơi thở là một lần trở về với chính mình. Không cần vội vàng, chỉ cần có mặt ở đây.',
  'Nếu tâm đang xao động, hãy nhẹ nhàng đưa sự chú ý trở về hơi thở.',
  'Buông bỏ những lo toan của ngày hôm nay. Ở đây chỉ có hơi thở và sự tĩnh lặng.',
  'Cảm nhận thân mình đang ngồi vững vàng như núi, hơi thở nhẹ nhàng như gió.',
  'Hãy gửi một lời chúc bình an đến người thân yêu của mình, và đến cả những người mình chưa từng gặp.',
  'Tiếng chuông là lời nhắc trở về. Hãy lắng nghe, và để lòng mình lắng xuống.',
  'Không cần làm gì cả. Chỉ cần ngồi yên, thở, và biết rằng mình đang ở đây.',
  'Thở vào thật sâu, cảm nhận bụng phồng lên. Thở ra thật chậm, cảm nhận cơ thể nhẹ dần.',
  'Những suy nghĩ đến rồi đi như mây trên trời. Mình chỉ lặng lẽ nhìn chúng trôi qua.',
  'Hãy mỉm cười với chính mình. Mình đã làm tốt nhất có thể trong ngày hôm nay.',
];
export const INVITE = [
  'Bạn mới đến? Hãy để lại một dòng bình luận để cùng an tọa với mọi người trong thiền đường.',
  'Xin quý vị giữ lời lẽ hòa nhã, cùng nhau giữ cho thiền đường thanh tịnh.',
  'Bình luận một chữ nam, nữ, sư, ni, tiểu hay cao tăng để đổi y phục cho mình trong thiền đường.',
  'Muốn lên trước bàn thờ đảnh lễ, bạn bình luận lạy Phật, hoặc thắp hương.',
];

/* ---------------------------------------------------------------- tools */
// Tên kiểu chữ lạ (𝓜𝓲𝓷𝓱, 𝐓𝐚̂𝐦, Ｍｉｎｈ) về chữ thường; bỏ ký tự vô hình, đảo chiều chữ, dấu chồng nhiều tầng (zalgo)
// và chữ hình nêm (𒐫) làm giật hình. Lọc xong mà rỗng thì trả chuỗi rỗng.
export function tidyName(s){
  return String(s ?? '').normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '')
    .replace(/[\u{12000}-\u{1254f}]/gu, '')
    .replace(/(\p{M}{2})\p{M}+/gu, '$1')
    .normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, 40);
}
export function joinNames(names){
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} và ${names.at(-1)}`;
}
export function fill(t, vars){ return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''); }
// Random pick that avoids the last few lines said from the same pool.
export function picker(){
  const recent = new Map();
  return pool => {
    const used = recent.get(pool) || [];
    const fresh = pool.filter(l => !used.includes(l));
    const line = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))];
    used.push(line); while (used.length > Math.min(3, pool.length - 1)) used.shift();
    recent.set(pool, used);
    return line;
  };
}
export function prayerTopic(text){
  const t = String(text).toLowerCase().normalize('NFC');
  return PRAYER_TOPICS.find(p => p.re.test(t)) || null;
}
