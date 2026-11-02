import React from "react";
import { Plus } from "lucide-react";
import { money } from "../services/dailyFinanceApi.js";
import MetricTooltipCard from "../../components/MetricTooltipCard.jsx";

export function Metric({ title, value, tone = "", count = false, explanation, formula, period, source }) {
  if (explanation) {
    return (
      <MetricTooltipCard
        title={title}
        value={count ? Number(value || 0) : money(value)}
        tone={tone}
        definition={explanation}
        formula={formula}
        period={period}
        source={source}
      />
    );
  }

  return (
    <div className={`metric ${tone}`}>
      <span>{title}</span>
      <b>{count ? Number(value || 0) : money(value)}</b>
    </div>
  );
}

export function Empty({ text }) {
  return (
    <div className="empty">
      <div>
        <Plus size={22} />
      </div>
      <b>{text}</b>
    </div>
  );
}

export function PhoneLink({ phone }) {
  return (
    <a
      className="phoneLink"
      href={`tel:${phone}`}
      onClick={(event) => event.stopPropagation()}
    >
      {phone}
    </a>
  );
}
