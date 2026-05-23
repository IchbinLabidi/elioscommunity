import { Loader2 } from 'lucide-react';
import { BrandAssetImage } from '../brand/BrandLogo';

export default function LoadingSpinner({
  label = 'Loading',
  fullPage = false,
}: {
  label?: string;
  fullPage?: boolean;
}) {
  return (
    <div className={fullPage ? 'grid min-h-screen place-items-center bg-slate-50' : 'grid py-12 place-items-center'}>
      <div className="flex items-center gap-3 text-elios-blue">
        {fullPage ? <BrandAssetImage variant="icon" alt="" className="h-10 w-10 rounded-xl" /> : null}
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
