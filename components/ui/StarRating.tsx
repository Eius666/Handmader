'use client';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  onChange?: (v: number) => void;
}

export function StarRating({ value, max = 5, size = 16, onChange }: StarRatingProps) {
  return (
    <span className="inline-flex" style={{ gap: 2 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          style={{
            fontSize: size,
            color: star <= value ? '#F2CC8F' : '#DDD0C4',
            cursor: onChange ? 'pointer' : 'default',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}
