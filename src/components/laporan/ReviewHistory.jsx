import React from 'react';
import { REVIEW_DECISIONS } from '../../lib/constants';
import { formatDateTime } from '../../lib/formatters';

/** Riwayat keputusan manajemen atas satu laporan, terbaru di atas. */
export const ReviewHistory = ({ reviews }) => (
  <ol className="space-y-5">
    {reviews.map((rv) => (
      <li key={rv.id} className="relative pl-5">
        <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-astra-600" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-900">{REVIEW_DECISIONS[rv.decision]}</p>
        <p className="mt-1 text-sm text-slate-700">{rv.feedback}</p>
        <p className="mt-1 text-xs text-slate-500">
          {rv.reviewer?.full_name}, {formatDateTime(rv.reviewed_at)}
        </p>
      </li>
    ))}
  </ol>
);
