import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gray-50">
      <p className="text-5xl font-bold text-gray-900">404</p>
      <p className="text-sm text-gray-500 mt-2">This page doesn&apos;t exist.</p>
      <Link
        href="/colleges"
        className="mt-6 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition"
      >
        Back to Colleges
      </Link>
    </div>
  );
}
