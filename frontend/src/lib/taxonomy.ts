export const GAME_GENRES = [
  "Action",
  "FPS / TPS",
  "Hack & Slash",
  "Adventure",
  "Puzzle",
  "Arcade",
  "Simulation",
  "Sports",
  "Point & Click",
  "Strategy",
  "Racing",
  "MMO",
  "RPG",
  "Fighting",
  "Music",
  "Indie",
  "Platformer",
  "Educational",
] as const;

export function genreSearchHref(genre: string): string {
  return `/store?genre=${encodeURIComponent(genre)}`;
}
