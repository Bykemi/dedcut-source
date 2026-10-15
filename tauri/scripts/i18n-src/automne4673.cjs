// v4.67.3 : pack « Automne & cosy » — 10 effets, 10 transitions, 10 filtres, 3 préréglages, 6 styles de texte
// Colonnes : clé | fr | en | es | de | it | pt | ja | ko | zh-CN
const L = (k, fr, en, es, de, it, pt, ja, ko, zh) => [k, fr, en, es, de, it, pt, ja, ko, zh];
const CAT = ['Automne & cosy', 'Autumn & cozy', 'Otoño acogedor', 'Herbst & gemütlich', 'Autunno accogliente', 'Outono aconchegante', '秋とぬくもり', '가을 & 아늑함', '秋日温馨'];
module.exports = [
L('fxcat.aucozy', ...CAT),
L('lookcat.aucozy', ...CAT),
L('txcat.aucozy', ...CAT),
// effets
L('fx.auwind', 'Coup de vent', 'Gust of wind', 'Ráfaga de viento', 'Windstoß', 'Colpo di vento', 'Rajada de vento', '突風', '돌풍', '一阵风'),
L('fx.aulights', 'Guirlande lumineuse', 'String lights', 'Guirnalda de luces', 'Lichterkette', 'Lucine', 'Varal de luzes', 'ストリングライト', '줄 조명', '串灯'),
L('fx.austeam', 'Vapeur', 'Steam', 'Vapor', 'Dampf', 'Vapore', 'Vapor', '湯気', '김', '热气'),
L('fx.aufire', 'Coin du feu', 'Fireside', 'Junto al fuego', 'Kaminfeuer', 'Davanti al camino', 'Perto da lareira', '暖炉の灯り', '난롯가', '炉火'),
L('fx.aupuddle', 'Reflet de flaque', 'Puddle reflection', 'Reflejo en el charco', 'Pfützenspiegelung', 'Riflesso nella pozzanghera', 'Reflexo na poça', '水たまりの反射', '웅덩이 반사', '水洼倒影'),
L('fx.audrizzle', 'Bruine', 'Drizzle', 'Llovizna', 'Nieselregen', 'Pioggerella', 'Garoa', '霧雨', '이슬비', '毛毛雨'),
L('fx.scanlight', 'Scanner', 'Scanner', 'Escáner', 'Scanner', 'Scanner', 'Scanner', 'スキャナー', '스캐너', '扫描光'),
L('fx.coderain', 'Pluie de code', 'Code rain', 'Lluvia de código', 'Code-Regen', 'Pioggia di codice', 'Chuva de código', 'コードの雨', '코드 비', '代码雨'),
L('fx.fireworks', 'Feu d’artifice', 'Fireworks', 'Fuegos artificiales', 'Feuerwerk', 'Fuochi d’artificio', 'Fogos de artifício', '花火', '불꽃놀이', '烟花'),
L('fx.speedlines', 'Lignes de vitesse', 'Speed lines', 'Líneas de velocidad', 'Speedlines', 'Linee di velocità', 'Linhas de velocidade', '集中線', '속도선', '速度线'),
// filtres
L('look.auamber', 'Ambre doré', 'Golden amber', 'Ámbar dorado', 'Goldener Bernstein', 'Ambra dorata', 'Âmbar dourado', '黄金の琥珀', '황금 호박색', '金色琥珀'),
L('look.aumaple', 'Érable', 'Maple', 'Arce', 'Ahorn', 'Acero', 'Bordo', 'もみじ', '단풍', '枫叶'),
L('look.aufog', 'Matin brumeux', 'Misty morning', 'Mañana brumosa', 'Nebliger Morgen', 'Mattina nebbiosa', 'Manhã de névoa', '霧の朝', '안개 낀 아침', '雾蒙蒙的早晨'),
L('look.aucider', 'Cidre', 'Cider', 'Sidra', 'Apfelmost', 'Sidro', 'Sidra', 'シードル', '사과주', '苹果酒'),
L('look.aucocoa', 'Chocolat chaud', 'Hot cocoa', 'Chocolate caliente', 'Heiße Schokolade', 'Cioccolata calda', 'Chocolate quente', 'ホットココア', '핫초코', '热可可'),
L('look.auforest', 'Forêt profonde', 'Deep forest', 'Bosque profundo', 'Tiefer Wald', 'Foresta profonda', 'Floresta profunda', '深い森', '깊은 숲', '深林'),
L('look.aurainy', 'Jour de pluie', 'Rainy day', 'Día lluvioso', 'Regentag', 'Giornata di pioggia', 'Dia de chuva', '雨の日', '비 오는 날', '雨天'),
L('look.auhearth', 'Veillée', 'Cozy evening', 'Velada', 'Gemütlicher Abend', 'Serata accogliente', 'Noite aconchegante', 'くつろぎの夜', '아늑한 저녁', '温馨夜晚'),
L('look.auharvest', 'Récolte', 'Harvest', 'Cosecha', 'Ernte', 'Raccolto', 'Colheita', '収穫', '수확', '丰收'),
L('look.aupolar', 'Photo d’automne', 'Autumn snapshot', 'Foto de otoño', 'Herbstfoto', 'Foto d’autunno', 'Foto de outono', '秋のスナップ', '가을 스냅', '秋日快照'),
// transitions
L('tr.prismsplit', 'Prisme éclaté', 'Prism split', 'Prisma dividido', 'Prisma-Split', 'Prisma diviso', 'Prisma dividido', '分光プリズム', '프리즘 분할', '棱镜分光'),
L('tr.stripes', 'Bandes croisées', 'Crossing stripes', 'Franjas cruzadas', 'Kreuzende Streifen', 'Strisce incrociate', 'Faixas cruzadas', '交差ストライプ', '교차 줄무늬', '交错条纹'),
L('tr.shockring', 'Anneau de choc', 'Shock ring', 'Anillo de choque', 'Schockring', 'Anello d’urto', 'Anel de choque', '衝撃リング', '충격 링', '冲击环'),
L('tr.pixelrain', 'Pluie de pixels', 'Pixel rain', 'Lluvia de píxeles', 'Pixelregen', 'Pioggia di pixel', 'Chuva de pixels', 'ピクセルの雨', '픽셀 비', '像素雨'),
L('tr.hyperspace', 'Hyperespace', 'Hyperspace', 'Hiperespacio', 'Hyperraum', 'Iperspazio', 'Hiperespaço', 'ハイパースペース', '하이퍼스페이스', '超空间'),
L('tr.fold', 'Pliage', 'Fold', 'Plegado', 'Falten', 'Piegatura', 'Dobra', '折りたたみ', '접기', '折叠'),
L('tr.triangles', 'Triangles', 'Triangles', 'Triángulos', 'Dreiecke', 'Triangoli', 'Triângulos', '三角形', '삼각형', '三角形'),
L('tr.laser', 'Balayage laser', 'Laser sweep', 'Barrido láser', 'Laser-Scan', 'Scansione laser', 'Varredura a laser', 'レーザースキャン', '레이저 스캔', '激光扫描'),
L('tr.glassbrk', 'Verre brisé', 'Broken glass', 'Cristal roto', 'Zerbrochenes Glas', 'Vetro rotto', 'Vidro quebrado', '割れたガラス', '깨진 유리', '碎玻璃'),
L('tr.smoke', 'Fumée', 'Smoke', 'Humo', 'Rauch', 'Fumo', 'Fumaça', '煙', '연기', '烟雾'),
// préréglages d'effets
L('fxpre.aucozy', 'Soirée cosy', 'Cozy night in', 'Noche acogedora', 'Kuschelabend', 'Serata cosy', 'Noite em casa', 'おうち時間', '포근한 밤', '温暖小窝'),
L('fxpre.aurainy', 'Sous la pluie', 'In the rain', 'Bajo la lluvia', 'Im Regen', 'Sotto la pioggia', 'Na chuva', '雨の中', '빗속에서', '雨中'),
L('fxpre.aufeast', 'Fête', 'Celebration', 'Celebración', 'Feier', 'Festa', 'Celebração', 'お祝い', '축하', '庆祝'),
// styles de texte
L('txs.autitle', 'Titre d’automne', 'Autumn title', 'Título otoñal', 'Herbsttitel', 'Titolo autunnale', 'Título de outono', '秋のタイトル', '가을 제목', '秋日标题'),
L('txs.aumug', 'Cosy', 'Cozy', 'Acogedor', 'Gemütlich', 'Cosy', 'Aconchegante', 'ほっこり', '아늑하게', '温馨'),
L('txs.aukraft', 'Étiquette kraft', 'Kraft label', 'Etiqueta kraft', 'Kraftpapier-Etikett', 'Etichetta kraft', 'Etiqueta kraft', 'クラフトラベル', '크라프트 라벨', '牛皮纸标签'),
L('txs.auslate', 'Ardoise', 'Slate', 'Pizarra', 'Schiefertafel', 'Lavagna', 'Lousa', '黒板', '칠판', '小黑板'),
L('txs.auglow', 'Lueur chaude', 'Warm glow', 'Brillo cálido', 'Warmes Leuchten', 'Bagliore caldo', 'Brilho quente', 'あたたかな光', '따뜻한 빛', '暖光'),
L('txs.aufall', 'Feuille d’automne', 'Autumn leaf', 'Hoja de otoño', 'Herbstblatt', 'Foglia d’autunno', 'Folha de outono', '落ち葉', '낙엽', '落叶')
];
