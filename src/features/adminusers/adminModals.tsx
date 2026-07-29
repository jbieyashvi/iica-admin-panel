import { useState } from 'react';
import { AlertTriangle, Copy, ShieldCheck } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { addAdminUser, updateAdminUser, resetAdminPassword, setAdminStatus, adminEmailExists, adminPhoneExists, isLastActiveSuper } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../components/ui/toast';
import { ROLE_OPTIONS, ROLES, ACCESS_LABEL } from '../../config/roles';
import { passwordIssue, isValidEmail } from '../../types/admins';
import type { AdminAccountStatus, AdminUserRecord } from '../../types/admins';
import type { AdminRole } from '../../types';

const PW_HINT = 'At least 8 characters, including a letter and a number.';

// ---- Add Admin ------------------------------------------------------------
export function AddAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: AdminUserRecord, pw: string) => void }) {
  const { actor } = useActor();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AdminRole>('operations_manager');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<AdminAccountStatus>('active');
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setErr('Full name is required.');
    if (!isValidEmail(email)) return setErr('A valid email is required.');
    if (!phone.trim()) return setErr('Phone number is required.');
    if (adminEmailExists(email)) return setErr('An admin with this email already exists.');
    if (adminPhoneExists(phone)) return setErr('An admin with this phone number already exists.');
    const pwIssue = passwordIssue(password);
    if (pwIssue) return setErr(pwIssue);
    if (password !== confirm) return setErr('Password and confirmation do not match.');
    const rec = addAdminUser({ name, email, phone, role, password, status }, actor);
    if (!rec) return setErr('Could not create the admin account. Check for duplicate email or phone.');
    toast('Admin user created.');
    onCreated(rec, password);
  };

  return (
    <Modal open onClose={onClose} title="Add Admin User" description="Create an admin account and assign a role." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Create Admin</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riya Sharma" /></Field>
          <Field label="Role" required>
            <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@iica.app" /></Field>
          <Field label="Phone number" required><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" /></Field>
          <Field label="Temporary password" required hint={PW_HINT}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Confirm temporary password" required><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <Field label="Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as AdminAccountStatus)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        <p className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-xs text-charcoal-muted">Access is applied from the selected role. The temporary password is shown once after creating — no email is sent.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Edit Admin -----------------------------------------------------------
export function EditAdminModal({ admin, onClose }: { admin: AdminUserRecord; onClose: () => void }) {
  const { actor } = useActor();
  const { user } = useAuth();
  const isSelf = user?.id === admin.id;
  const lockedSuper = isLastActiveSuper(admin.id);
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [phone, setPhone] = useState(admin.phone);
  const [role, setRole] = useState<AdminRole>(admin.role);
  const [status, setStatus] = useState<AdminAccountStatus>(admin.status);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roleChanged = role !== admin.role;
  const deactivating = status === 'inactive' && admin.status === 'active';
  const sensitive = roleChanged || deactivating;

  const commit = () => {
    if (!name.trim()) return setErr('Full name is required.');
    if (!isValidEmail(email)) return setErr('A valid email is required.');
    if (!phone.trim()) return setErr('Phone number is required.');
    if (adminEmailExists(email, admin.id)) return setErr('Another admin already uses this email.');
    if (adminPhoneExists(phone, admin.id)) return setErr('Another admin already uses this phone number.');
    const ok = updateAdminUser(admin.id, { name, email, phone, role, status }, actor);
    if (!ok) return setErr('At least one active Super Admin is required. Role change / deactivation blocked.');
    toast('Admin user updated.');
    onClose();
  };

  const onSave = () => {
    setErr(null);
    if (sensitive && !confirming) { setConfirming(true); return; }
    commit();
  };

  return (
    <Modal open onClose={onClose} title="Edit Admin User" description={`${admin.name} · ${admin.id}`} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSave}>{sensitive && !confirming ? 'Review Changes' : 'Save Changes'}</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Role" required hint={isSelf ? 'You cannot change your own role.' : lockedSuper ? 'At least one active Super Admin is required.' : undefined}>
            <Select value={role} onChange={(e) => setRole(e.target.value as AdminRole)} disabled={isSelf || lockedSuper}>
              {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Email" required><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Phone" required><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Status" required hint={isSelf ? 'You cannot deactivate your own account.' : lockedSuper ? 'At least one active Super Admin is required.' : undefined}>
            <Select value={status} onChange={(e) => setStatus(e.target.value as AdminAccountStatus)} disabled={isSelf || lockedSuper}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        {roleChanged && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Changing this role will update the Admin’s module access.
          </p>
        )}
        {confirming && sensitive && (
          <p className="rounded-lg border border-magenta-100 bg-magenta-50 px-3 py-2 text-sm text-magenta-800">
            Confirm: {roleChanged && `role → ${ROLES[role].label}`}{roleChanged && deactivating ? ' · ' : ''}{deactivating && 'deactivate this account'}. Click Save Changes to apply.
          </p>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Reset Password -------------------------------------------------------
export function ResetPasswordModal({ admin, onClose, onReset }: { admin: AdminUserRecord; onClose: () => void; onReset: (pw: string) => void }) {
  const { actor } = useActor();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const issue = passwordIssue(password);
    if (issue) return setErr(issue);
    if (password !== confirm) return setErr('Password and confirmation do not match.');
    const ok = resetAdminPassword(admin.id, password, actor);
    if (!ok) return setErr('Could not reset the password.');
    toast('Temporary password reset.');
    onReset(password);
  };

  return (
    <Modal open onClose={onClose} title="Reset Password" description={`${admin.name} · ${admin.id}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Reset Password</Button></>}>
      <div className="space-y-4">
        <Field label="New temporary password" required hint={PW_HINT}><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Confirm temporary password" required><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <p className="rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-xs text-charcoal-muted">The temporary password is shown once after resetting. No email is sent.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Activate / Deactivate ------------------------------------------------
export function StatusModal({ admin, onClose }: { admin: AdminUserRecord; onClose: () => void }) {
  const { actor } = useActor();
  const deactivating = admin.status === 'active';
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const run = () => {
    if (deactivating && !reason.trim()) return setErr('A reason is required to deactivate.');
    const ok = setAdminStatus(admin.id, deactivating ? 'inactive' : 'active', deactivating ? reason.trim() : null, actor);
    if (!ok) return setErr('At least one active Super Admin is required.');
    toast(deactivating ? 'Admin deactivated.' : 'Admin reactivated.');
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={deactivating ? 'Deactivate Admin' : 'Activate Admin'} description={`${admin.name} · ${admin.id}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={deactivating ? 'danger' : 'primary'} onClick={run}>{deactivating ? 'Deactivate' : 'Activate'}</Button></>}>
      <div className="space-y-3">
        <p className="text-sm text-charcoal-muted">
          {deactivating
            ? 'The admin will be blocked from signing in. The account and its records are preserved.'
            : `Login access will be restored with ${ROLES[admin.role].label} access.`}
        </p>
        {deactivating && (
          <Field label="Reason" required><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this account being deactivated?" /></Field>
        )}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </Modal>
  );
}

// ---- Credentials (shown once) ---------------------------------------------
export function CredentialsModal({ record, password, onClose }: { record: AdminUserRecord; password: string; onClose: () => void }) {
  const copy = () => { navigator.clipboard?.writeText(`Email: ${record.email}\nPassword: ${password}`); toast('Credentials copied.'); };
  return (
    <Modal open onClose={onClose} title="Admin credentials" description="Shown once — copy and share securely. It will not be displayed again."
      footer={<Button onClick={onClose}>Done</Button>}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> {record.name} · {record.id} · {ACCESS_LABEL[record.role]}
        </div>
        <div className="rounded-lg border border-cream-200 bg-cream-50 p-3 text-sm">
          <p className="text-charcoal-muted">Email</p>
          <p className="mb-2 font-medium text-charcoal">{record.email}</p>
          <p className="text-charcoal-muted">Temporary password</p>
          <p className="font-mono font-medium text-charcoal">{password}</p>
        </div>
        <Button variant="secondary" size="sm" icon={<Copy className="h-4 w-4" />} onClick={copy}>Copy credentials</Button>
        <p className="text-xs text-charcoal-muted">No email is sent in the prototype. The password is not stored in readable form anywhere in the UI after this.</p>
      </div>
    </Modal>
  );
}
