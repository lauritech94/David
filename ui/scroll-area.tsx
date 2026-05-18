import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    /** Enables click+drag (grab) scrolling with the mouse. */
    enableDragScroll?: boolean;
  }
>(({ className, children, enableDragScroll = true, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!enableDragScroll) return;

    const container = containerRef.current;
    if (!container) return;

    const viewport = container.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null;
    if (!viewport) return;

    const state = {
      dragging: false,
      startY: 0,
      startScrollTop: 0,
      pointerId: -1,
    };

    const isInteractiveTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          "button,a,input,textarea,select,summary,[role='button'],[role='option'],[role='listbox'],[data-radix-select-viewport],[data-no-drag-scroll]"
        )
      );
    };

    viewport.style.cursor = "grab";

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (e.button !== 0) return;
      if (isInteractiveTarget(e.target)) return;

      state.dragging = true;
      state.pointerId = e.pointerId;
      state.startY = e.clientY;
      state.startScrollTop = viewport.scrollTop;

      viewport.style.cursor = "grabbing";
      viewport.style.userSelect = "none";

      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!state.dragging) return;
      if (e.pointerId !== state.pointerId) return;

      // Prevent text selection while dragging
      e.preventDefault();

      const deltaY = e.clientY - state.startY;
      viewport.scrollTop = state.startScrollTop - deltaY;
    };

    const endDrag = (e?: PointerEvent) => {
      if (!state.dragging) return;
      state.dragging = false;
      viewport.style.cursor = "grab";
      viewport.style.userSelect = "";
      if (e) {
        try {
          viewport.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => endDrag(e);
    const onPointerCancel = (e: PointerEvent) => endDrag(e);

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove, { passive: false });
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerCancel);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [enableDragScroll]);

  return (
    <div ref={containerRef}>
      <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <ScrollAreaPrimitive.Viewport
          className="h-full w-full rounded-[inherit] overflow-auto touch-pan-y overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </div>
  );
})
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
