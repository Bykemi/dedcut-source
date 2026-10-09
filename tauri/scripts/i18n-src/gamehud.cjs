// v4.63 : overlays « jeu d'action en ville néon » (Live / Enregistrer et Montage), dessins originaux, noms génériques
// Colonnes : clé | fr | en | es | de | it | pt | ja | ko | zh-CN
const L = (k, fr, en, es, de, it, pt, ja, ko, zh) => [k, fr, en, es, de, it, pt, ja, ko, zh];
const names = {
  'gm-hud': ['Interface de jeu', 'Game interface', 'Interfaz de juego', 'Spieloberfläche', 'Interfaccia di gioco', 'Interface de jogo', 'ゲーム画面', '게임 화면', '游戏界面'],
  'gm-mission': ['Mission réussie', 'Mission complete', 'Misión cumplida', 'Mission geschafft', 'Missione compiuta', 'Missão cumprida', 'ミッション成功', '미션 성공', '任务完成'],
  'gm-screen': ['Coucher de soleil néon', 'Neon sunset', 'Atardecer neón', 'Neon-Sonnenuntergang', 'Tramonto al neon', 'Pôr do sol neon', 'ネオンの夕焼け', '네온 노을', '霓虹日落'],
  'gm-cam': ['Cadre téléphone', 'Phone frame', 'Marco de teléfono', 'Handy-Rahmen', 'Cornice telefono', 'Moldura de celular', 'スマホ枠', '휴대폰 프레임', '手机边框'],
  'gm-stars': ['Étoiles de recherche', 'Wanted stars', 'Estrellas de búsqueda', 'Fahndungssterne', 'Stelle di ricerca', 'Estrelas de procurado', '手配スター', '수배 별', '通缉星级']
};
module.exports = [
L('ov.cat.game', 'Jeu en ville (néon)', 'City action game (neon)', 'Juego de ciudad (neón)', 'Stadt-Actionspiel (Neon)', 'Gioco in città (neon)', 'Jogo na cidade (neon)', '街のアクションゲーム（ネオン）', '도시 액션 게임(네온)', '城市动作游戏（霓虹）'),
L('wcat.game', 'Jeu en ville (néon)', 'City action game (neon)', 'Juego de ciudad (neón)', 'Stadt-Actionspiel (Neon)', 'Gioco in città (neon)', 'Jogo na cidade (neon)', '街のアクションゲーム（ネオン）', '도시 액션 게임(네온)', '城市动作游戏（霓虹）'),
L('ovl.name', 'Overlay de jeu', 'Game overlay', 'Overlay de juego', 'Spiel-Overlay', 'Overlay di gioco', 'Overlay de jogo', 'ゲームオーバーレイ', '게임 오버레이', '游戏叠加层'),
L('ov.d.money', '1 250 000 $', '$1,250,000', '1.250.000 $', '1.250.000 $', '1.250.000 $', '$ 1.250.000', '$1,250,000', '$1,250,000', '$1,250,000'),
L('ov.d.mission', 'Mission réussie', 'Mission complete', 'Misión cumplida', 'Mission geschafft', 'Missione compiuta', 'Missão cumprida', 'ミッション成功', '미션 성공', '任务完成'),
L('ov.d.reward', '+ 5 000 $', '+ $5,000', '+ 5.000 $', '+ 5.000 $', '+ 5.000 $', '+ $ 5.000', '+ $5,000', '+ $5,000', '+ $5,000'),
...Object.entries(names).map(([s, n]) => L('ov.s.' + s, ...n)),
...Object.entries(names).map(([s, n]) => L('wst.' + s, ...n))
];
