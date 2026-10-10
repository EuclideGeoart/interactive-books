/** A radio group drawn as a segmented control. Native radios: keyboard (arrows) and screen-reader semantics are free. */
export interface SegmentOption<T extends string> {
  readonly id: T;
  readonly label: string;
}

export function SegmentedControl<T extends string>({ legend, name, options, value, onChange }: { legend: string; name: string; options: readonly SegmentOption<T>[]; value: T; onChange(next: T): void }) {
  return (
    <fieldset class="segmented">
      <legend>{legend}</legend>
      <div class="segments">
        {options.map(option => (
          <label class="segment" key={option.id}>
            <input type="radio" name={name} value={option.id} checked={option.id === value} onChange={() => onChange(option.id)} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
