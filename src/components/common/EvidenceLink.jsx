import React, { useState } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { getSignedUrl } from '../../services/supabaseService';
import { fileNameFromPath } from '../../lib/formatters';

/** Membuka file bukti dari bucket privat lewat signed URL (berlaku 5 menit). */
export const EvidenceLink = ({ path, bucket = 'evidence' }) => {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);

  if (!path) return <span className="text-sm text-slate-400">–</span>;

  const handleOpen = async () => {
    setOpening(true);
    setError(null);
    // tab dibuka lebih dulu supaya tidak diblokir popup blocker
    const win = window.open('', '_blank');
    try {
      const url = await getSignedUrl(bucket, path);
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch (err) {
      win?.close();
      setError(err.message);
    } finally {
      setOpening(false);
    }
  };

  const name = fileNameFromPath(path);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleOpen}
        title={name}
        className="inline-flex max-w-[180px] items-center gap-1 text-sm font-medium text-astra-600 hover:text-astra-800 hover:underline cursor-pointer"
      >
        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{name}</span>
      </button>
      {error && <span className="text-xs text-rose-700">File tidak bisa dibuka: {error}</span>}
    </span>
  );
};
