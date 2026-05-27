import { useEffect, useState } from 'react';
import { getPublishedSubjects } from '../../services/subjectsService';
import { Subject } from '../../types/database';

export default function SubjectFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    getPublishedSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky md:w-56"
    >
      <option value="">Toutes les matières</option>
      {subjects.map((subject) => (
        <option key={subject.id} value={subject.name}>
          {subject.name}
        </option>
      ))}
    </select>
  );
}
