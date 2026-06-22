import type { StatusOption } from "~/lib/notion.server";

const colorMap: Record<string, string> = {
  default: "bg-gray-100 text-gray-800 border-gray-200",
  gray: "bg-gray-100 text-gray-800 border-gray-200",
  brown: "bg-amber-100 text-amber-800 border-amber-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  green: "bg-green-100 text-green-800 border-green-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

const activeColorMap: Record<string, string> = {
  default: "bg-gray-300 text-gray-900 border-gray-400",
  gray: "bg-gray-300 text-gray-900 border-gray-400",
  brown: "bg-amber-300 text-amber-900 border-amber-400",
  orange: "bg-orange-300 text-orange-900 border-orange-400",
  yellow: "bg-yellow-300 text-yellow-900 border-yellow-400",
  green: "bg-green-300 text-green-900 border-green-400",
  blue: "bg-blue-300 text-blue-900 border-blue-400",
  purple: "bg-purple-300 text-purple-900 border-purple-400",
  pink: "bg-pink-300 text-pink-900 border-pink-400",
  red: "bg-red-300 text-red-900 border-red-400",
};

interface StatusGridProps {
  options: StatusOption[];
  currentStatus: string | null;
  onSelect: (name: string) => void;
  loading: boolean;
}

export function StatusGrid({
  options,
  currentStatus,
  onSelect,
  loading,
}: StatusGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isActive = option.name === currentStatus;
        const colors = isActive
          ? activeColorMap[option.color] || activeColorMap.default
          : colorMap[option.color] || colorMap.default;

        return (
          <button
            key={option.name}
            onClick={() => onSelect(option.name)}
            disabled={loading}
            className={`min-h-14 px-4 py-3 rounded-xl font-semibold text-center border-2 transition-all active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed ${colors} ${isActive ? "ring-2 ring-offset-1 ring-text-muted" : ""}`}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
