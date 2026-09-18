import { X } from "lucide-react";

export default function AddLoanSchemeModal({
  show,
  onClose,
  typeForm,
  setTypeForm,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div
      className="modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="formCard modalForm"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <div className="formTitle">
          <span className="overline autoBadgeTag">LOAN SCHEME</span>
          <h2>Create Loan Scheme</h2>
        </div>
        <div className="formGrid">
          <label>
            Scheme Name
            <input
              required
              placeholder="e.g. Two Wheeler Flat Scheme"
              value={typeForm.name}
              onChange={(e) =>
                setTypeForm({ ...typeForm, name: e.target.value })
              }
            />
          </label>
          <label>
            Interest Type
            <select
              value={typeForm.interestType}
              onChange={(e) =>
                setTypeForm({ ...typeForm, interestType: e.target.value })
              }
            >
              <option value="FLAT">Flat Interest</option>
              <option value="REDUCING">Reducing Balance</option>
            </select>
          </label>
          <label>
            Base Interest Rate (% p.a.)
            <input
              type="number"
              step="0.1"
              required
              value={typeForm.baseInterestRate}
              onChange={(e) =>
                setTypeForm({
                  ...typeForm,
                  baseInterestRate: e.target.value,
                })
              }
            />
          </label>
          <label>
            Default Tenure (Months)
            <input
              type="number"
              required
              value={typeForm.defaultTenureMonths}
              onChange={(e) =>
                setTypeForm({
                  ...typeForm,
                  defaultTenureMonths: e.target.value,
                })
              }
            />
          </label>
        </div>
        <button className="primary autoBtn full">Create Scheme</button>
      </form>
    </div>
  );
}
