import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../ui/EmptyState';

export default function EmptyPurchasedCourses() {
  return (
    <EmptyState
      icon={BookOpen}
      title="You have not purchased any courses yet."
      message="Browse the course catalog and enroll in a course to start learning."
      action={<Link to="/courses" className="inline-flex rounded-lg bg-elios-yellow px-4 py-3 font-black text-elios-navy">Browse courses</Link>}
    />
  );
}
