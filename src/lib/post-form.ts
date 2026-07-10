export function parseTagInput(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of input.split(/[,，\s]+/)) {
    const tag = raw.trim().replace(/^#+/, "");
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
  }

  return tags;
}
