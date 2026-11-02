const PHONE_FIELD = /phone|mobile|contact|whatsapp/i;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

function collectSearchValues(value, key = "", seen = new WeakSet(), result = []) {
  if (value == null) return result;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    result.push({ key, value: String(value) });
    return result;
  }

  if (value instanceof Date) {
    result.push({ key, value: value.toISOString() });
    return result;
  }

  if (typeof value !== "object" || seen.has(value)) return result;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectSearchValues(item, key, seen, result));
  } else {
    const firstName = value.first_name ?? value.firstName;
    const lastName = value.last_name ?? value.lastName;
    if (firstName || lastName) {
      result.push({ key: "full_name", value: `${firstName || ""} ${lastName || ""}`.trim() });
    }
    Object.entries(value).forEach(([childKey, childValue]) =>
      collectSearchValues(childValue, childKey, seen, result),
    );
  }

  return result;
}

/** Case-insensitive partial match across every scalar field in one or more records. */
export function matchesSearch(query, ...records) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const digitsQuery = normalizedQuery.replace(/\D/g, "");
  const searchPhoneDigits = digitsQuery.length >= 3 && /^[\d\s()+.-]+$/.test(String(query));

  return records
    .flatMap((record) => collectSearchValues(record))
    .some(({ key, value }) => {
      if (normalizeText(value).includes(normalizedQuery)) return true;
      if (searchPhoneDigits && PHONE_FIELD.test(key)) {
        return value.replace(/\D/g, "").includes(digitsQuery);
      }
      return false;
    });
}
