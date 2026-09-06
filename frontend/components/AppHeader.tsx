"use client";

const NAV_BUTTON_CLASSES =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#209dd7]/30";

export default function AppHeader({
  title,
  subtitle,
  showChangeDocument,
  onChangeDocument,
  onHistory,
  onSignOut,
}: {
  title: string;
  subtitle: string;
  showChangeDocument: boolean;
  onChangeDocument: () => void;
  onHistory: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white/80 px-6 py-4 backdrop-blur print:hidden">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[#032147]">{title}</h1>
        <p className="text-sm text-[#888888]">{subtitle}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {showChangeDocument && (
          <button type="button" onClick={onChangeDocument} className={NAV_BUTTON_CLASSES}>
            Change Document
          </button>
        )}
        <button type="button" onClick={onHistory} className={NAV_BUTTON_CLASSES}>
          History
        </button>
        <button type="button" onClick={onSignOut} className={NAV_BUTTON_CLASSES}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
