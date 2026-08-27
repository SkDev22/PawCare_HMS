const DEFAULT_FAVICON_HREF = "/favicon.svg";

// Same badge + lucide "paw-print" glyph as the static public/favicon.svg and
// the sidebar logo (see app-sidebar.tsx), just with the fill color swapped
// for the clinic's chosen brand color.
function buildFaviconSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${color}"/><g transform="translate(3,3) scale(1.0833)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></g></svg>`;
}

function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  return link;
}

export function setClinicFavicon(color: string) {
  const link = getFaviconLink();
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(buildFaviconSvg(color))}`;
}

export function resetFavicon() {
  const link = getFaviconLink();
  link.type = "image/svg+xml";
  link.href = DEFAULT_FAVICON_HREF;
}
