// Blockfilm – Vorschaubild (Thumbnail) für einen Film.
//   vorschaubild "Kurzer Titel"            dieser Moment wird das Vorschaubild, mit großem Titel darüber
//   vorschaubild "Kurzer Titel" bei 42     Moment in Sekunden selbst angeben
// Ohne den Befehl sucht hf/komponiere.js (window.__bfVorschaubild) den vollsten Moment und nimmt den Filmtitel.
(function () {
  const BF = (window.BF = window.BF || {});
  const Z = (BF.zusatz = BF.zusatz || {});
  Z.vorschaubild = Z.thumbnail = function (w, t, h) {
    const text = w.text();
    const bei = w.optZahl(['bei', 'zeit', 'um']);
    h.F.vorschaubild = { text: text ? String(text).slice(0, 60) : null, t: bei != null ? bei : t < 1 ? null : t + 0.6 }; // ganz am Anfang: Moment selbst suchen
    return 0;
  };
})();
