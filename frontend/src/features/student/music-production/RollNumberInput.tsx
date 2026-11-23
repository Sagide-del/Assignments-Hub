import { useEffect, useRef, useState } from "react";
/** Keep intermediate text (empty, 0., 12…) while typing; commit once on Enter/blur. */
export function RollNumberInput({
  value,
  label,
  min,
  max,
  step = 1,
  integer = false,
  onCommit,
}: {
  value: number;
  label: string;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value)),
    editing = useRef(false),
    cancel = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);
  const number = Number(text),
    valid =
      text.trim() !== "" &&
      Number.isFinite(number) &&
      number >= min &&
      number <= max &&
      (!integer || Number.isInteger(number));
  return (
    <input
      type="text"
      role="spinbutton"
      inputMode={integer ? "numeric" : "decimal"}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-invalid={!valid}
      title={`${min}–${max} · Enter to apply`}
      value={editing.current ? text : String(value)}
      onFocus={() => {
        setText(String(value));
        editing.current = true;
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        editing.current = false;
        if (cancel.current) {
          cancel.current = false;
          setText(String(value));
          return;
        }
        if (valid) {
          setText(String(number));
          if (number !== value) onCommit(number);
        } else setText(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel.current = true;
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = Math.max(
            min,
            Math.min(
              max,
              Number(
                (
                  (valid ? number : value) +
                  (e.key === "ArrowUp" ? step : -step)
                ).toFixed(4),
              ),
            ),
          );
          setText(String(next));
          if (next !== value) onCommit(next);
        }
      }}
    />
  );
}
