import { hm } from './time'
import type { CategoryId, City, CityId, Poi } from './types'

/**
 * Demo dataset. Coordinates, hours and prices are approximate and exist to exercise the planner;
 * the production service would read them from PostgreSQL + PostGIS (report §5.4).
 */
export const cities: City[] = [
  { id: 'ha-noi', name: 'Hà Nội', nameEn: 'Hanoi', lat: 21.0285, lng: 105.8542, roadKmh: 20, radiusKm: 8, tint: '#4a2c2a', tagline: ['Nghìn năm văn hiến, phố cổ ngổn ngang', 'A thousand years of culture in tangled old streets'] },
  { id: 'ninh-binh', name: 'Ninh Bình', nameEn: 'Ninh Binh', lat: 20.2506, lng: 105.9745, roadKmh: 30, radiusKm: 20, tint: '#173f35', tagline: ['Núi đá vôi soi bóng nước', 'Limestone cliffs in still water'] },
  { id: 'ha-long', name: 'Hạ Long', nameEn: 'Ha Long', lat: 20.9101, lng: 107.1839, roadKmh: 28, radiusKm: 16, tint: '#0c3440', tagline: ['Kỳ quan của đảo đá và sương sớm', 'Islands of stone and morning mist'] },
  { id: 'ha-giang', name: 'Hà Giang', nameEn: 'Ha Giang', lat: 23.0, lng: 105.2, roadKmh: 22, radiusKm: 55, tint: '#0f3128', tagline: ['Cao nguyên đá, đèo mây và hoa tam giác mạch', 'Stone plateau, cloud passes and buckwheat flowers'] },
  { id: 'hoi-an', name: 'Hội An', nameEn: 'Hoi An', lat: 15.8801, lng: 108.338, roadKmh: 24, radiusKm: 8, tint: '#3a2310', tagline: ['Phố cổ đèn lồng, đi chậm mới thấy', 'Lantern-lit old town, best at a slow pace'] },
  { id: 'sai-gon', name: 'Sài Gòn', nameEn: 'Saigon', lat: 10.7769, lng: 106.7009, roadKmh: 17, radiusKm: 9, tint: '#14202b', tagline: ['Thành phố không ngủ bên sông', 'The city that never sleeps, by the river'] },
  { id: 'phu-quoc', name: 'Phú Quốc', nameEn: 'Phu Quoc', lat: 10.19, lng: 104.0, roadKmh: 34, radiusKm: 28, tint: '#103a43', tagline: ['Biển xanh, hoàng hôn và hải sản tươi', 'Blue sea, sunsets and fresh seafood'] },
  { id: 'da-lat', name: 'Đà Lạt', nameEn: 'Da Lat', lat: 11.9404, lng: 108.4583, roadKmh: 25, radiusKm: 12, tint: '#2c3a22', tagline: ['Sương mù, đồi thông và cà phê', 'Mist, pine hills and coffee'] },
]

export const cityById = Object.fromEntries(cities.map((c) => [c.id, c])) as Record<CityId, City>

function p(
  city: CityId,
  id: string,
  name: string,
  cat: CategoryId,
  lat: number,
  lng: number,
  hours: string,
  visit: number,
  cost: number,
  rating: number,
  pop: number,
  indoor: 0 | 1,
  tags: string,
  area: string,
  vi: string,
  en: string,
): Poi {
  const [open, close] = hours.split('-').map(hm)
  return {
    id,
    city,
    name,
    cat,
    lat,
    lng,
    open,
    close,
    visit,
    cost,
    rating,
    pop,
    indoor: indoor === 1,
    tags: tags.split(',').filter(Boolean),
    area,
    blurb: [vi, en],
    url: `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${cityById[city].name}`)}`,
  }
}

export const pois: Poi[] = [
  // ── Hà Nội
  p('ha-noi', 'hn-hoan-kiem', 'Hồ Hoàn Kiếm & đền Ngọc Sơn', 'culture', 21.0288, 105.8522, '06:00-22:00', 60, 30000, 4.7, 95, 0, 'lake,walk,temple', 'Hoàn Kiếm', 'Dạo quanh hồ, qua cầu Thê Húc sơn đỏ vào đền Ngọc Sơn.', 'Stroll the lake and cross the red Huc Bridge to Ngoc Son Temple.'),
  p('ha-noi', 'hn-van-mieu', 'Văn Miếu – Quốc Tử Giám', 'culture', 21.0287, 105.8355, '08:00-17:00', 75, 70000, 4.6, 80, 0, 'history,temple', 'Đống Đa', 'Trường đại học đầu tiên của Việt Nam, sân vườn cổ kính.', "Vietnam's first university, set in quiet courtyards."),
  p('ha-noi', 'hn-lang-bac', 'Quảng trường Ba Đình & Lăng Bác', 'culture', 21.0368, 105.8346, '07:30-11:00', 90, 0, 4.6, 78, 0, 'history,landmark', 'Ba Đình', 'Nơi nghỉ của Chủ tịch Hồ Chí Minh; chỉ mở cửa buổi sáng.', 'Mausoleum of Ho Chi Minh; open in the morning only.'),
  p('ha-noi', 'hn-hoang-thanh', 'Hoàng thành Thăng Long', 'culture', 21.0347, 105.84, '08:00-17:00', 80, 30000, 4.5, 70, 0, 'history,unesco', 'Ba Đình', 'Di sản UNESCO với những lớp dấu tích hơn 1.000 năm.', 'A UNESCO site layered with over a thousand years of history.'),
  p('ha-noi', 'hn-hoa-lo', 'Nhà tù Hỏa Lò', 'culture', 21.0258, 105.8461, '08:00-17:00', 60, 50000, 4.5, 74, 1, 'history,museum', 'Hoàn Kiếm', 'Bảo tàng về giai đoạn đấu tranh giành độc lập.', 'A museum on the struggle for independence.'),
  p('ha-noi', 'hn-ca-phe-trung', 'Cà phê trứng Giảng', 'cafe', 21.0337, 105.8523, '07:00-22:00', 45, 40000, 4.6, 88, 1, 'egg-coffee,vegetarian', 'Hoàn Kiếm', 'Ly cà phê trứng béo mịn đã thành đặc sản Hà Nội.', "Silky egg coffee, Hanoi's signature."),
  p('ha-noi', 'hn-bun-cha', 'Bún chả Hương Liên', 'food', 21.0166, 105.8566, '08:00-20:30', 50, 90000, 4.5, 85, 1, 'pork,noodles', 'Hai Bà Trưng', 'Bún chả nướng than hoa, nổi tiếng sau một bữa trưa cùng ông Obama.', 'Charcoal-grilled bun cha, famous since a certain presidential lunch.'),
  p('ha-noi', 'hn-pho-co-dem', 'Phố cổ & chợ đêm cuối tuần', 'market', 21.0383, 105.8497, '18:00-23:00', 90, 100000, 4.4, 82, 0, 'night-market,street-food,shopping', 'Hoàn Kiếm', 'Ăn vặt, mua quà và lang thang giữa 36 phố phường.', 'Snacks, souvenirs and wandering the 36 streets.'),
  // ── Ninh Bình
  p('ninh-binh', 'nb-trang-an', 'Quần thể danh thắng Tràng An', 'nature', 20.2517, 105.9142, '07:00-16:30', 150, 250000, 4.8, 96, 0, 'boat,karst,unesco', 'Hoa Lư', 'Chèo đò xuyên hang động giữa núi đá vôi; di sản UNESCO.', 'Row through caves beneath limestone towers; UNESCO listed.'),
  p('ninh-binh', 'nb-tam-coc', 'Tam Cốc – Bích Động', 'nature', 20.2147, 105.9328, '07:00-16:30', 140, 200000, 4.7, 90, 0, 'boat,rice-field', 'Hoa Lư', 'Đò trên sông Ngô Đồng giữa cánh đồng lúa chín.', 'Boat along the Ngo Dong river past ripening rice.'),
  p('ninh-binh', 'nb-hang-mua', 'Hang Múa', 'adventure', 20.2301, 105.9387, '06:30-18:00', 90, 100000, 4.7, 88, 0, 'hike,viewpoint', 'Hoa Lư', '500 bậc đá lên đỉnh để ngắm toàn cảnh Tam Cốc.', '500 stone steps up for a panorama of Tam Coc.'),
  p('ninh-binh', 'nb-hoa-lu', 'Cố đô Hoa Lư', 'culture', 20.287, 105.9059, '07:30-17:00', 70, 20000, 4.4, 60, 0, 'history,temple', 'Hoa Lư', 'Kinh đô đầu tiên của nhà nước phong kiến tập quyền.', 'The first capital of a centralised Vietnamese state.'),
  p('ninh-binh', 'nb-bai-dinh', 'Chùa Bái Đính', 'culture', 20.2745, 105.8546, '07:00-18:00', 100, 0, 4.6, 80, 0, 'temple', 'Gia Viễn', 'Quần thể chùa lớn nhất Đông Nam Á với tượng Phật đồng.', 'The largest temple complex in Southeast Asia.'),
  p('ninh-binh', 'nb-de-nui', 'Dê núi & cơm cháy Cố Đô', 'food', 20.2506, 105.9745, '11:00-21:00', 60, 180000, 4.4, 70, 1, 'goat,rice', 'Ninh Bình', 'Dê núi tái chanh ăn cùng cơm cháy giòn rụm.', 'Lemon-cured mountain goat with crispy rice.'),
  p('ninh-binh', 'nb-thung-nham', 'Vườn chim Thung Nham', 'nature', 20.2837, 105.8886, '07:30-17:00', 90, 120000, 4.3, 55, 0, 'birds,boat', 'Hoa Lư', 'Đò xuyên hang và rừng ngập nước, hàng nghìn cò về tổ.', 'Boat through caves and flooded forest as egrets roost.'),
  // ── Hạ Long
  p('ha-long', 'hl-vinh', 'Du thuyền vịnh Hạ Long', 'nature', 20.9293, 107.042, '08:00-16:00', 240, 600000, 4.8, 97, 0, 'cruise,karst,unesco', 'Tuần Châu', 'Lênh đênh giữa hàng nghìn đảo đá; di sản thiên nhiên thế giới.', 'Drift among thousands of limestone islands.'),
  p('ha-long', 'hl-sung-sot', 'Hang Sửng Sốt', 'nature', 20.8777, 107.0914, '07:30-17:00', 70, 120000, 4.6, 85, 0, 'cave', 'Vịnh Hạ Long', 'Hang động rộng và đẹp nhất vịnh, nhũ đá đủ hình thù.', 'The largest cave of the bay, full of stalactites.'),
  p('ha-long', 'hl-ti-top', 'Đảo Ti Tốp', 'beach', 20.8566, 107.0951, '08:00-17:00', 90, 100000, 4.6, 80, 0, 'swim,viewpoint', 'Vịnh Hạ Long', 'Leo 400 bậc ngắm vịnh rồi tắm biển cát trắng.', 'Climb 400 steps for the view, then swim.'),
  p('ha-long', 'hl-sun-world', 'Sun World Hạ Long', 'adventure', 20.956, 107.0475, '09:00-21:00', 180, 350000, 4.5, 85, 0, 'cable-car,park', 'Bãi Cháy', 'Vòng quay Mặt Trời, cáp treo Nữ Hoàng và công viên giải trí.', 'Ferris wheel, queen cable car and rides.'),
  p('ha-long', 'hl-hai-san', 'Nhà hàng hải sản Bãi Cháy', 'food', 20.9496, 107.0546, '11:00-22:00', 70, 300000, 4.3, 76, 1, 'seafood', 'Bãi Cháy', 'Cua, ghẹ, sá sùng tươi chọn tại bể.', 'Crab, blue swimmer and sa sung picked from the tank.'),
  p('ha-long', 'hl-cho-dem', 'Chợ đêm Hạ Long', 'market', 20.9532, 107.0775, '17:00-23:30', 75, 120000, 4.2, 70, 0, 'night-market,seafood', 'Bãi Cháy', 'Đồ nướng, hải sản và quà lưu niệm về đêm.', 'Grills, seafood and souvenirs after dark.'),
  p('ha-long', 'hl-bai-chay', 'Bãi biển Bãi Cháy', 'beach', 20.9459, 107.061, '05:00-22:00', 60, 0, 4.2, 66, 0, 'beach,walk', 'Bãi Cháy', 'Bãi cát dài để đi dạo bình minh.', 'A long beach for sunrise walks.'),
  // ── Hà Giang
  p('ha-giang', 'hg-lung-cu', 'Cột cờ Lũng Cú', 'culture', 23.3636, 105.3197, '07:00-17:00', 60, 40000, 4.6, 82, 0, 'flag,viewpoint', 'Đồng Văn', 'Điểm cực Bắc với 839 bậc lên chân cột cờ.', "The northernmost point, 839 steps to the flag's foot."),
  p('ha-giang', 'hg-ma-pi-leng', 'Đèo Mã Pì Lèng', 'nature', 23.2441, 105.4098, '06:00-18:00', 75, 0, 4.9, 95, 0, 'pass,viewpoint', 'Mèo Vạc', 'Một trong tứ đại đỉnh đèo, dưới chân là sông Nho Quế.', "One of the great passes, the Nho Que river far below."),
  p('ha-giang', 'hg-sa-phin', 'Dinh thự họ Vương', 'culture', 23.2743, 105.3004, '07:30-17:00', 70, 30000, 4.5, 78, 0, 'history', 'Sà Phìn', 'Dinh thự của vua Mèo giữa cao nguyên đá.', 'The Hmong king’s mansion on the stone plateau.'),
  p('ha-giang', 'hg-dong-van', 'Phố cổ Đồng Văn', 'market', 23.278, 105.3597, '06:00-22:00', 90, 0, 4.5, 80, 0, 'old-town,market', 'Đồng Văn', 'Phố cổ tường đá vàng, chợ phiên sáng Chủ nhật.', 'Yellow stone old town; Sunday morning market.'),
  p('ha-giang', 'hg-nho-que', 'Thuyền sông Nho Quế', 'nature', 23.2308, 105.401, '07:30-16:30', 90, 150000, 4.7, 86, 0, 'boat', 'Mèo Vạc', 'Đi thuyền giữa hẻm vực Tu Sản sâu nhất Đông Nam Á.', 'Boat through the deepest canyon in Southeast Asia.'),
  p('ha-giang', 'hg-quan-ba', 'Cổng trời Quản Bạ', 'nature', 23.0675, 104.998, '06:00-18:00', 40, 0, 4.6, 84, 0, 'viewpoint', 'Quản Bạ', 'Núi Đôi Cô Tiên và thung lũng nhìn từ trên cao.', 'Fairy Bosom Mountain and the valley below.'),
  p('ha-giang', 'hg-thang-co', 'Quán thắng cố Đồng Văn', 'food', 23.2779, 105.3604, '10:00-20:00', 50, 80000, 4.2, 60, 1, 'pork,thang-co', 'Đồng Văn', 'Món ăn đặc trưng của người H’Mông, đậm vị gác bếp.', 'A Hmong staple, deeply savoury.'),
  // ── Hội An
  p('hoi-an', 'ha-pho-co', 'Phố cổ Hội An', 'culture', 15.8801, 108.338, '07:00-22:00', 120, 120000, 4.8, 98, 0, 'old-town,lanterns,unesco', 'Minh An', 'Nhà cổ, hội quán và đèn lồng; đẹp nhất lúc hoàng hôn.', 'Merchant houses and lanterns, loveliest at dusk.'),
  p('hoi-an', 'ha-chua-cau', 'Chùa Cầu', 'culture', 15.877, 108.3263, '07:00-21:00', 30, 0, 4.6, 90, 0, 'bridge,landmark', 'Minh An', 'Biểu tượng của Hội An, cây cầu mái ngói 400 năm tuổi.', 'The 400-year-old covered bridge, emblem of Hoi An.'),
  p('hoi-an', 'ha-tan-ky', 'Nhà cổ Tấn Ký', 'culture', 15.8773, 108.3274, '08:00-17:30', 40, 0, 4.4, 66, 1, 'house,heritage', 'Minh An', 'Nhà thương gia 200 năm với gỗ lim chạm khắc.', 'A 200-year-old merchant house in carved ironwood.'),
  p('hoi-an', 'ha-cao-lau', 'Cao lầu Thanh', 'food', 15.8797, 108.3265, '07:00-20:00', 45, 50000, 4.5, 84, 1, 'noodles,pork', 'Minh An', 'Sợi mì dai, thịt xíu và rau sống: món chỉ có ở Hội An.', 'Chewy noodles, pork and herbs found only in Hoi An.'),
  p('hoi-an', 'ha-banh-mi', 'Bánh mì Phượng', 'food', 15.8774, 108.3302, '06:30-21:30', 20, 25000, 4.6, 92, 1, 'banh-mi,pork', 'Minh An', 'Ổ bánh mì từng được cả thế giới nhắc tên.', 'The sandwich the world keeps talking about.'),
  p('hoi-an', 'ha-ca-phe', 'Cà phê Faifo (sân thượng)', 'cafe', 15.8776, 108.3288, '07:00-22:00', 45, 55000, 4.6, 86, 1, 'rooftop,coffee,vegetarian', 'Minh An', 'Ngắm mái ngói rêu phong từ sân thượng.', 'Mossy rooftops from the terrace.'),
  p('hoi-an', 'ha-tra-que', 'Làng rau Trà Quế', 'nature', 15.9011, 108.34, '07:00-17:00', 120, 150000, 4.5, 74, 0, 'farm,cooking-class,vegetarian', 'Trà Quế', 'Đạp xe qua ruộng rau, học nấu ăn cùng nông dân.', 'Cycle past herb farms and cook with the farmers.'),
  p('hoi-an', 'ha-an-bang', 'Biển An Bàng', 'beach', 15.9085, 108.3598, '06:00-19:00', 120, 0, 4.6, 78, 0, 'beach', 'An Bàng', 'Bãi cát vắng, nước trong và quán ăn sát biển.', 'A quiet beach with beachside eateries.'),
  p('hoi-an', 'ha-cho-dem', 'Chợ đêm Nguyễn Hoàng', 'market', 15.8768, 108.3335, '17:30-22:30', 75, 100000, 4.3, 80, 0, 'night-market,lanterns', 'Minh An', 'Hàng trăm chiếc đèn lồng soi bóng sông Hoài.', 'Hundreds of lanterns on the Hoai river.'),
  // ── Sài Gòn
  p('sai-gon', 'sg-dinh-doc-lap', 'Dinh Độc Lập', 'culture', 10.777, 106.6953, '08:00-16:00', 70, 65000, 4.5, 85, 1, 'history,landmark', 'Quận 1', 'Nơi chứng kiến thời khắc 30/4/1975.', 'Witness to April 30, 1975.'),
  p('sai-gon', 'sg-duc-ba', 'Nhà thờ Đức Bà & Bưu điện', 'culture', 10.7798, 106.699, '07:30-17:00', 50, 0, 4.6, 92, 0, 'architecture,landmark', 'Quận 1', 'Hai công trình kiến trúc Pháp đối diện nhau.', 'Two French colonial landmarks facing each other.'),
  p('sai-gon', 'sg-chung-tich', 'Bảo tàng Chứng tích Chiến tranh', 'culture', 10.7794, 106.6921, '07:30-17:30', 90, 40000, 4.6, 82, 1, 'museum,history', 'Quận 3', 'Bảo tàng ám ảnh và đầy suy ngẫm.', 'A haunting, reflective museum.'),
  p('sai-gon', 'sg-ben-thanh', 'Chợ Bến Thành', 'market', 10.7725, 106.698, '06:00-19:00', 60, 0, 4.2, 90, 1, 'market,shopping,street-food', 'Quận 1', 'Chợ biểu tượng, ăn vặt và mặc cả vui.', 'The iconic market for snacks and haggling.'),
  p('sai-gon', 'sg-pho-hoa', 'Phở Hòa Pasteur', 'food', 10.7857, 106.6908, '06:00-22:00', 40, 70000, 4.3, 80, 1, 'pho,beef', 'Quận 3', 'Phở bò kiểu miền Nam với đĩa rau thơm đầy đặn.', 'Southern-style beef pho with a generous herb plate.'),
  p('sai-gon', 'sg-ca-phe-42', 'Cà phê chung cư 42 Nguyễn Huệ', 'cafe', 10.7745, 106.7036, '08:00-22:30', 60, 55000, 4.5, 88, 1, 'rooftop,coffee,vegetarian', 'Quận 1', 'Cà phê trong tòa chung cư cũ nhìn ra phố đi bộ.', 'Coffee in an old apartment block above the walking street.'),
  p('sai-gon', 'sg-nguyen-hue', 'Phố đi bộ Nguyễn Huệ & Bến Bạch Đằng', 'nightlife', 10.7737, 106.7066, '06:00-23:00', 45, 0, 4.4, 90, 0, 'walk,riverfront', 'Quận 1', 'Dạo phố tối, nhìn sông Sài Gòn lên đèn.', 'An evening stroll as the river lights up.'),
  p('sai-gon', 'sg-landmark', 'Landmark 81 SkyView', 'nightlife', 10.7951, 106.7218, '09:00-22:00', 80, 240000, 4.5, 80, 1, 'viewpoint,skyline', 'Bình Thạnh', 'Toàn cảnh Sài Gòn từ tầng 81.', 'All of Saigon from the 81st floor.'),
  p('sai-gon', 'sg-binh-tay', 'Chợ Bình Tây', 'market', 10.7503, 106.65, '06:00-19:00', 60, 0, 4.3, 62, 1, 'market,chinatown', 'Quận 6', 'Chợ của người Hoa ở Chợ Lớn.', 'The Chinese market of Cholon.'),
  // ── Phú Quốc
  p('phu-quoc', 'pq-bai-sao', 'Bãi Sao', 'beach', 10.0536, 104.0377, '06:00-18:30', 150, 0, 4.7, 92, 0, 'beach,swim', 'An Thới', 'Cát trắng mịn, nước trong như pha lê.', 'Fine white sand and crystal water.'),
  p('phu-quoc', 'pq-cap-treo', 'Cáp treo Hòn Thơm', 'adventure', 10.0148, 104.0191, '09:00-17:00', 150, 600000, 4.6, 88, 0, 'cable-car,island', 'An Thới', 'Cáp treo vượt biển dài nhất thế giới.', 'One of the longest sea-crossing cable cars.'),
  p('phu-quoc', 'pq-dinh-cau', 'Dinh Cậu', 'culture', 10.2172, 103.9573, '07:00-19:00', 40, 0, 4.3, 78, 0, 'temple,seaside', 'Dương Đông', 'Ngôi miếu trên mỏm đá nhìn ra biển.', 'A seaside temple on a rock.'),
  p('phu-quoc', 'pq-cho-dem', 'Chợ đêm Phú Quốc', 'market', 10.2196, 103.9627, '17:00-23:30', 90, 150000, 4.4, 90, 0, 'seafood,night-market', 'Dương Đông', 'Hải sản nướng, kem cuộn và quà biển.', 'Grilled seafood, rolled ice cream and sea gifts.'),
  p('phu-quoc', 'pq-nuoc-mam', 'Nhà thùng nước mắm', 'culture', 10.2218, 103.9654, '08:00-17:00', 40, 0, 4.2, 55, 1, 'factory,fish-sauce', 'Dương Đông', 'Xem ủ chượp trong thùng gỗ khổng lồ.', 'See fish sauce age in giant wooden barrels.'),
  p('phu-quoc', 'pq-suoi-tranh', 'Suối Tranh', 'nature', 10.1743, 104.025, '07:00-17:00', 70, 40000, 4.3, 66, 0, 'waterfall,hike', 'Dương Tơ', 'Suối mát trong rừng, đẹp nhất mùa mưa.', 'A cool forest stream, best in the wet season.'),
  p('phu-quoc', 'pq-ham-ninh', 'Làng chài Hàm Ninh', 'food', 10.1809, 104.0498, '10:00-20:00', 90, 350000, 4.5, 78, 1, 'seafood,crab', 'Hàm Ninh', 'Ghẹ hấp ngay trên cầu tàu.', 'Crab steamed right on the pier.'),
  p('phu-quoc', 'pq-sunset-town', 'Sunset Town An Thới', 'nightlife', 10.0173, 104.0236, '15:00-23:00', 90, 0, 4.5, 84, 0, 'sunset,viewpoint', 'An Thới', 'Hoàng hôn trên phố Địa Trung Hải thu nhỏ.', 'Sunset in a miniature Mediterranean town.'),
  // ── Đà Lạt
  p('da-lat', 'dl-ho-xuan-huong', 'Hồ Xuân Hương', 'nature', 11.9437, 108.442, '06:00-22:00', 60, 0, 4.5, 90, 0, 'lake,walk', 'Phường 1', 'Đạp thiên nga hoặc đi dạo quanh hồ giữa lòng phố.', 'Swan boats or a stroll around the central lake.'),
  p('da-lat', 'dl-cho', 'Chợ Đà Lạt', 'market', 11.9436, 108.438, '06:00-22:00', 75, 80000, 4.3, 86, 1, 'market,street-food,vegetarian', 'Phường 1', 'Dâu tây, mứt, sữa đậu nành nóng.', 'Strawberries, jam and hot soy milk.'),
  p('da-lat', 'dl-ga', 'Ga Đà Lạt', 'culture', 11.9506, 108.4538, '07:00-17:00', 40, 10000, 4.3, 70, 0, 'train,heritage', 'Phường 10', 'Nhà ga cổ điển hình kiến trúc Art Deco.', 'A classic Art Deco station.'),
  p('da-lat', 'dl-cau-dat', 'Đồi chè Cầu Đất', 'nature', 11.8731, 108.53, '07:00-17:30', 100, 20000, 4.6, 78, 0, 'tea,viewpoint', 'Xuân Trường', 'Săn mây trên đồi chè lúc bình minh.', 'Cloud-chasing above tea hills at dawn.'),
  p('da-lat', 'dl-me-linh', 'Cà phê Mê Linh', 'cafe', 11.912, 108.477, '07:00-21:00', 60, 70000, 4.6, 82, 1, 'view,coffee,vegetarian', 'Trại Mát', 'Cà phê giữa vườn, nhìn xuống thung lũng.', 'Coffee in a garden above the valley.'),
  p('da-lat', 'dl-duong-ham', 'Đường hầm điêu khắc', 'culture', 11.8987, 108.4786, '08:00-17:30', 60, 110000, 4.3, 60, 1, 'clay,sculpture', 'Phường 8', 'Hang đất sét khắc vẽ cả thế giới thu nhỏ.', 'A clay tunnel carved with a miniature world.'),
  p('da-lat', 'dl-tinh-yeu', 'Thung lũng Tình Yêu', 'nature', 11.9833, 108.4443, '07:00-17:00', 90, 100000, 4.1, 68, 0, 'garden,viewpoint', 'Phường 5', 'Vườn hoa và hồ nước giữa đồi thông.', 'Gardens and a lake among pines.'),
  p('da-lat', 'dl-banh-trang', 'Bánh tráng nướng chợ đêm', 'food', 11.944, 108.4375, '17:30-22:30', 30, 30000, 4.4, 88, 0, 'street-food,vegetarian', 'Phường 1', '“Pizza Đà Lạt” nướng than nóng hổi.', "Charcoal-grilled “Dalat pizza”."),
]

export const poiById = Object.fromEntries(pois.map((poi) => [poi.id, poi])) as Record<string, Poi>
export const poisByCity = (city: CityId) => pois.filter((poi) => poi.city === city)

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')

export { normalize }
