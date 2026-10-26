import { config } from './config';

const graph = (path) => `https://graph.facebook.com/${config.metaGraphVersion}/${path}`;

async function graphPost(path, params) {
  const res = await fetch(graph(path), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: config.facebookPageToken }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`);
  return json;
}

async function graphGet(path, fields) {
  const url = `${graph(path)}?fields=${fields}&access_token=${encodeURIComponent(config.facebookPageToken)}`;
  const json = await (await fetch(url)).json();
  if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`);
  return json;
}

export async function postToFacebook(imageUrl, caption) {
  if (!config.facebookPageId || !config.facebookPageToken) throw new Error('Facebook page is not configured');
  const res = await graphPost(`${config.facebookPageId}/photos`, { url: imageUrl, caption, published: 'true' });
  return res.post_id || res.id;
}

export async function postToInstagram(imageUrl, caption) {
  if (!config.instagramUserId || !config.facebookPageToken) throw new Error('Instagram account is not configured');
  const container = await graphPost(`${config.instagramUserId}/media`, { image_url: imageUrl, caption });

  // Instagram processes the image before it can be published; this is normally a few seconds.
  for (let i = 0; i < 15; i++) {
    const { status_code: status } = await graphGet(container.id, 'status_code');
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Instagram could not process the image (${status})`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const published = await graphPost(`${config.instagramUserId}/media_publish`, { creation_id: container.id });
  let permalink = null;
  try {
    ({ permalink } = await graphGet(published.id, 'permalink'));
  } catch {
    // The post is live even if the permalink lookup fails.
  }
  return { id: published.id, permalink };
}
