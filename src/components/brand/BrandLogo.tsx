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

type BrandAssetVariant = Exclude<BrandLogoProps['variant'], 'lockup'>;

function getBrandAsset(variant: BrandAssetVariant) {
  if (variant === 'dark') return [BRAND.logoDark, BRAND.fallbackLogoDark];
  if (variant === 'horizontal') return [BRAND.logoHorizontal, BRAND.fallbackLogoHorizontal];
  return [BRAND.icon, BRAND.fallbackIcon];
}

export function BrandAssetImage({
  variant = 'icon',
  className = '',
  onError,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { variant?: BrandAssetVariant }) {
  const [source, fallback] = getBrandAsset(variant);
  const [imageSource, setImageSource] = useState(source);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    setImageSource(source);
    setIsHidden(false);
  }, [source]);

  return (
    <img
      {...props}
      src={imageSource}
      onError={(event) => {
        if (imageSource !== fallback) {
          setImageSource(fallback);
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
  fallbackText = true,
  className = '',
  imageClassName = '',
  onClick,
}: BrandLogoProps) {
  const [assetFailed, setAssetFailed] = useState(false);

  if (variant !== 'lockup') {
    return (
      <Link to={to} onClick={onClick} className={cx('inline-flex shrink-0 items-center', className)}>
        {assetFailed && variant !== 'icon' && fallbackText ? (
          <BrandWordmark size="md" />
        ) : (
          <BrandAssetImage
            variant={variant}
            alt={variant === 'icon' ? '' : BRAND.name}
            onError={variant === 'icon' ? undefined : () => setAssetFailed(true)}
            className={cx(variant === 'icon' ? 'h-10 w-10 rounded-xl' : 'h-11 w-auto max-w-[220px]', imageClassName)}
          />
        )}
      </Link>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={cx('flex min-w-0 items-center gap-2 text-brand-navy', className)}>
      {compact ? <BrandAssetImage variant="icon" alt="" className={cx('h-10 w-10 shrink-0 rounded-xl object-contain', imageClassName)} /> : <BrandWordmark size="md" textClassName="truncate" />}
    </Link>
  );
}
