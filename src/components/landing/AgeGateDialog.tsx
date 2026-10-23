'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox } from '@/components/ui/Field';
import { MINIMUM_AGE } from '@/lib/config';
import styles from './Landing.module.css';

export function AgeGateDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = useState(false);
  const [declined, setDeclined] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Age verification"
      title="Before you ride in"
      description={`Solslinger contains simulated gambling themes and is intended only for adults aged ${MINIMUM_AGE} and over.`}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              setDeclined(true);
              setChecked(false);
            }}
          >
            I am under {MINIMUM_AGE}
          </Button>
          <Button
            disabled={!checked}
            onClick={() => {
              onConfirm();
              setChecked(false);
            }}
          >
            Confirm and continue
          </Button>
        </>
      }
    >
      <Checkbox
        checked={checked}
        onChange={(event) => {
          setChecked(event.target.checked);
          setDeclined(false);
        }}
        label={`I confirm I am ${MINIMUM_AGE} years of age or older and legally permitted to enter in my jurisdiction.`}
      />
      {declined ? (
        <p className={styles.ageDeclined} role="alert">
          Solslinger is only available to adults. Come back when you are {MINIMUM_AGE}.
        </p>
      ) : null}
    </Dialog>
  );
}
