import { Compass, MapPin, Users, WifiOff } from "lucide-react";

// Temporary home page. Replace with the real landing page.
const FEATURES = [
  {
    icon: Users,
    title: "Untuk seluruh rombongan",
    body: "Kebutuhan tiap anggota diperhitungkan, jadi tidak ada yang dikorbankan.",
  },
  {
    icon: Compass,
    title: "Dari rencana sampai pulang",
    body: "Satu pendamping untuk seluruh perjalanan, bukan cuma tahap perencanaan.",
  },
  {
    icon: WifiOff,
    title: "Tetap jalan offline",
    body: "Itinerary dan info penting tetap bisa diakses tanpa sinyal.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-start gap-6 px-6 pt-40 pb-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-label text-on-accent">
          <MapPin className="size-4" aria-hidden="true" />
          Inclusive group travel
        </span>
        <h1 className="text-display">Perjalanan rombongan, tanpa ada yang tertinggal.</h1>
        <p className="max-w-2xl text-text-muted">
          Kancara adalah pendamping perjalanan multi-agen untuk rombongan dengan kebutuhan
          berbeda, dari perencanaan sampai pulang.
        </p>
        <a
          href="#fitur"
          className="rounded-full bg-primary px-6 py-3 text-label-lg text-on-primary transition-colors hover:bg-primary-hover"
        >
          Lihat fitur
        </a>
      </section>

      <section id="fitur" className="bg-surface py-24">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-background p-6"
            >
              <Icon className="size-8 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-h3">{title}</h2>
              <p className="mt-2 text-body-sm text-text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <h2>Placeholder</h2>
        <p className="mt-4 h-[60vh] text-text-muted">
          Ruang kosong supaya halaman bisa di-scroll untuk mencoba efek navbar.
        </p>
      </section>
    </main>
  );
}
