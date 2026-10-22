import React from 'react';
import { Printer } from 'lucide-react';
import { Button } from '../common/Button';

export const ExportPdfButton = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      variant="secondary"
      onClick={handlePrint}
      icon={Printer}
      className="no-print shadow-sm"
    >
      Cetak / Simpan PDF
    </Button>
  );
};
