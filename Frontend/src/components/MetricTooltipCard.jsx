import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function MetricTooltipCard({
  title,
  leadingIcon,
  value,
  tone = "",
  detail,
  definition,
  formula,
  period,
  source,
  className = "",
  style,
  valueStyle,
}) {
  const cardRef = useRef(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const tooltipId = useId();

  const hide = (delay = 100) => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setTooltip(null), delay);
  };

  const scheduleShow = () => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(360, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
      const top = Math.min(rect.bottom + 10, Math.max(12, window.innerHeight - 220));
      const placeAbove = window.innerHeight - rect.bottom < 220;
      setTooltip({ left, top: placeAbove ? Math.max(12, rect.top - 210) : top });
    }, 3000);
  };

  useEffect(() => () => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);

  return (
    <>
      <div
        ref={cardRef}
        className={`metric metricExplained ${tone} ${className}`.trim()}
        style={style}
        tabIndex={0}
        onMouseEnter={scheduleShow}
        onMouseLeave={() => hide()}
        onFocus={scheduleShow}
        onBlur={() => hide()}
        aria-describedby={tooltip ? tooltipId : undefined}
      >
        <span className={leadingIcon ? "metricTitleWithIcon" : undefined}>
          {leadingIcon}{title}
        </span>
        <b style={valueStyle}>{value}</b>
        {detail && <small className="metricCardDetail">{detail}</small>}
      </div>
      {tooltip && createPortal(
        <div
          id={tooltipId}
          className="metricTooltip"
          role="tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
          onMouseEnter={() => {
            clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={() => hide(0)}
        >
          <strong>{title}</strong>
          <p>{definition}</p>
          <dl>
            <div><dt>Formula</dt><dd>{formula}</dd></div>
            <div><dt>Period</dt><dd>{period}</dd></div>
            <div><dt>Source</dt><dd>{source}</dd></div>
          </dl>
        </div>,
        document.body,
      )}
    </>
  );
}
