import { useState, useRef, useEffect, useMemo } from "react";

export default function SearchableSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  required,
  hint,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(
      (o) =>
        (o.label && o.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.subtext && o.subtext.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  return (
    <div className="searchableSelectWrap" ref={dropdownRef}>
      <label>
        {label} {required && "*"}
      </label>
      <div
        className={`searchableSelectControl ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedOption ? selectedOption.label : placeholder || "Select..."}
        </span>
        <i className="dropdownArrow">▾</i>
      </div>

      {isOpen && (
        <div className="searchableDropdownMenu">
          <div className="searchableSearchBox">
            <input
              autoFocus
              placeholder="🔍 Search option..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="searchableOptionList">
            {filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`searchableOptionItem ${opt.value === value ? "selected" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value, opt);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                <b>{opt.label}</b>
                {opt.subtext && <small>{opt.subtext}</small>}
              </div>
            ))}
            {!filteredOptions.length && (
              <div className="noOptions">No matches found</div>
            )}
          </div>
        </div>
      )}
      {hint && <small className="fieldHint">{hint}</small>}
    </div>
  );
}
