import { Phone } from "lucide-react";

export default function PhoneLink({ phone, icon = false }) {
  if (!phone) return <span>—</span>;
  return (
    <a
      className="phoneLink"
      href={`tel:${phone}`}
      onClick={(event) => event.stopPropagation()}
    >
      {icon && <Phone size={13} style={{ verticalAlign: "middle", marginRight: "3px" }} />} {phone}
    </a>
  );
}
