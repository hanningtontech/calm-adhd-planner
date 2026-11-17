/**
 * Edition model for Etsy:
 * - Public GitHub Pages build defaults to "demo" (limited, honest banner).
 * - Paid zip ships with ?edition=full or data-edition="full" on <html>.
 * No passwords — the paid product is the downloadable full package.
 */

const DEMO_LIMITS = {
  bills: 5,
  spends: 20,
  debts: 2,
  projects: 2,
  tasks: 10,
  quickCapture: 15,
};

export function detectEdition() {
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("edition");
  const fromHtml = document.documentElement.dataset.edition;
  const value = (fromQuery || fromHtml || "demo").toLowerCase();
  if (value === "full" || value === "paid" || value === "pro") return "full";
  return "demo";
}

export function editionLimits(edition) {
  return edition === "full" ? null : DEMO_LIMITS;
}

export function canAdd(edition, kind, currentCount) {
  const limits = editionLimits(edition);
  if (!limits) return true;
  const max = limits[kind];
  if (max == null) return true;
  return currentCount < max;
}

export function editionBannerHtml(edition) {
  if (edition === "full") return "";
  return `<aside class="edition-banner" role="status">
    <div>
      <strong>Public demo</strong>
      <p>A limited companion to the printable Calm ADHD Planner. Lists are capped so you can try the flow. The Etsy full edition removes caps and includes install notes.</p>
    </div>
    <a class="button button-primary" href="#/overview">Continue exploring</a>
  </aside>`;
}
