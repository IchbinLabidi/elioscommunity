import { useState } from 'react';
import { BRAND } from '../../config/brand';
import { cx } from '../../lib/utils';

type BrandWordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  textClassName?: string;
};

const sizeClasses = {
  sm: {
    icon: 'h-8 w-8',
    text: 'text-lg',
  },
  md: {
    icon: 'h-10 w-10',
    text: 'text-xl',
  },
  lg: {
    icon: 'h-12 w-12',
    text: 'text-2xl',
  },
} as const;

export default function BrandWordmark({
  size = 'md',
  showIcon = true,
  className = '',
  textClassName = '',
}: BrandWordmarkProps) {
  const sizes = sizeClasses[size];
  const [iconSource, setIconSource] = useState<string>(BRAND.icon);
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <span className={cx('inline-flex min-w-0 items-center gap-2.5', className)}>
      {showIcon && !iconFailed ? (
        <img
          src={iconSource}
          alt=""
          onError={() => {
            if (iconSource !== BRAND.fallbackIcon) {
              setIconSource(BRAND.fallbackIcon);
              return;
            }
            setIconFailed(true);
          }}
          className={cx('shrink-0 rounded-xl object-contain', sizes.icon)}
        />
      ) : null}
      <span className={cx('inline-flex min-w-0 items-baseline leading-none tracking-tight', sizes.text, textClassName)}>
        <span className="font-black text-brand-navy">sos</span>
        <span className="font-semibold text-brand-navy">prof</span>
        <span className="ml-0.5 text-[0.72em] font-bold text-brand-orange">.tn</span>
      </span>
    </span>
  );
}
