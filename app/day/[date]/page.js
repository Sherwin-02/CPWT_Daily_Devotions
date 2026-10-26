import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '../../Header';
import StatusBadge from '../../StatusBadge';
import { getDevotion } from '@/lib/db';
import { isIsoDate, prettyDate } from '@/lib/dates';
import { buildCaption } from '@/lib/workflow';
import { approveAction, postNowAction, regenerateAction, saveAction, skipAction } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function DayPage({ params, searchParams }) {
  const { date } = await params;
  const { ok, error } = await searchParams;
  if (!isIsoDate(date)) notFound();
  const d = await getDevotion(date);
  if (!d) notFound();
  const locked = ['posting', 'posted'].includes(d.status);

  return (
    <>
      <Header />
      <main>
        <p><Link href="/">← Back to schedule</Link></p>
        <h1>{prettyDate(date)}</h1>
        <p className="sub"><StatusBadge status={d.status} />{d.approved_by && d.status !== 'skipped' ? ` · approved by ${d.approved_by}` : ''}</p>
        {ok && <p className="notice ok">{ok}</p>}
        {(error || d.error) && <p className="notice err">{error || d.error}</p>}

        <div className="day">
          <div className="preview">
            {d.image_url
              ? <a href={d.image_url} target="_blank" rel="noreferrer"><img src={d.image_url} alt={`Devotion image for ${date}`} /></a>
              : <div className="thumb" style={{ borderRadius: 12 }}>{d.status === 'rendering' ? 'Making the image… refresh in a minute or two.' : 'No image yet. Press "Make image" to create one.'}</div>}

            {!locked && (
              <div className="row">
                {d.image_url && d.status !== 'approved' && (
                  <form action={approveAction}><input type="hidden" name="date" value={date} /><button>✅ Approve</button></form>
                )}
                <form action={regenerateAction}><input type="hidden" name="date" value={date} /><button className="secondary">{d.image_url ? '🔄 Regenerate' : '🎨 Make image'}</button></form>
                {d.status !== 'skipped' && (
                  <form action={skipAction}><input type="hidden" name="date" value={date} /><button className="secondary">⏭ Skip</button></form>
                )}
              </div>
            )}
            {!locked && d.image_url && (
              <form action={postNowAction} className="row">
                <input type="hidden" name="date" value={date} />
                <button className="quiet" title="Posts immediately instead of waiting for the scheduled time">Post now</button>
              </form>
            )}
            {(d.facebook_post_id || d.instagram_permalink) && (
              <div className="links panel" style={{ marginTop: 16 }}>
                <strong>Published</strong>
                {d.facebook_post_id && <a href={`https://facebook.com/${d.facebook_post_id}`} target="_blank" rel="noreferrer">View on Facebook</a>}
                {d.instagram_permalink && <a href={d.instagram_permalink} target="_blank" rel="noreferrer">View on Instagram</a>}
              </div>
            )}
          </div>

          <form action={saveAction} className="panel">
            <input type="hidden" name="date" value={date} />
            <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
              <label htmlFor="verse_tamil">Tamil verse</label>
              <textarea id="verse_tamil" name="verse_tamil" defaultValue={d.verse_tamil || ''} />
              <label htmlFor="reference_tamil">Tamil reference</label>
              <input type="text" id="reference_tamil" name="reference_tamil" defaultValue={d.reference_tamil || ''} />
              <label htmlFor="verse_english">English verse</label>
              <textarea id="verse_english" name="verse_english" defaultValue={d.verse_english || ''} />
              <label htmlFor="reference_english">English reference</label>
              <input type="text" id="reference_english" name="reference_english" defaultValue={d.reference_english || ''} />
              <label htmlFor="theme">Colour theme</label>
              <select id="theme" name="theme" defaultValue={d.theme || ''}>
                <option value="">Automatic (changes daily)</option>
                <option value="wine">Deep wine</option>
                <option value="maroon">Maroon</option>
                <option value="cream">Cream</option>
                <option value="photo">Photo background</option>
              </select>
              <label htmlFor="background_url">Background photo link (for the photo theme)</label>
              <input type="text" id="background_url" name="background_url" defaultValue={d.background_url || ''} placeholder="https://…" />
              <label htmlFor="caption">Post caption (leave empty to use the verse)</label>
              <textarea id="caption" name="caption" defaultValue={d.caption || ''} placeholder={buildCaption({ ...d, caption: null })} style={{ minHeight: 140 }} />
              <label style={{ fontWeight: 400 }}><input type="checkbox" name="rerender" defaultChecked /> Make a new image after saving if the verse or theme changed</label>
              <div className="row"><button>Save changes</button></div>
            </fieldset>
          </form>
        </div>
      </main>
    </>
  );
}
