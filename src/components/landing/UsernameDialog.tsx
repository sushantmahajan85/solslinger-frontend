'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/ui/Field';
import { api } from '@/lib/api';

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

function UsernameForm({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = value.trim();
    if (!USERNAME_PATTERN.test(name)) {
      setError('Use 3–20 letters, numbers or underscores.');
      return;
    }
    setChecking(true);
    try {
      const { available, reason } = await api.usernameAvailable(name);
      if (!available) {
        setError(reason ?? 'That name is already taken.');
        return;
      }
      onSubmit(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check that name. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <TextInput
        label="Username"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        error={error ?? undefined}
        hint="3–20 characters: letters, numbers, underscores."
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={20}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={checking}>
          Cancel
        </Button>
        <Button type="submit" loading={checking} loadingLabel="Checking…" disabled={!value.trim()}>
          Continue
        </Button>
      </div>
    </form>
  );
}

export function UsernameDialog({
  open,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      eyebrow="Your name"
      title="What do they call you?"
      description="Pick a username for the frontier. Other riders will see it. Next, your wallet will ask you to sign."
      size="sm"
    >
      <UsernameForm onSubmit={onSubmit} onCancel={onCancel} />
    </Dialog>
  );
}
