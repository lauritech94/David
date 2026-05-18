import { useCallback, useRef } from 'react';

export interface TextSelection {
  selectedText: string;
  clauseNumber: string;
  selectionStart: number;
  selectionEnd: number;
}

interface TextSelectionHandlerProps {
  children: React.ReactNode;
  onTextSelected: (selection: TextSelection) => void;
  enabled?: boolean;
}

export function TextSelectionHandler({ children, onTextSelected, enabled = true }: TextSelectionHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (!enabled) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const selectedText = sel.toString().trim();
    if (selectedText.length < 3) return;

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Find clause number from data-clause attribute
    let clauseNumber = 'general';
    let node: Node | null = range.startContainer;
    while (node && node !== container) {
      if (node instanceof HTMLElement && node.dataset.clause) {
        clauseNumber = node.dataset.clause;
        break;
      }
      node = node.parentNode;
    }

    // Calculate character offset relative to the container's text content
    const preRange = document.createRange();
    preRange.setStart(container, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const selectionStart = preRange.toString().length;
    const selectionEnd = selectionStart + selectedText.length;

    onTextSelected({
      selectedText,
      clauseNumber,
      selectionStart,
      selectionEnd,
    });
  }, [enabled, onTextSelected]);

  return (
    <div ref={containerRef} onMouseUp={handleMouseUp}>
      {children}
    </div>
  );
}
