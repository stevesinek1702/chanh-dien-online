// Câu nói tự động của thiền đường.
// Nguyên tắc, theo quy định TikTok LIVE ("nội dung tìm cách thao túng người xem tặng quà" không đủ điều kiện đề xuất
// và kiếm tiền) và tinh thần nhà Phật:
//  • quà chỉ được cảm ơn và chúc chung, không hứa phước báu, công đức hay cầu nguyện riêng để đổi lấy quà
//  • lời cầu an, hồi hướng dành cho mọi người bình luận như nhau, có tặng quà hay không cũng vậy
//  • không xin quà, không kêu gọi thả tim, theo dõi để đổi lấy bất cứ điều gì
// Câu được chọn ngẫu nhiên và tránh lặp lại câu vừa nói, mỗi kênh một thứ tự riêng.

export const THANK = {
  small: [
    'Xin cảm ơn {name} đã gửi tặng {gift}.',
    'Cảm ơn {name} đã ghé thăm và gửi tặng {gift}. Chúc bạn một ngày an lành.',
    '{name} vừa gửi tặng {gift}. Xin cảm ơn tấm lòng của bạn.',
    'Cảm ơn {name} nhiều nhé. Chúc bạn thân tâm nhẹ nhàng.',
    'Xin ghi nhận và cảm ơn {name} đã gửi tặng {gift}.',
    'Cảm ơn {name}. Chúc bạn và gia đình luôn mạnh khỏe.',
    'Cảm ơn {name} đã gửi tặng {gift}. Mong bạn ngồi lại thêm chút nữa, cùng thở và thư giãn.',
  ],
  mid: [
    'Xin chân thành cảm ơn {name} đã gửi tặng {gift}. Chúc bạn và gia đình luôn bình an, mạnh khỏe.',
    'Cảm ơn {name} đã gửi tặng {gift}. Mong bạn có những giây phút tĩnh lặng thật an yên tại đây.',
    '{name} vừa gửi tặng {gift}. Xin cảm ơn bạn, chúc bạn mọi việc hanh thông.',
    'Thiền đường cảm ơn {name} đã gửi tặng {gift}. Chúc bạn một ngày thật nhẹ nhàng.',
    'Xin cảm ơn {name} vì món quà {gift}. Chúc bạn luôn vui khỏe, bình yên.',
  ],
  big: [
    'Xin chân thành cảm ơn {name} đã gửi tặng {gift}. Cảm ơn bạn đã đồng hành cùng thiền đường hôm nay. Chúc bạn và gia đình luôn an lạc, vạn sự tốt lành.',
    'Thiền đường xin trân trọng cảm ơn {name} đã gửi tặng {gift}. Chúc bạn sức khỏe dồi dào, tâm luôn an tịnh.',
    'Xin cảm ơn tấm lòng của {name} với món quà {gift}. Mong bạn luôn giữ được sự bình yên trong từng hơi thở.',
    'Cảm ơn {name} rất nhiều vì {gift}. Chúc bạn và những người thân yêu một cuộc sống đầm ấm, an vui.',
  ],
  group: [
    'Xin cảm ơn {names} đã gửi quà tặng. Chúc các bạn một ngày bình an.',
    'Cảm ơn {names} rất nhiều. Chúc các bạn và gia đình luôn mạnh khỏe.',
    'Thiền đường xin cảm ơn {names} đã gửi tặng những món quà dễ thương. Chúc mọi người an lạc.',
    'Xin cảm ơn {names}. Chúc các bạn luôn bình yên, mọi việc thuận lợi.',
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
  { re: words('cầu siêu', 'hương linh', 'vong linh', 'người mất', 'qua đời', 'đã khuất', 'siêu thoát', 'vãng sanh', 'vãng sinh', 'tạ thế', 'mới mất'), lines: [
    'Nguyện cầu hương linh người thân của {name} được an nghỉ, siêu sanh Tịnh độ.',
    'Thiền đường cùng {name} hồi hướng đến người thân đã khuất, nguyện hương linh được nhẹ nhàng, thanh thản.',
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
  'Bình luận một chữ nam, nữ, sư, ni, tiểu, bà hay cao tăng để đổi y phục cho mình trong thiền đường.',
];

/* ---------------------------------------------------------------- tools */
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
