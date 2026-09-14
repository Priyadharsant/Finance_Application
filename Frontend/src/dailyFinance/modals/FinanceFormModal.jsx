import React from "react";
import { X } from "lucide-react";
import { money } from "../services/dailyFinanceApi.js";

export default function FinanceFormModal({
  finance,
  setFinance,
  submit,
  busy,
  close,
}) {
  const interest =
    finance.interestType === "PERCENT"
      ? (Number(finance.grossFinanceAmount || 0) *
          Number(finance.interestValue || 0)) /
        100
      : Number(finance.interestValue || 0);

  const amountGiven = Math.max(
    0,
    Number(finance.grossFinanceAmount || 0) - interest,
  );

  const set = (key) => (event) =>
    setFinance({ ...finance, [key]: event.target.value });

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form className="formCard modalForm" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X size={18} />
        </button>
        <div className="formTitle">
          <span className="overline">ADD CUSTOMER / FINANCE</span>
          <h2>Create a finance record</h2>
          <p>Interest is deducted at the beginning and becomes the profit.</p>
        </div>
        <div className="formGrid">
          <label>
            Customer name
            <input
              required
              value={finance.customerName}
              onChange={set("customerName")}
            />
          </label>
          <label>
            Phone number
            <input
              value={finance.mobileNumber}
              onChange={set("mobileNumber")}
            />
          </label>
          <label className="wide">
            Address
            <input value={finance.address} onChange={set("address")} />
          </label>
          <label>
            Finance date
            <input
              type="date"
              required
              value={finance.financeDate}
              onChange={set("financeDate")}
            />
          </label>
          <label>
            Finance amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={finance.grossFinanceAmount}
              onChange={set("grossFinanceAmount")}
            />
          </label>
          <label>
            Interest type
            <select value={finance.interestType} onChange={set("interestType")}>
              <option value="PERCENT">Percentage</option>
              <option value="AMOUNT">Fixed amount</option>
            </select>
          </label>
          <label>
            Interest value
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={finance.interestValue}
              onChange={set("interestValue")}
            />
          </label>
          <label className="wide">
            Notes
            <textarea value={finance.notes} onChange={set("notes")} />
          </label>
        </div>
        <div className="breakdown">
          <span>
            Interest amount<b>{money(interest)}</b>
          </span>
          <span>
            Amount given<b>{money(amountGiven)}</b>
          </span>
          <span>
            Total return<b>{money(finance.grossFinanceAmount)}</b>
          </span>
          <span>
            Profit<b>{money(interest)}</b>
          </span>
        </div>
        <button className="primary full" disabled={busy}>
          Save finance
        </button>
      </form>
    </div>
  );
}
