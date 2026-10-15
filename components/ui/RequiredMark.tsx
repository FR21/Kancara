/** The mark after a required field's label. The field itself says it is required to assistive technology. */
export default function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-error">
      *
    </span>
  );
}
