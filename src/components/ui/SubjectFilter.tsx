import { subjects } from '../../lib/constants';

export default function SubjectFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-elios-blue focus:ring-4 focus:ring-elios-sky md:w-56"
    >
      <option value="">All subjects</option>
      {subjects.map((subject) => (
        <option key={subject} value={subject}>
          {subject}
        </option>
      ))}
    </select>
  );
}
