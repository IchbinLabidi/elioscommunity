import { CreditCard, Landmark, Phone } from 'lucide-react';
import { Course } from '../types/database';

export default function PaymentInstructionsCard({ course }: { course: Course }) {
  return (
    <div className="rounded-lg border border-elios-yellow bg-yellow-50 p-5 text-elios-navy">
      <h2 className="text-lg font-bold">Payment instructions</h2>
      <div className="mt-4 space-y-3 text-sm">
        <p className="leading-6">{course.payment_instructions || 'Contact the teacher using the details below, complete your payment, then upload your proof here.'}</p>
        {course.payment_method ? <p className="inline-flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" />{course.payment_method}</p> : null}
        {course.payment_phone ? <p className="inline-flex items-center gap-2 font-semibold"><Phone className="h-4 w-4" />{course.payment_phone}</p> : null}
        {course.payment_bank_account ? <p className="inline-flex items-center gap-2 font-semibold"><Landmark className="h-4 w-4" />{course.payment_bank_account}</p> : null}
      </div>
    </div>
  );
}
