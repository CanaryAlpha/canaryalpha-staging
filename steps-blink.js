/*
 * Section 4 "how it works": pauses the blinking step numbers while the
 * section is off screen or the tab is hidden (to save battery, and so the
 * 1-2-3 loop resumes where it stopped). The blink itself is plain CSS
 * (steps-blink keyframes in styles.css; speed: --steps-step-duration).
 */
(function () {
  var section = document.querySelector("#how-it-works");
  if (!section) return;
  var offscreen = false;
  function update() {
    section.classList.toggle("is-paused", offscreen || document.hidden);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      offscreen = !entries[0].isIntersecting;
      update();
    }).observe(section);
  }
  document.addEventListener("visibilitychange", update);
  update();
})();
