// Bereich „handwerk" – Fabrik Stufe 2: Symbole der Handy-Apps (16×16, Oberfläche): Fabrikbedarf (Kiste mit Zahnrad),
// Vorkommen (Erzbrocken), Paketfach (Paket mit Schnur), Stromnetz (Blitz), Akku in der Statusleiste.

import { symbolKunst, P, R, E, POLY, hell, dunkel } from '../../sprites.js';

symbolKunst({
  handwerk_app_bedarf(g) {
    R(g, 1, 1, 14, 14, '#e8702a'); R(g, 1, 1, 14, 2, '#f8a060'); R(g, 1, 13, 14, 2, '#a84a1a');
    R(g, 4, 6, 8, 7, '#b07a48'); R(g, 4, 6, 8, 2, '#c8925a'); R(g, 7, 6, 2, 7, '#7a5028');
    E(g, 8, 4.5, 2.6, 2.6, '#d6dce4'); E(g, 8, 4.5, 1.1, 1.1, '#5a606c');
    for (const [x, y] of [[8, 1], [5, 4], [11, 4]]) P(g, x, y, '#d6dce4');
  },
  handwerk_app_vorkommen(g) {
    R(g, 1, 1, 14, 14, '#5a6a4a'); R(g, 1, 1, 14, 2, '#7a8a6a'); R(g, 1, 13, 14, 2, '#3a4a2e');
    E(g, 8, 10, 6, 3.6, '#6b6258'); E(g, 7.5, 9, 5, 3, '#8a8074');
    for (const [x, y, f] of [[4, 8, '#d98a4e'], [8, 7, '#8fb2d8'], [10, 9, '#f2c94c'], [6, 10, '#3a3a42']]) { R(g, x, y, 2, 2, f); P(g, x, y, hell(f, 0.5)); }
    P(g, 11, 4, '#ffffff'); P(g, 12, 3, '#ffffff'); P(g, 10, 3, '#ffffff'); P(g, 11, 2, '#ffffff');
  },
  handwerk_app_paket(g) {
    R(g, 1, 1, 14, 14, '#3a5a8a'); R(g, 1, 1, 14, 2, '#5a7aaa'); R(g, 1, 13, 14, 2, '#22365a');
    R(g, 3, 5, 10, 8, '#c8a070'); R(g, 3, 5, 10, 2, '#e0bc8a'); R(g, 3, 12, 10, 1, dunkel('#c8a070', 0.3));
    R(g, 7, 5, 2, 8, '#8a5a2e'); R(g, 3, 8, 10, 1, '#8a5a2e');
    POLY(g, [[6, 3], [8, 5], [10, 3]], '#e84a4a');
  },
  handwerk_app_strom(g) {
    R(g, 1, 1, 14, 14, '#2a2a3a'); R(g, 1, 1, 14, 2, '#4a4a5a'); R(g, 1, 13, 14, 2, '#18181f');
    POLY(g, [[9, 2], [4, 9], [8, 9], [6, 14], [12, 6], [8, 6], [10, 2]], '#f2d038');
    P(g, 8, 3, '#fff6b0'); P(g, 7, 5, '#fff6b0');
  },
  handwerk_akku(g) {
    R(g, 1, 5, 12, 7, '#d8dce2'); R(g, 13, 7, 2, 3, '#d8dce2');
    R(g, 2, 6, 10, 5, '#1c1c22'); R(g, 3, 7, 8, 3, '#8fd06a');
  },
});
