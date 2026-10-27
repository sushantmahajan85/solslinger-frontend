'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/ui/Field';
import { api } from '@/lib/api';

const USERNAME_HINT = '3–20 characters: lowercase letters, numbers, underscores.';
const CHECK_DELAY_MS = 350;

/** Mirrors the API's rules so most mistakes are caught before a request is made. */
function validateUsername(name: string): string | null {
  if (!name) return null;
  if (/[A-Z]/.test(name)) return 'Uppercase letters are not allowed — use lowercase only.';
  if (/\s/.test(name)) return 'Spaces are not allowed.';
  if (!/^[a-z0-9_]+$/.test(name)) return 'Use only lowercase letters, numbers and underscores.';
  if (name.length < 3) return 'Username must be at least 3 characters.';
  if (name.length > 20) return 'Username must be at most 20 characters.';
  return null;
}

interface Availability {
  name: string;
  available: boolean;
  reason?: string;
  failed?: boolean;
}

function UsernameForm({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState<Availability | null>(null);

  const name = value.trim();
  const formatError = validateUsername(name);

  // Ask the database whether the name is free once the user pauses typing.
  useEffect(() => {
    if (!name || validateUsername(name)) return;
    let stale = false;
    const timer = setTimeout(() => {
      api
        .usernameAvailable(name)
        .then(({ available, reason }) => {
          if (!stale) setChecked({ name, available, reason });
        })
        .catch((err) => {
          if (!stale) setChecked({ name, available: false, failed: true, reason: err instanceof Error ? err.message : undefined });
        });
    }, CHECK_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [name]);

  const result = checked?.name === name ? checked : null;
  const checking = Boolean(name) && !formatError && !result;
  const canSubmit = Boolean(result?.available) && !formatError;

  let error: string | undefined;
  let hint = USERNAME_HINT;
  if (formatError) error = formatError;
  else if (result && !result.available) error = result.reason ?? 'That name is already taken.';
  else if (checking) hint = 'Checking availability…';
  else if (result?.available) hint = `✓ "${name}" is available.`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(name);
      }}
      noValidate
    >
      <TextInput
        label="Username"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={error}
        hint={hint}
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={20}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit}>
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
      description="Pick a unique, lowercase username for the frontier. Other riders will see it. Next, your wallet will ask you to sign."
      size="sm"
    >
      <UsernameForm onSubmit={onSubmit} onCancel={onCancel} />
    </Dialog>
  );
}
