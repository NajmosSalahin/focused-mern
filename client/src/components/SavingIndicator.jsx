import { useState, useEffect, useRef } from 'react';
import { subscribe } from '../api/client';

export default function SavingIndicator() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return subscribe(pending => {
      if (pending > 0) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = null;
        setVisible(true);
      } else if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setVisible(false);
          timerRef.current = null;
        }, 500);
      }
    });
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return <div className={`saving-indicator${visible ? ' visible' : ''}`} title="Saving…" />;
}
