import React from 'react';

/**
 * Kartu section standar: header (judul, keterangan, aksi di kanan)
 * dipisah garis dari isi. `flush` = isi tanpa padding (untuk tabel).
 */
export const Section = ({ title, description, actions, children, flush = false, className = '', id, headingLevel = 2 }) => {
  const Heading = `h${headingLevel}`;
  return (
    <section id={id} className={`card scroll-mt-6 ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <div className="card-header">
          <div className="min-w-0">
            {title && (
              <Heading id={id ? `${id}-title` : undefined} className="section-title">
                {title}
              </Heading>
            )}
            {description && <div className="section-desc">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {flush ? children : <div className="card-body">{children}</div>}
    </section>
  );
};
