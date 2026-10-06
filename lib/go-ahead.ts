const GO_AHEAD =
  /^(gas+|gass?keun|lanjut(kan)?|buat(kan)?( (jadwal|rencana)(nya)?)?|go|next|continue|proceed|let'?s go)( (aja|dong|deh|ya|sekarang|now|please))*[\s.!]*$/i;

export function isGoAhead(story: string): boolean {
  return GO_AHEAD.test(story.trim());
}
