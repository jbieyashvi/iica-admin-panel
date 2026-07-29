import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select } from '../../components/ui/Field';
import { MEMBERSHIP_CATEGORIES } from '../../mock/dashboard';
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABEL } from '../../config/userLabels';
import { addUser } from '../../data/store';
import { useActor } from '../../lib/useActor';
import { toast } from '../../components/ui/toast';
import type { AccountType, MembershipCategory } from '../../types/users';
import type { AdminActor } from '../../types/users';

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'UAE'];

// Prefilled sample so the prototype form is fast to test.
const SAMPLE = {
  name: 'Ishita Bhatt',
  email: 'ishita.bhatt@example.com',
  phone: '+91 98200 74125',
  country: 'India',
  city: 'Mumbai',
  accountType: 'creator' as AccountType,
  category: 'Artist' as MembershipCategory,
};

export function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actor } = useActor() as { actor: AdminActor };
  const [form, setForm] = useState(SAMPLE);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Full name and email are required.');
      return;
    }
    if (form.accountType === 'creator' && !form.category) {
      setError('Creators must have a membership category.');
      return;
    }
    addUser(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country,
        city: form.city.trim(),
        accountType: form.accountType,
        membershipCategory: form.accountType === 'creator' ? form.category : undefined,
      },
      actor,
    );
    toast(`${form.name} added to Users.`);
    setForm(SAMPLE);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add User"
      description="Prototype administration only — creates a local record."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Add User</Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="au-name" required>
          <Input id="au-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="au-email" required>
          <Input id="au-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="au-phone">
          <Input id="au-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Country" htmlFor="au-country">
          <Select id="au-country" value={form.country} onChange={(e) => set('country', e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="au-city">
          <Input id="au-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Account type" htmlFor="au-type">
          <Select
            id="au-type"
            value={form.accountType}
            onChange={(e) => set('accountType', e.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </Field>
        {form.accountType === 'creator' && (
          <Field label="Membership category" htmlFor="au-cat" required hint="Categories are centrally managed — choose from the shared list.">
            <Select
              id="au-cat"
              value={form.category}
              onChange={(e) => set('category', e.target.value as MembershipCategory)}
            >
              {MEMBERSHIP_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
