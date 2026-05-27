import { useEffect, useState } from 'react';
import { getPublishedSubjects } from '../services/subjectsService';
import { Subject } from '../types/database';

export default function SubjectSelect({
  value,
  onChange,
  multiple = false,
}: {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    getPublishedSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  return (
    <select
      multiple={multiple}
      value={value}
      onChange={(event) => {
        if (multiple) {
          onChange(Array.from(event.target.selectedOptions).map((option) => option.value));
        } else {
          onChange(event.target.value);
        }
      }}
      className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-elios-blue focus:ring-4 focus:ring-elios-sky"
    >
      {subjects.map((subject) => <option key={subject.id} value={subject.name}>{subject.name}</option>)}
    </select>
  );
}
