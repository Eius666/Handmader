export function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-2xl bg-white p-4"
      style={{ border: '1px solid rgba(180,100,70,0.08)', boxShadow: '0 2px 10px rgba(140,80,50,0.04)' }}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded-full bg-gray-200" />
          <div className="h-3.5 w-full rounded-full bg-gray-200" />
          <div className="h-3.5 w-3/4 rounded-full bg-gray-200" />
        </div>
        <div className="h-5 w-16 shrink-0 rounded-full bg-gray-200" />
      </div>
      <div className="mt-3.5 flex gap-3 border-t border-gray-100 pt-3">
        <div className="h-2.5 w-24 rounded-full bg-gray-200" />
        <div className="h-2.5 w-16 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

export function SkeletonChatItem() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-5 py-3.5">
      <div className="size-11 shrink-0 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-28 rounded-full bg-gray-200" />
          <div className="h-2.5 w-10 rounded-full bg-gray-200" />
        </div>
        <div className="h-2.5 w-44 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}
