// Browser-side. Measures target rects relative to a region, in CSS px. Draws nothing.
// input:   { region: CSS selector, or null for the viewport, targets: [{ selector, n?, meaning, note?, badge? }] }
// returns: { region: { width, height }, targets: [{ ...target, rect: [x, y, width, height] }] }
(input) => {
  // Exactly one match, or the box would land on whichever element happens to come first.
  const only = (selector, kind) => {
    const found = document.querySelectorAll(selector);
    if (found.length === 0) throw new Error(`${kind} not found: ${selector}`);
    if (found.length > 1) throw new Error(`${kind} matches ${found.length} elements: ${selector}`);
    return found[0];
  };
  const regionEl = input.region ? only(input.region, 'region') : null;
  const origin = regionEl ? regionEl.getBoundingClientRect() : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
  if (!origin.width || !origin.height) throw new Error(`region has no box: ${input.region}`);
  const round = (v) => Math.round(v * 10) / 10;
  const targets = input.targets.map((target) => {
    const el = only(target.selector, 'target');
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) throw new Error(`target has no box: ${target.selector}`);
    return { ...target, rect: [round(r.x - origin.x), round(r.y - origin.y), round(r.width), round(r.height)] };
  });
  return { region: { width: round(origin.width), height: round(origin.height) }, targets };
}
