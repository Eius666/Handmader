import type { CSSProperties } from 'react';

function shimmerStyle(): CSSProperties {
  return {
    background: 'linear-gradient(90deg, rgb(var(--muted-foreground-rgb) / 10%) 0%, rgb(var(--muted-foreground-rgb) / 20%) 50%, rgb(var(--muted-foreground-rgb) / 10%) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl bg-card p-4"
      style={{ border: '1px solid rgb(var(--primary-rgb) / 8%)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-xl" style={shimmerStyle()} />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded-full" style={shimmerStyle()} />
          <div className="h-3.5 w-full rounded-full" style={shimmerStyle()} />
          <div className="h-3.5 w-3/4 rounded-full" style={shimmerStyle()} />
        </div>
        <div className="h-5 w-16 shrink-0 rounded-full" style={shimmerStyle()} />
      </div>
      <div className="mt-3.5 flex gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="h-2.5 w-24 rounded-full" style={shimmerStyle()} />
        <div className="h-2.5 w-16 rounded-full" style={shimmerStyle()} />
      </div>
    </div>
  );
}

export function SkeletonChatItem() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="size-11 shrink-0 rounded-full" style={shimmerStyle()} />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-28 rounded-full" style={shimmerStyle()} />
          <div className="h-2.5 w-10 rounded-full" style={shimmerStyle()} />
        </div>
        <div className="h-2.5 w-44 rounded-full" style={shimmerStyle()} />
      </div>
    </div>
  );
}
