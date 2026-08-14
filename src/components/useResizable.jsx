import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useResizable — shared corner-drag resize for the floating info panels
 * (EEG/BIS, Waveform, Vital). Mirrors the drag convention already used across
 * those panels and ReceptorBodyPanel: document-level mouse listeners so a fast
 * drag never drops the handler, with a ref carrying the in-flight gesture and a
 * small piece of state (`size`) driving the render.
 *
 * `size.width` maps directly to the panel's outer width. `size.height` maps to
 * the panel's SCROLL-REGION height (a `maxHeight`, not a forced height) so the
 * panel still shrinks to fit short content and only grows/scrolls when the
 * content actually exceeds the current size — dragging the handle down simply
 * reveals more of the content at once, which is the whole point.
 *
 * @param {object}  opts
 * @param {number}  opts.width               initial outer width (px)
 * @param {number}  opts.height              initial scroll-region height (px)
 * @param {number} [opts.minWidth=260]
 * @param {number} [opts.minHeight=160]
 * @param {number} [opts.maxWidth]           default: viewport width  − 16
 * @param {number} [opts.maxHeight]          default: viewport height − 96
 * @returns {{ size: {width:number,height:number}, isResizing: boolean,
 *             onResizeStart: (e: MouseEvent) => void }}
 */
export function useResizable({
  width,
  height,
  minWidth = 260,
  minHeight = 160,
  maxWidth,
  maxHeight,
}) {
  const [size, setSize] = useState({ width, height });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });

  const onResizeStart = useCallback((e) => {
    if (e.button !== 0) return;
    resizeRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
    };
    setIsResizing(true);
    e.preventDefault();
    e.stopPropagation(); // don't let the corner-drag also start a header drag
  }, [size]);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizeRef.current.active) return;
      const maxW = maxWidth  ?? window.innerWidth  - 16;
      const maxH = maxHeight ?? window.innerHeight - 96;
      const r = resizeRef.current;
      setSize({
        width:  Math.max(minWidth,  Math.min(maxW, r.startW + (e.clientX - r.startX))),
        height: Math.max(minHeight, Math.min(maxH, r.startH + (e.clientY - r.startY))),
      });
    };
    const onUp = () => {
      if (!resizeRef.current.active) return;
      resizeRef.current.active = false;
      setIsResizing(false);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [minWidth, minHeight, maxWidth, maxHeight]);

  return { size, isResizing, onResizeStart };
}

/**
 * ResizeHandle — bottom-right corner grip for a resizable floating panel.
 * Place it as the last child of the panel's positioned (fixed/relative) outer
 * container. Slightly inset so it reads cleanly even when the panel card uses
 * `overflow-hidden` + rounded corners.
 *
 * @param {object}   props
 * @param {(e:MouseEvent)=>void} props.onResizeStart  from useResizable
 * @param {string}  [props.color]   grip stroke colour (panel accent)
 */
export function ResizeHandle({ onResizeStart, color = 'rgba(148,163,184,0.55)' }) {
  return (
    <div
      onMouseDown={onResizeStart}
      title="Drag to resize"
      className="absolute z-20 group"
      style={{ bottom: 0, right: 0, width: 22, height: 22, cursor: 'nwse-resize' }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        style={{ display: 'block', position: 'absolute', bottom: 2, right: 2 }}
        className="opacity-70 group-hover:opacity-100 transition-opacity"
      >
        {/* three diagonal grip lines, macOS-style, inset from the rounded corner */}
        <path
          d="M17 8 L8 17 M17 12 L12 17 M17 16 L16 17"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
