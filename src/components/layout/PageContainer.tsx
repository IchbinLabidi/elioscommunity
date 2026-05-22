import { PropsWithChildren } from 'react';
import { cx } from '../../lib/utils';

type ContainerProps = PropsWithChildren<{
  className?: string;
}>;

export const pageContainerClasses = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

export function ContentContainer({ children, className = '' }: ContainerProps) {
  return <div className={cx(pageContainerClasses, className)}>{children}</div>;
}

export function PageContainer({ children, className = '' }: ContainerProps) {
  return <div className={cx(pageContainerClasses, 'py-6', className)}>{children}</div>;
}

export function SectionContainer({ children, className = '' }: ContainerProps) {
  return <section className={cx('space-y-6', className)}>{children}</section>;
}
