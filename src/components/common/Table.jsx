import React from 'react';

export const Table = ({ headers = [], children, emptyMessage = 'Tidak ada data yang ditemukan.' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
          <tr>
            {headers.map((header, idx) => (
              <th key={idx} className="px-5 py-3.5 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {children ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} className="px-5 py-8 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
