import { useState, useEffect } from 'react';
import { subscribe } from '../api/client';

export default function SavingIndicator() {
  const [saving, setSaving] = useState(false);
  useEffect(() => subscribe(p => setSaving(p > 0)), []);
  return <div className={`saving-indicator${saving ? ' visible' : ''}`} title="Saving…" />;
}
