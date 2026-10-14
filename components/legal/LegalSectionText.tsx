type LegalSectionTextProps = {
  /** The section's words as plain lines; lines that start with "- " are list items. */
  body: string;
  className: string;
};

type Block = { kind: "text"; line: string } | { kind: "list"; items: string[] };

// A section's words arrive as plain lines. Lines that start with "- " and follow one another are one list.
function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  body.split("\n").forEach((line) => {
    if (!line.startsWith("- ")) {
      if (line.trim() !== "") blocks.push({ kind: "text", line });
      return;
    }
    const last = blocks[blocks.length - 1];
    if (last?.kind === "list") last.items.push(line.slice(2));
    else blocks.push({ kind: "list", items: [line.slice(2)] });
  });
  return blocks;
}

// The words of one section of a legal text, shared by the full page and the sheet opened from the sign-up form.
export default function LegalSectionText({ body, className }: LegalSectionTextProps) {
  return (
    <div className={className}>
      {toBlocks(body).map((block, position) =>
        block.kind === "text" ? (
          <p key={position}>{block.line}</p>
        ) : (
          <ul key={position} className="list-disc space-y-2 pl-5 marker:text-primary">
            {block.items.map((item) => (
              <li key={item} className="pl-1">
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
