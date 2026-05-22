import { PropsWithChildren } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cx } from '../../lib/utils';
import { PageContainer } from './PageContainer';

type LayoutAwareContainerProps = PropsWithChildren<{
  className?: string;
}>;

export default function LayoutAwareContainer({ children, className = '' }: LayoutAwareContainerProps) {
  const { profile, session } = useAuth();

  if (session && profile) return <div className={cx(className)}>{children}</div>;

  return <PageContainer className={className}>{children}</PageContainer>;
}
