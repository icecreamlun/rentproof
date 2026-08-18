'use client';

/** Downscale before base64 — a 12MP phone photo will otherwise blow the request. */
export async function fileToDataUrl(file: File, maxEdge = 1280): Promise<string> {
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || json.ok === false) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export function getCaseId(): string {
  const KEY = 'rentproof.caseId';
  // ?case=<id> reopens a specific case, which is how you hand a demo to someone.
  const fromUrl = new URLSearchParams(window.location.search).get('case');
  if (fromUrl) {
    localStorage.setItem(KEY, fromUrl);
    return fromUrl;
  }
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'case-' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function resetCase(): string {
  localStorage.removeItem('rentproof.caseId');
  return getCaseId();
}
