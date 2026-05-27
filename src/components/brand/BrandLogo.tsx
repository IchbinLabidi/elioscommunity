import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { cx } from '../../lib/utils';
import BrandWordmark from './BrandWordmark';

type BrandLogoProps = {
  to?: string;
  compact?: boolean;
  variant?: 'lockup' | 'horizontal' | 'dark' | 'icon';
  fallbackText?: boolean;
  className?: string;
  imageClassName?: string;
  onClick?: () => void;
};

export function BrandAssetImage({
  className = '',
  onError,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { variant?: 'icon' }) {
  const [imageSource, setImageSource] = useState<string>(BRAND.icon);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    setImageSource(BRAND.icon);
    setIsHidden(false);
  }, []);

  return (
    <img
      {...props}
      src={imageSource}
      onError={(event) => {
        if (imageSource !== BRAND.fallbackIcon) {
          setImageSource(BRAND.fallbackIcon);
          return;
        }
        onError?.(event);
        if (!onError) setIsHidden(true);
      }}
      className={cx(isHidden && 'hidden', className)}
    />
  );
}

export default function BrandLogo({
  to = '/',
  compact = false,
  variant = 'lockup',
  className = '',
  imageClassName = '',
  onClick,
}: BrandLogoProps) {
  if (variant === 'icon') {
    return (
      <Link to={to} onClick={onClick} className={cx('inline-flex shrink-0 items-center', className)}>
        <BrandAssetImage variant="icon" alt="" className={cx('h-10 w-10 rounded-xl', imageClassName)} />
      </Link>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={cx('flex min-w-0 items-center gap-2 text-brand-navy', className)}>
      {compact ? (
        <BrandAssetImage variant="icon" alt="" className={cx('h-10 w-10 shrink-0 rounded-xl object-contain', imageClassName)} />
      ) : (
        <BrandWordmark size="md" variant={variant === 'dark' ? 'light' : 'default'} textClassName="truncate" />
      )}
    </Link>
  );
}
