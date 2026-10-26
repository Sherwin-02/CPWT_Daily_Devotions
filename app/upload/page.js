import Header from '../Header';
import UploadForm from './UploadForm';

export default function UploadPage() {
  return (
    <>
      <Header />
      <main>
        <h1>Upload verses</h1>
        <p className="sub">
          Upload an Excel file with one row per day. New dates are added, changed rows are updated, and days that
          were already posted are never changed. <a href="/sample/devotions-template.xlsx">Download the template</a>.
        </p>
        <div className="panel">
          <UploadForm />
        </div>
        <h2>Columns</h2>
        <table>
          <thead><tr><th>Column</th><th>Needed?</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td>Date</td><td>Yes</td><td>01/11/2026</td></tr>
            <tr><td>Tamil Verse</td><td>This or English Verse</td><td>கர்த்தர் என் மேய்ப்பராயிருக்கிறார்…</td></tr>
            <tr><td>Tamil Reference</td><td>Recommended</td><td>சங்கீதம் 23:1</td></tr>
            <tr><td>English Verse</td><td>Optional</td><td>The Lord is my shepherd…</td></tr>
            <tr><td>English Reference</td><td>Optional</td><td>Psalm 23:1</td></tr>
            <tr><td>Caption</td><td>Optional</td><td>Text for the post; leave empty to use the verse</td></tr>
            <tr><td>Theme</td><td>Optional</td><td>wine, maroon, cream or photo</td></tr>
            <tr><td>Background</td><td>Optional</td><td>Link to a photo, for the photo theme</td></tr>
          </tbody>
        </table>
      </main>
    </>
  );
}
