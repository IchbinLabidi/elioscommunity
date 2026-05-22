import { Star } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../../lib/utils';

export default function RatingStars({
  value,
  onChange,
  size = 'md',
  showValue = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md';
  showValue?: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const activeValue = hovered ?? value;

  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : 'img'} aria-label={`${Number(value || 0).toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          title={`${rating} star${rating > 1 ? 's' : ''}`}
          aria-label={`${rating} star${rating > 1 ? 's' : ''}`}
          aria-checked={onChange ? rating === value : undefined}
          role={onChange ? 'radio' : undefined}
          disabled={!onChange}
          onClick={() => onChange?.(rating)}
          onMouseEnter={() => onChange && setHovered(rating)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => onChange && setHovered(rating)}
          onBlur={() => setHovered(null)}
          className={cx(onChange && 'transition hover:scale-110', !onChange && 'cursor-default')}
        >
          <Star
            className={cx(
              size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
              rating <= Math.round(activeValue) ? 'fill-elios-yellow text-elios-yellow' : 'text-slate-300',
            )}
          />
        </button>
      ))}
      {showValue ? <span className="ml-1 text-sm font-semibold text-slate-600">{Number(value || 0).toFixed(1)} / 5</span> : null}
    </div>
  );
}
