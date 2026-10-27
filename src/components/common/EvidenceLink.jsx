import React, { useState } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { getSignedUrl } from '../../services/supabaseService';
import { fileNameFromPath } from '../../lib/formatters';

/** Buka file bukti dari bucket privat lewat signed URL (berlaku 5 menit). */
export const EvidenceLink = ({ path, bucket = 'evidence', label }) => {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState(null);

  if (!path) return <span className="text-slate-300 text-[11px]">Tidak ada</span>;

  const handleOpen = async (e) => {
    e.preventDefault();
    setOpening(true);
    setError(null);
    // buka tab dulu agar tidak diblokir popup blocker
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

  return (
    <span className="inline-flex flex-col">
      <a
        href="#bukti"
        onClick={handleOpen}
        className="text-astra-800 hover:text-astra-900 font-semibold underline inline-flex items-center gap-1 max-w-[180px]"
        title={fileNameFromPath(path)}
      >
        {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3 shrink-0" />}
        <span className="truncate">{label || fileNameFromPath(path)}</span>
      </a>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}
    </span>
  );
};
