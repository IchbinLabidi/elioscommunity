import { useState } from 'react';
import { BRAND } from '../../config/brand';
import { cx } from '../../lib/utils';

type BrandWordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'light';
  showIcon?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

const sizeClasses = {
  sm: {
    icon: 'h-7 w-7',
    text: 'text-xl',
    gap: 'gap-2',
  },
  md: {
    icon: 'h-10 w-10',
    text: 'text-3xl',
    gap: 'gap-3',
  },
  lg: {
    icon: 'h-12 w-12',
    text: 'text-4xl sm:text-5xl lg:text-7xl',
    gap: 'gap-4',
  },
} as const;

export default function BrandWordmark({
  size = 'md',
  variant = 'default',
  showIcon = true,
  className = '',
  iconClassName = '',
  textClassName = '',
}: BrandWordmarkProps) {
  const sizes = sizeClasses[size];
  const [iconSource, setIconSource] = useState<string>(BRAND.icon);
  const [iconFailed, setIconFailed] = useState(false);
  const mainTextClass = variant === 'light' ? 'text-white' : 'text-brand-navy';

  return (
    <span className={cx('inline-flex min-w-0 items-center', sizes.gap, className)}>
      {showIcon && !iconFailed ? (
        <img
          src={iconSource}
          alt=""
          aria-hidden="true"
          onError={() => {
            if (iconSource !== BRAND.fallbackIcon) {
              setIconSource(BRAND.fallbackIcon);
              return;
            }
            setIconFailed(true);
          }}
          className={cx('shrink-0 object-contain', sizes.icon, iconClassName)}
        />
      ) : null}
      <span
        aria-label={BRAND.name}
        className={cx('inline-flex min-w-0 items-baseline whitespace-nowrap leading-none tracking-tight', sizes.text, textClassName)}
      >
        <span className={cx('font-black', mainTextClass)}>sos</span>
        <span className={cx('font-semibold', mainTextClass)}>prof</span>
        <span className="ml-[2px] text-[0.62em] font-bold text-brand-orange">.tn</span>
      </span>
    </span>
  );
}

export type { BrandWordmarkProps };
