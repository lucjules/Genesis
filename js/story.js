/* Dune : Genesis — récit, cinématiques et dialogues */
(function () {
'use strict';
const G = window.G;
const A = G.art;
const { clamp, smooth, TAU } = G;

/* ================= PROGRESSION ================= */
G.STEPS = [
  { scene: 'cine', id: 'prologue', ch: 0 },
  { scene: 'thopter', ch: 1 },
  { scene: 'cine', id: 'crash', ch: 1 },
  { scene: 'trek', id: 'erg', ch: 2 },
  { scene: 'cine', id: 'fremen', ch: 2 },
  { scene: 'ride', id: 'harvest', ch: 3 },
  { scene: 'cine', id: 'water', ch: 3 },
  { scene: 'vision', ch: 4 },
  { scene: 'cine', id: 'war', ch: 4 },
  { scene: 'ride', id: 'arrakeen', ch: 5 },
  { scene: 'cine', id: 'duelIntro', ch: 5 },
  { scene: 'duel', ch: 6 },
  { scene: 'cine', id: 'throne', ch: 6 },
  { scene: 'cine', id: 'messiah', ch: 7 },
  { scene: 'talk', id: 'council', ch: 7 },
  { scene: 'cine', id: 'blast', ch: 8 },
  { scene: 'trek', id: 'blind', ch: 8 },
  { scene: 'cine', id: 'epilogue', ch: 8 },
];
G.CHAPTERS = [
  { n: 'PROLOGUE', t: 'Caladan', sub: 'Dune — Première partie' },
  { n: 'I', t: 'La Chute', sub: 'Dune — Première partie' },
  { n: 'II', t: 'Le Grand Erg', sub: 'Dune — Deuxième partie' },
  { n: 'III', t: 'Shai-Hulud', sub: 'Dune — Deuxième partie' },
  { n: 'IV', t: "L'Eau de Vie", sub: 'Dune — Deuxième partie' },
  { n: 'V', t: "La Bataille d'Arrakeen", sub: 'Dune — Deuxième partie' },
  { n: 'VI', t: 'Le Duel', sub: 'Dune — Deuxième partie' },
  { n: 'VII', t: 'Le Messie', sub: 'Dune — Troisième partie' },
  { n: 'VIII', t: 'La Marche aveugle', sub: 'Dune — Troisième partie' },
];
G.step = 0;
G.playStep = function (i) {
  if (G.busy()) return;
  G.step = i;
  const s = G.STEPS[i];
  if (!s) { G.go('title'); return; }
  if (s.ch > G.save.chapter) { G.save.chapter = s.ch; G.persist(); }
  G.save.step = i; G.persist();
  G.go(s.scene, { id: s.id, step: i });
};
G.next = function () { G.playStep(G.step + 1); };
G.startChapter = function (ch) {
  const i = G.STEPS.findIndex((s) => s.ch === ch);
  G.run = { spice: 0, truth: null, hayt: null, deaths: 0 };
  G.playStep(Math.max(0, i));
};

/* ================= DÉCORS DES CINÉMATIQUES ================= */
G.drawBg = function (c, t, spec) {
  const id = typeof spec === 'string' ? spec : spec.id; const o = typeof spec === 'object' ? spec : {};
  switch (id) {
    case 'caladan': A.caladan(c, t); break;
    case 'giedi': A.giedi(c, t); break;
    case 'dunes': case 'dunes:day': A.dunes(c, t, o); break;
    case 'dunes:noon': A.dunes(c, t, Object.assign({}, A.DUNE_SETS.noon, o)); break;
    case 'dunes:dusk': A.dunes(c, t, Object.assign({}, A.DUNE_SETS.dusk, o)); break;
    case 'dunes:night': A.dunes(c, t, Object.assign({}, A.DUNE_SETS.night, o)); A.stars(c, t, { maxY: 400 }); break;
    case 'storm':
      A.dunes(c, t, Object.assign({}, A.DUNE_SETS.noon, { sun: { x: 700, y: 200, r: 40, col: [255, 214, 160] } }, o));
      A.cloud(c, t, 1.9, [170, 100, 56]); c.fillStyle = 'rgba(90,50,24,.4)'; c.fillRect(0, 0, G.W, G.H); break;
    case 'hall': A.hall(c, t, o); break;
    case 'hallCold': A.hall(c, t, Object.assign({ light: [190, 205, 235], wall: [20, 24, 32], floor: [10, 12, 18] }, o)); break;
    case 'void': A.voidBlue(c, t, 1); A.motes(c, t, 90, 'rgba(150,200,255,.6)', 4, 30); break;
    case 'spice': A.voidBlue(c, t, 0.4); A.motes(c, t, 70, 'rgba(255,150,70,.6)', 9, 20); break;
    default: c.fillStyle = '#000'; c.fillRect(0, 0, G.W, G.H);
  }
};

/* ================= CINÉMATIQUES ================= */
const T = (big, title, sub) => ({ chapter: true, big, title, sub });
G.CINES = {
  prologue: {
    music: 'caladan',
    cards: [
      { bg: 'caladan', kicker: 'CALADAN', lines: ['Sur Caladan, il pleut sans cesse.', "C'est un monde d'eau, de falaises grises et de vieilles promesses."] },
      { bg: 'caladan', kicker: 'LE DÉCRET', lines: ["L'Empereur confie à la Maison Atréides le fief d'Arrakis, la planète de sable, seule source de l'Épice.", "L'Épice plie l'espace, prolonge la vie, éveille l'esprit.", 'Le Duc Leto sait que ce cadeau est un piège. Il le prend quand même.'] },
      { bg: 'dunes:noon', kicker: 'LES RÊVES DE PAUL', lines: ["Paul, quinze ans, héritier des Atréides, rêve d'un désert qu'il n'a jamais vu.", "D'une jeune femme aux yeux entièrement bleus.", "Et d'une guerre sainte qui porte son nom."], music: 'trek' },
      { bg: 'dunes:dusk', kicker: 'ARRAKIS', lines: ["Les Atréides s'installent à Arrakeen. Les Fremen, peuple du désert, les observent en silence.", "Mais le Baron Vladimir Harkonnen n'a pas renoncé à reprendre la planète. Et l'Empereur lui prête ses Sardaukar."], music: 'giedi' },
      { bg: 'storm', kicker: 'LA TRAHISON', lines: ["La nuit, l'attaque est lancée. Le Dr Yueh a coupé les boucliers de la forteresse.", 'Duncan Idaho tient la porte pendant que Paul et sa mère, Dame Jessica, courent vers un ornithoptère.', 'Une seule issue : droit dans la tempête.'], music: 'storm' },
      T('I', 'LA CHUTE', 'Dune — Première partie'),
    ],
  },
  crash: {
    music: 'trek',
    cards: [
      { bg: 'storm', kicker: 'LE GRAND ERG', lines: ["L'ornithoptère s'écrase au cœur de la tempête.", "Quand le vent retombe, il ne reste que le silence, des dunes à perte de vue, et deux combinaisons distillantes."] },
      { bg: 'dunes:noon', kicker: 'LA LOI DU DÉSERT', lines: ["Ici, tout ce qui marche en cadence attire Shai-Hulud, le grand ver des sables.", "Pour survivre, il faut marcher sans rythme, de roche en roche.", "Paul et Jessica n'ont que quelques heures d'eau."] },
      T('II', 'LE GRAND ERG', 'Dune — Deuxième partie'),
    ],
  },
  fremen: {
    music: 'sorrow',
    cards: [
      { bg: { id: 'dunes:dusk', figs: [{ k: 'stilgar', x: 880 }, { k: 'chani', x: 1010 }] }, kicker: 'SIETCH TABR', lines: ['Des silhouettes se lèvent des rochers. Les Fremen.', 'Stilgar, leur chef, jauge ce garçon et sa mère : de l’eau, une lame, un nom.', 'Chani, qui a les yeux bleus dans le bleu, ceux des rêves de Paul, les regarde sans un mot.'] },
      { bg: 'dunes:night', kicker: "MUAD'DIB", lines: ['Paul tue Jamis en duel. Selon la loi du désert, il prend son eau, et sa place.', "Les Fremen lui donnent deux noms. Usul, « la base du pilier », pour le cercle intime.", "Et Muad'Dib, le petit rat du désert, qui sait survivre là où nul ne survit."] },
      { bg: 'giedi', kicker: 'GIEDI PRIME', lines: ['Sur Giedi Prime, sous un soleil noir, le Baron prépare la suite.', "Rabban saigne Arrakis. Feyd-Rautha, son neveu, s'aiguise dans l'arène.", "Et l'Empereur attend, dans l'ombre, que le fief lui revienne."], music: 'giedi' },
      { bg: 'dunes:dusk', kicker: 'LE MAHDI', lines: ['Les Fremen attendent un messie, le Lisan al-Gaib, venu d’un autre monde.', 'Paul refuse ce rôle. Mais pour mener un peuple à la victoire, il doit chevaucher Shai-Hulud.'], music: 'trek' },
      T('III', 'SHAI-HULUD', 'Dune — Deuxième partie'),
    ],
  },
  water: {
    music: 'sorrow',
    cards: [
      { bg: 'dunes:night', kicker: "L'EAU DE VIE", lines: ['Jessica, qui porte une fille dans son ventre, boit le poison sacré des Fremen et devient Révérende Mère.', "Tous les souvenirs des femmes qui l'ont précédée affluent dans son esprit, et dans celui de l'enfant à naître."] },
      { bg: 'spice', kicker: 'LE POISON DES SAGES', lines: ['Paul, lui, veut voir ce que nul homme n’a vu.', 'Il boit à son tour. Chani le veille. Dans la nuit de son corps, les futurs se déploient.'], music: 'vision' },
      T('IV', "L'EAU DE VIE", 'Dune — Deuxième partie'),
    ],
  },
  war: {
    music: 'giedi',
    cards: [
      { bg: 'void', kicker: 'LE KWISATZ HADERACH', lines: ["Paul ouvre les yeux. Il voit à la fois le passé, le présent et l’avenir.", "Il sait où mène chaque route. Et il sait que la plupart d'entre elles finissent dans le feu."], music: 'vision' },
      { bg: 'hallCold', kicker: "L'ULTIMATUM", lines: ["Paul exige le trône. Il menace de détruire l'Épice si l'Empire résiste.", "L'Empereur refuse. Alors les Fremen déchaînent l'arme que nul n'attendait : l'atomique des Atréides.", "Le Mur-Bouclier, la falaise qui protège Arrakeen, s'effondre dans un éclair. Derrière : les vers."], music: 'battle' },
      T('V', "LA BATAILLE D'ARRAKEEN", 'Dune — Deuxième partie'),
    ],
  },
  duelIntro: {
    music: 'duel',
    cards: [
      { bg: { id: 'hall', light: [255, 170, 100] }, kicker: 'ARRAKEEN', lines: ["Les légions impériales se brisent. Les Fremen entrent dans la ville.", "Dans la salle du trône, Shaddam IV s'incline devant le fils du Duc qu'il a trahi.", "Mais les Grandes Maisons exigent un champion. Feyd-Rautha Harkonnen relèvera le défi."] },
      { bg: { id: 'hall', light: [255, 170, 100] }, kicker: 'LA LAME LENTE', lines: ["Chacun porte un bouclier. Le fer qui frappe vite est repoussé.", 'Seule la lame lente traverse. Mais celui qui la manie est lent, lui aussi.'] },
      T('VI', 'LE DUEL', 'Dune — Deuxième partie'),
    ],
  },
  throne: {
    music: 'sorrow',
    cards: [
      { bg: { id: 'hall', light: [255, 170, 100] }, kicker: 'LA COURONNE', lines: ['Feyd-Rautha tombe. La salle retient son souffle.', 'Paul prend la couronne. Il épouse la princesse Irulan, pour sceller la fin d’une dynastie.', 'Chani, elle, quitte la salle. Elle sait ce que cette victoire va coûter.'] },
      { bg: 'dunes:dusk', kicker: 'LE JIHAD', lines: ["Dans tous les ports d'Arrakis, les vaisseaux fremen sont armés.", 'Le Jihad commence, et ce que Paul a vu dans l’Eau de Vie se met en marche.'] },
      { bg: 'black', kicker: 'FIN DE LA DEUXIÈME ÉPOQUE', lines: ["Mais Muad'Dib avait vu plus loin que sa propre victoire."], music: 'silence' },
    ],
  },
  messiah: {
    music: 'sorrow',
    cards: [
      { bg: { id: 'hall', light: [255, 160, 90] }, kicker: 'DOUZE ANS PLUS TARD', lines: ["Le Jihad de Muad'Dib a ravagé mille mondes.", 'On dit que soixante et un milliards de vivants ont péri sous les bannières vertes et noires.', "Paul règne à Arrakeen sur un empire de cendres. Il a vu cette victoire, et il l'a laissée advenir."] },
      { bg: { id: 'hall', light: [255, 160, 90] }, kicker: 'LES COMPLOTEURS', lines: ["Ses ennemis ne portent plus d'armes. Ils portent des cadeaux.", "La Guilde, les Tleilaxu, une Révérende Mère, une princesse sans époux : tous veulent briser le Messie."] },
      T('VII', 'LE MESSIE', 'Dune — Troisième partie'),
    ],
  },
  blast: {
    music: 'silence',
    cards: [
      { bg: 'black', kicker: 'UNE PIERRE-BRÛLANTE', flash: true, lines: ['Un éclat blanc. Une chaleur sans origine.', "L'explosion emporte les yeux de Paul.", 'Mais la prescience ne dépend pas de la vue.'] },
      { bg: 'black', kicker: 'LE PRIX', lines: ["Dans les appartements, Chani met au monde deux enfants, et ne se réveillera pas.", 'Paul a vu cette heure mille fois. Il ne l’a jamais trouvée plus douce.'], music: 'sorrow' },
      { bg: 'black', kicker: 'LE CHOIX DES FREMEN', lines: ["Chez les Fremen, l'aveugle s'en va seul dans le désert. Le sable décide de lui.", "Paul prend le chemin des dunes. Il marche sans rythme, par habitude. Et par défi."] },
      T('VIII', 'LA MARCHE AVEUGLE', 'Dune — Troisième partie'),
    ],
  },
  epilogue: {
    music: 'sorrow',
    cards: [
      { bg: 'dunes:night', kicker: 'LE DÉSERT', lines: [() => (G.run.truth === 'told' ? "Il lui avait dit la vérité, et elle l'avait embrassé quand même." : "Il lui avait caché la vérité, et elle l'avait deviné quand même."), "Dans le désert, la nuit tombe sans témoin.", "On ne retrouvera jamais Muad'Dib."] },
      { bg: 'dunes:dusk', kicker: 'LES ENFANTS', lines: ['À Arrakeen, deux enfants ouvrent les yeux. Leto et Ghanima. Ils ont déjà tout vu.', 'Le Sentier d’Or est ouvert. Il sera long, et terrible, et nécessaire.'] },
      { bg: 'black', big: 'DUNE : GENESIS', kicker: 'FIN', lines: ["Jeu de fan non officiel, sans but lucratif, inspiré de l'œuvre de Frank Herbert et des films de Denis Villeneuve.", 'Merci d’avoir marché sans rythme.'], end: true },
    ],
  },
};

/* scène : cinématique */
G.scenes.cine = {
  enter(o) {
    this.script = G.CINES[o.id]; this.card = 0; this.t = 0; this.laid = false; this.autoT = 0; this.o = o; this.fin = false;
    G.barsTarget = 64; G.grainAmt = 0.09;
    G.audio.mood(this.script.music); G.audio.silenceAll();
    this.startCard();
  },
  startCard() {
    const cd = this.script.cards[this.card];
    this.t = 0; this.laid = false; this.lines = null;
    if (cd.music) G.audio.mood(cd.music);
    if (cd.chapter) G.audio.sfx.boom();
    if (cd.flash) { G.flash = 1; G.flashColor = '#fff'; G.audio.sfx.flash(); }
  },
  layout(c, cd) {
    const f = G.font(31, 500, 'body');
    this.lines = (cd.lines || []).map((l) => (typeof l === 'function' ? l() : l)).map((l) => G.wrap(c, l, 940, f));
  },
  advance() {
    if (this.fin) return;
    if (this.card + 1 >= this.script.cards.length) { this.fin = true; if (this.script.then) this.script.then(); else G.next(); return; }
    this.card++; this.startCard();
  },
  update(dt) {
    const cd = this.script.cards[this.card];
    this.t += dt; if (this.fin) return;
    const nLines = cd.lines ? cd.lines.length : 0;
    const revealed = cd.chapter ? this.t > 2 : this.t > nLines * 2.3 + 0.6;
    if (cd.chapter) { if (this.t > 4.8 || (this.t > 1.2 && G.confirm())) this.advance(); }
    else if (G.confirm()) { if (!revealed) this.t = nLines * 2.3 + 0.7; else if (!cd.end) this.advance(); else { this.fin = true; G.go('title'); } }
    else if (revealed && this.t > nLines * 2.3 + 6.5 && !cd.end) this.advance();
    if (G.hit('KeyS') && !cd.end && !this.fin) { this.fin = true; if (this.script.then) this.script.then(); else G.next(); }
  },
  draw(c) {
    const cd = this.script.cards[this.card], W = G.W, H = G.H, tt = G.time;
    if (cd.chapter) {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const a = Math.min(smooth(0.2, 1.4, this.t), 1 - smooth(4.0, 4.8, this.t));
      c.save(); c.globalAlpha = a;
      G.text(c, cd.sub.toUpperCase(), W / 2, 270, { size: 15, align: 'center', ls: 8, color: '#a8926f' });
      G.text(c, cd.big, W / 2, 360, { size: 74, align: 'center', ls: 14, color: '#d9a05b', weight: 500 });
      c.fillStyle = '#d9a05b'; c.fillRect(W / 2 - 60, 388, 120, 1.5);
      G.text(c, cd.title, W / 2, 452, { size: 40, align: 'center', ls: 12, color: '#eadcc4', weight: 500 });
      c.restore(); return;
    }
    // fond + lent zoom
    const z = 1 + Math.min(this.t, 40) * 0.0016;
    c.save(); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2);
    G.drawBg(c, tt, cd.bg); c.restore();
    const bg = typeof cd.bg === 'object' ? cd.bg : {};
    if (bg.figs) bg.figs.forEach((f) => A.person(c, f.x, 560, 250, f.k, tt, { rim: [255, 150, 90] }));
    // bandeau sombre
    const g = c.createLinearGradient(0, 260, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,.88)');
    c.fillStyle = g; c.fillRect(0, 260, W, H - 260);
    if (!this.lines) this.layout(c, cd);
    const lh = 40, gap = 14;
    let total = 0; this.lines.forEach((p) => (total += p.length * lh + gap));
    let y = H - 92 - total + 30;
    const kick = cd.kicker;
    if (cd.big) G.text(c, cd.big, W / 2, 300, { size: 80, align: 'center', ls: 16, color: '#d9a05b', weight: 500, alpha: smooth(0, 3, this.t) });
    if (kick) G.text(c, kick, W / 2, y - 26, { size: 15, align: 'center', ls: 9, color: '#d9a05b', alpha: smooth(0, 1, this.t) });
    this.lines.forEach((p, i) => {
      const a = smooth(i * 2.3 + 0.3, i * 2.3 + 1.7, this.t);
      p.forEach((l, k) => { G.text(c, l, W / 2, y + 28 + k * lh, { size: 31, weight: 500, fam: 'body', align: 'center', color: '#f1e6d2', alpha: a }); });
      y += p.length * lh + gap;
    });
    const n = cd.lines.length;
    if (this.t > n * 2.3 + 1) G.text(c, cd.end ? 'ENTRÉE — RETOUR AU TITRE' : 'ENTRÉE — CONTINUER', W - 70, H - 26, { size: 11, align: 'right', ls: 4, color: '#8a7a62', alpha: 0.5 + 0.5 * Math.sin(tt * 3) });
    else G.text(c, 'S — PASSER', W - 70, H - 26, { size: 11, align: 'right', ls: 4, color: '#6f6250', alpha: 0.7 });
    // fondu d'entrée
    if (this.t < 1) { c.fillStyle = `rgba(0,0,0,${1 - this.t})`; c.fillRect(0, 0, W, H); }
  },
};

/* ================= DIALOGUES ================= */
const NAMES = { alia: 'Alia', stilgar: 'Stilgar', scytale: 'Scytale', hayt: 'Hayt', edric: 'Edric', irulan: 'Irulan', chani: 'Chani', paul: 'Paul', bijaz: 'Bijaz', jessica: 'Jessica' };
G.TALKS = {
  council: {
    music: 'palace',
    bg: { id: 'hall', light: [255, 170, 100], beams: 4 },
    nodes: [
      { stage: ['stilgar', 'irulan', 'alia', 'edric', 'scytale', 'bijaz'], narr: "Salle du Conseil, palais d'Arrakeen. L'aube filtre entre les piliers de pierre." },
      { who: 'alia', text: "Paul. Les Tleilaxu demandent audience. Ils prétendent t'apporter un présent." },
      { who: 'stilgar', text: "Prends garde, Usul. Je n'aime pas les hommes qui sourient en offrant." },
      { who: 'scytale', text: "Le Seigneur de la Guerre accepterait-il un cadeau de la maison Tleilax ? Un ami qu'il croyait perdu." },
      { stage: ['stilgar', 'irulan', 'alia', 'edric', 'hayt', 'bijaz'], who: 'hayt', text: "Mon seigneur. On m'a dit mon nom : Hayt. Mais mes mains savent des choses que ma mémoire ignore." },
      { who: 'paul', text: "Duncan Idaho. Mort sur Arrakis le jour où tout a commencé. Les Tleilaxu l'ont recréé : un ghola." },
      { choice: [
        { label: 'Hayt reste dans ma maison.', set: { hayt: 'accept' }, then: [
          { who: 'paul', text: 'Il reste. Qu’il serve.' },
          { who: 'stilgar', text: 'Tu es sûr, Usul ?' },
          { who: 'paul', text: "Je l'ai vu venir, Stilgar. Je les ai tous vus venir." } ] },
        { label: 'Qu’on le renvoie sur Tleilax.', set: { hayt: 'refuse' }, then: [
          { who: 'paul', text: 'Qu’on le renvoie.' },
          { who: 'scytale', text: 'Refuser un cadeau est une insulte, Sire.' },
          { who: 'alia', text: 'Tu refuses… et pourtant, il restera. Tu le sais.' },
          { who: 'paul', text: "Oui. Je le sais. Quoi que je décide, l'avenir revient dans le même lit." } ] },
      ] },
      { who: 'edric', text: "Le temps est un fleuve, Sire. La Guilde vous voit peiner à le remonter." },
      { who: 'paul', text: 'Je ne le remonte pas, Navigateur. Je le subis, comme vous.' },
      { who: 'irulan', text: "Je n'ai pas oublié que je suis née pour le trône, Sire. Ni que vous m'avez donné un titre, sans un époux." },
      { stage: ['chani'], pregnant: true, bg: { id: 'hall', light: [255, 190, 130], beams: 2 }, narr: "Plus tard. Les appartements de Chani. Elle porte les enfants de Paul." },
      { who: 'chani', text: "Tu as vu quelque chose, Usul. Tu as le visage que tu avais avant le Jihad." },
      { choice: [
        { label: 'Lui dire la vérité.', set: { truth: 'told' }, then: [
          { who: 'paul', text: "Je te vois près de l'eau de la naissance. Après, je ne te vois plus." },
          { who: 'chani', text: "Alors je ne te laisserai pas me le cacher. Quoi que tu aies vu… je veux ces enfants. Nos enfants." } ] },
        { label: 'La lui cacher.', set: { truth: 'hidden' }, then: [
          { who: 'paul', text: 'Rien, Sihaya. Une fatigue.' },
          { who: 'chani', text: "Tu mens mal, pour quelqu'un qui voit tout. Je choisis de te croire." } ] },
      ] },
      { who: 'chani', text: "Promets-moi une chose. Quoi qu'il arrive, tu ne laisseras pas leur futur devenir le tien." },
      { who: 'paul', text: 'Je te le promets.' },
      { narr: "Dehors, le soleil se lève sur Arrakeen. Dans la cour, quelqu'un porte une pierre-brûlante." },
    ],
  },
};

G.scenes.talk = {
  enter(o) {
    this.sc = G.TALKS[o.id]; this.q = this.sc.nodes.slice(); this.bg = this.sc.bg; this.stage = []; this.preg = false;
    this.cur = null; this.t = 0; this.typed = 0; this.choice = null; this.sel = 0; this.wait = 0; this.tt = 0; this.fin = false;
    G.barsTarget = 0; G.grainAmt = 0.08; G.audio.mood(this.sc.music); G.audio.silenceAll();
    this.pop();
  },
  pop() {
    const n = this.q.shift();
    if (!n) { if (!this.fin) { this.fin = true; G.next(); } return; }
    if (n.stage) { this.stage = n.stage; }
    if (n.pregnant !== undefined) this.preg = n.pregnant;
    if (n.bg) this.bg = n.bg;
    if (n.choice) { this.choice = n.choice; this.sel = 0; this.cur = null; return; }
    if (n.who || n.narr) { this.cur = n; this.t = 0; this.typed = 0; return; }
    this.pop();
  },
  update(dt) {
    this.tt += dt; if (this.fin) return;
    if (this.choice) {
      if (G.anyHit('ArrowUp', 'KeyW')) { this.sel = (this.sel + this.choice.length - 1) % this.choice.length; G.audio.sfx.ui(); }
      if (G.anyHit('ArrowDown', 'KeyS')) { this.sel = (this.sel + 1) % this.choice.length; G.audio.sfx.ui(); }
      if (G.mouse.moved) this.choice.forEach((_, i) => { if (Math.abs(G.mouse.x - G.W / 2) < 480 && Math.abs(G.mouse.y - (470 + i * 64)) < 28) this.sel = i; });
      if (G.anyHit('Enter', 'Space') || (G.mouse.clicked && Math.abs(G.mouse.y - (470 + this.sel * 64)) < 30)) {
        const ch = this.choice[this.sel]; this.choice = null; G.audio.sfx.confirm();
        if (ch.set) Object.assign(G.run, ch.set);
        this.q.unshift(...ch.then); this.pop();
      }
      return;
    }
    if (!this.cur) return;
    this.t += dt; const txt = this.cur.text || this.cur.narr; this.typed = Math.min(txt.length, this.t * 48);
    if (G.confirm()) { if (this.typed < txt.length) this.t = txt.length / 48 + 0.01; else this.pop(); }
  },
  draw(c) {
    const W = G.W, H = G.H, tt = G.time;
    G.drawBg(c, tt, this.bg);
    // personnages
    const n = this.stage.length, spk = this.cur && this.cur.who;
    this.stage.forEach((k, i) => {
      const x = n === 1 ? W / 2 : 150 + i * ((W - 300) / (n - 1)), isS = k === spk;
      const hgt = 330 + (isS ? 14 : 0);
      A.person(c, x, 560 + (k === 'bijaz' ? 6 : 0), hgt, k, tt, { lit: spk ? (isS ? 1 : 0.3) : 0.7, pregnant: this.preg && k === 'chani', rim: [255, 170, 100] });
    });
    // panneau de texte
    const g = c.createLinearGradient(0, 520, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,.72)'); g.addColorStop(1, 'rgba(0,0,0,.95)');
    c.fillStyle = g; c.fillRect(0, 520, W, H - 520);
    if (this.choice) {
      G.text(c, 'QUE FAIS-TU ?', W / 2, 424, { size: 13, align: 'center', ls: 8, color: '#d9a05b' });
      this.choice.forEach((ch, i) => {
        const sel = i === this.sel, y = 470 + i * 64;
        if (sel) { c.fillStyle = 'rgba(217,160,91,.12)'; c.fillRect(W / 2 - 440, y - 30, 880, 52); c.fillStyle = '#d9a05b'; c.fillRect(W / 2 - 440, y - 30, 3, 52); }
        G.text(c, ch.label, W / 2, y + 4, { size: 29, weight: 500, fam: 'body', align: 'center', color: sel ? '#f6dcae' : '#a8987f' });
      });
      return;
    }
    const cur = this.cur; if (!cur) return;
    const txt = (cur.text || cur.narr).slice(0, Math.floor(this.typed));
    const narr = !cur.who;
    if (!narr) G.text(c, (NAMES[cur.who] || cur.who).toUpperCase(), W / 2, 596, { size: 15, align: 'center', ls: 8, color: cur.who === 'paul' ? '#9fc4ff' : '#d9a05b' });
    const f = G.font(narr ? 27 : 30, 500, 'body');
    const lines = G.wrap(c, cur.text || cur.narr, 960, f);
    let shown = 0;
    lines.forEach((l, i) => {
      const part = txt.slice(shown, shown + l.length + 1); shown += l.length + 1;
      G.text(c, part.trimEnd(), W / 2, (narr ? 620 : 634) + i * 34 - (lines.length - 1) * 12, { size: narr ? 27 : 30, weight: 500, fam: 'body', align: 'center', color: narr ? '#b9a98d' : (cur.who === 'paul' ? '#cfe0ff' : '#f1e6d2') });
    });
    if (this.typed >= (cur.text || cur.narr).length) G.text(c, 'ENTRÉE', W - 70, H - 26, { size: 11, align: 'right', ls: 4, color: '#8a7a62', alpha: 0.5 + 0.5 * Math.sin(tt * 3) });
  },
};
})();
