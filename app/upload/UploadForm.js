'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { uploadAction } from '../actions';

export default function UploadForm() {
  const [state, action, pending] = useActionState(uploadAction, null);
  return (
    <form action={action}>
      <label htmlFor="file">Excel file (.xlsx)</label>
      <input id="file" name="file" type="file" accept=".xlsx" required />
      <div className="row"><button disabled={pending}>{pending ? 'Uploading…' : 'Upload'}</button></div>

      {state?.errors?.length > 0 && <p className="notice err" style={{ marginTop: 16 }}>{state.errors.join('\n')}</p>}
      {state?.results && (
        <>
          <p className="notice ok" style={{ marginTop: 16 }}>
            Read {state.results.length} days: {count(state.results, 'added')} added, {count(state.results, 'updated')} updated.
          </p>
          <table>
            <thead><tr><th>Date</th><th>Reference</th><th>Result</th></tr></thead>
            <tbody>
              {state.results.map((r) => (
                <tr key={r.date}><td><Link href={`/day/${r.date}`}>{r.date}</Link></td><td>{r.reference}</td><td>{r.result}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </form>
  );
}

const count = (rows, result) => rows.filter((r) => r.result === result).length;
