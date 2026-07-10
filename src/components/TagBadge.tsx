import Link from "next/link";

export default function TagBadge({ tag }: { tag: string }) {
  return (
    <Link
      href={`/tags/${encodeURIComponent(tag)}`}
      className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
    >
      #{tag}
    </Link>
  );
}
