// Loads the 3D phone only on desktop-class devices (wide screen, mouse, motion allowed).
// Phones and tablets never download three.js and keep the simple page.
const desktop = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

if (desktop.matches && !calm.matches) {
  const stage = document.querySelector(".scrolly");
  const canvas = stage?.querySelector("canvas");
  if (stage && canvas) {
    document.documentElement.classList.add("has-3d");
    import("./phone.js")
      .then(({ start }) => {
        if (!start(stage, canvas)) document.documentElement.classList.remove("has-3d");
      })
      .catch(() => document.documentElement.classList.remove("has-3d"));
  }
}
