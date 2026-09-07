import { useEffect, useState, type KeyboardEvent, type RefObject } from 'react';
import { focusNextTabbable } from '../lib/focus-next-tabbable';

// Shared keyboard behavior for the codebase's hand-rolled "type to search,
// pick a result" dropdowns (Supplier picker, item/owner/pet search boxes,
// etc.) — arrow keys move a highlighted index, Enter selects it. Each site
// keeps its own markup/styling; this only supplies the interaction logic so
// it isn't reimplemented (and re-bugged) independently in every picker.
export function useComboboxKeyboardNav<T>({
  results,
  isOpen,
  onSelect,
  focusNextOnSelect = true,
  containerRef,
}: {
  results: T[];
  isOpen: boolean;
  onSelect: (item: T) => void;
  // Off for pickers where staying put is the right behavior after a pick —
  // e.g. POS's item search, which should stay focused so the next barcode
  // can be scanned immediately rather than jumping to another field.
  focusNextOnSelect?: boolean;
  // Results container, so the highlighted row can be scrolled into view
  // when it's outside the visible scroll area.
  containerRef?: RefObject<HTMLElement | null>;
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // A fresh set of results (new keystroke) always starts highlighting the
  // top match rather than whatever index was highlighted before.
  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  useEffect(() => {
    containerRef?.current?.children[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, containerRef]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      const item = results[highlightedIndex];
      if (!item) return;
      e.preventDefault();
      onSelect(item);
      if (focusNextOnSelect) {
        const el = e.currentTarget;
        requestAnimationFrame(() => focusNextTabbable(el));
      }
    }
  }

  return { highlightedIndex, setHighlightedIndex, handleKeyDown };
}
