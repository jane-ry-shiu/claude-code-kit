// Browser-side. Measures target rects relative to a region, in CSS px. Draws nothing.
// input:   { region: CSS selector, or null for the viewport, targets: [{ selector, n?, meaning, note?, badge? }] }
// returns: { region: { width, height }, targets: [{ ...target, rect: [x, y, width, height] }] }
(input) => {
  const regionEl = input.region ? document.querySelector(input.region) : null;
  if (input.region && !regionEl) throw new Error(`region not found: ${input.region}`);
  const origin = regionEl ? regionEl.getBoundingClientRect() : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  if (!origin.width || !origin.height) throw new Error(`region has no box: ${input.region}`);
  const round = (v) => Math.round(v * 10) / 10;
  const targets = input.targets.map((target) => {
    const el = document.querySelector(target.selector);
    if (!el) throw new Error(`target not found: ${target.selector}`);
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) throw new Error(`target has no box: ${target.selector}`);
    return { ...target, rect: [round(r.x - origin.x), round(r.y - origin.y), round(r.width), round(r.height)] };
  });
  return { region: { width: round(origin.width), height: round(origin.height) }, targets };
}
