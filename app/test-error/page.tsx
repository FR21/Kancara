"use client";

import { useEffect } from "react";

export default function TestErrorPage() {
  useEffect(() => {
    // Melemparkan error secara sengaja setelah komponen di-render
    throw new Error("Ini adalah pesan error percobaan untuk mengetes halaman 500.");
  }, []);

  return <div>Halaman ini seharusnya memicu error...</div>;
}
