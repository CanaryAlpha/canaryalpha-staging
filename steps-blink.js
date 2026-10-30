/*
 * Section 4 "how it works": pauses the blinking step numbers while the
 * section is off screen, to save battery. The blink itself is plain CSS
 * (steps-blink keyframes in styles.css).
 */
(function () {
  var section = document.querySelector("#how-it-works");
  if (!section || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (entries) {
    section.classList.toggle("is-offscreen", !entries[0].isIntersecting);
  }).observe(section);
})();
