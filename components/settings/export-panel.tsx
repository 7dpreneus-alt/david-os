'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardTitle } from '@/components/ui/primitives';
import { generateExportAction } from '@/app/(product)/settings/actions';

/**
 * Data export. The file is generated on the server from real rows and streamed
 * to the browser as a download; nothing is stored in temporary storage.
 */
export function ExportPanel() {
  const [pending, setPending] = useState(false);

  async function handleExport(): Promise<void> {
    setPending(true);
    try {
      const json = await generateExportAction();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mission-control-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      // Revoking synchronously can cancel the download before the browser has
      // finished reading the blob, so release it on the next macrotask.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('Export downloaded.');
    } catch (error) {
      toast.error('The export could not be generated.');
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'export_failed',
          errorClass: error instanceof Error ? error.name : typeof error,
        }),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardTitle>Export your data</CardTitle>
      <p className="mt-2 text-sm text-text-muted">
        Downloads a JSON file of your records with a schema version and generation time.
        OAuth tokens, encrypted trip confirmations, and the security audit log are
        excluded.
      </p>
      <Button
        type="button"
        className="mt-3"
        onClick={() => void handleExport()}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Generating…' : 'Download export'}
      </Button>
    </Card>
  );
}
