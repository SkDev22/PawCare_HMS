// Generic "Tab-equivalent" helper — walks the DOM's visible focusable
// elements in document order and focuses the one after `current`. Used by
// useComboboxKeyboardNav so picking a search-dropdown result with Enter can
// jump to the next field without every picker needing to know what its own
// "next field" is.
export function focusNextTabbable(current: HTMLElement): void {
  const selector =
    'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null,
  );
  const idx = focusables.indexOf(current);
  if (idx >= 0 && idx + 1 < focusables.length) {
    focusables[idx + 1].focus();
  }
}
