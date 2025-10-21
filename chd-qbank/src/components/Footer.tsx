export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CHD QBank. All rights reserved.</p>
        <p>Supabase-backed tutor mode with murmur audio + CXR matching games.</p>
      </div>
    </footer>
  );
}
