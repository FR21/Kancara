type AuthHeadingProps = {
  title: string;
  subtitle: string;
};

export default function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <header>
      <h1 className="text-h2 text-text sm:text-h1">{title}</h1>
      <p className="mt-2 text-body text-pretty text-text-muted">{subtitle}</p>
    </header>
  );
}
