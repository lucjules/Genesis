/* Dune : Genesis — démarrage */
(function () {
'use strict';
const G = window.G;
const q = new URLSearchParams(location.search);
G.start();
const done = () => {
  if (q.has('step')) { G.run = { spice: 0, truth: q.get('truth'), hayt: null, deaths: 0 }; G.playStep(parseInt(q.get('step'), 10) || 0); }
  else G.go('title');
};
if (document.fonts && document.fonts.load) {
  // laisse une chance aux polices web, sans bloquer le jeu hors ligne
  Promise.race([Promise.all([document.fonts.load('500 20px Cinzel'), document.fonts.load('500 20px "Cormorant Garamond"')]), new Promise((r) => setTimeout(r, 1200))]).then(done, done);
} else done();
window.G = G;
})();
