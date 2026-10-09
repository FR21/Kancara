type JsonLdProps = {
  data: object;
};

/** Prints structured data for search engines. `<` is escaped so text inside it can never close the script tag. */
export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
