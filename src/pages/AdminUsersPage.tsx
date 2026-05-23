import { CheckCircle, ShieldOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BackButton from '../components/navigation/BackButton';
import { blockUser, getUsers, unblockUser } from '../services/adminService';
import { blockTeacher, removeTeacherVerification, unblockTeacher, verifyTeacher as verifyManagedTeacher } from '../services/adminTeachersService';
import { Profile } from '../types/database';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getUsers().then(setUsers).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load users.')).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => users.filter((user) => {
    const text = `${user.full_name} ${user.email}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (!role || user.role === role);
  }), [users, query, role]);

  const toggleBlock = async (user: Profile) => {
    if (user.role === 'teacher' && user.is_blocked) await unblockTeacher(user.id);
    else if (user.role === 'teacher') {
      const reason = window.prompt('Block reason') || 'Policy violation';
      await blockTeacher(user.id, reason);
    } else if (user.is_blocked) await unblockUser(user.id);
    else {
      const reason = window.prompt('Block reason') || 'Policy violation';
      await blockUser(user.id, reason);
    }
    load();
  };

  const toggleVerify = async (user: Profile) => {
    if (user.is_verified) await removeTeacherVerification(user.id);
    else await verifyManagedTeacher(user.id);
    load();
  };

  return (
    <section className="space-y-5">
      <BackButton label="Back to dashboard" fallbackTo="/admin/dashboard" />
      <h1 className="text-3xl font-bold text-elios-navy">Users</h1>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" className="rounded-lg border border-slate-200 px-3 py-3" />
        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-3"><option value="">All roles</option><option value="student">Students</option><option value="teacher">Teachers</option><option value="admin">Admins</option></select>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <LoadingSpinner /> : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {filtered.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
              <div><p className="font-bold text-elios-navy">{user.full_name}</p><p className="text-sm text-slate-500">{user.email} - {user.role}</p></div>
              <div className="flex flex-wrap gap-2">
                {user.is_blocked ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">Blocked</span> : null}
                {user.role === 'teacher' && user.is_verified ? <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">Verified</span> : null}
                {user.role === 'teacher' ? <button onClick={() => toggleVerify(user)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><CheckCircle className="h-4 w-4" />{user.is_verified ? 'Unverify' : 'Verify'}</button> : null}
                <button onClick={() => toggleBlock(user)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold text-red-700"><ShieldOff className="h-4 w-4" />{user.is_blocked ? 'Unblock' : 'Block'}</button>
              </div>
            </div>
          ))}
          {!filtered.length ? <p className="p-6 text-center text-sm text-slate-500">No users found.</p> : null}
        </div>
      )}
    </section>
  );
}
