'use client';

import { useRef, useState } from 'react';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/ssr/UploadSimple';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { FilePdfIcon } from '@phosphor-icons/react/dist/ssr/FilePdf';
import { fileToDataUrl } from '@/lib/client';

export default function Dropzone({
  label,
  accept = 'image/*',
  multiple = true,
  values,
  onChange,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function ingest(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map((f) => fileToDataUrl(f)));
      onChange(multiple ? [...values, ...urls] : urls.slice(0, 1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void ingest(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed
          px-6 py-8 text-center transition-all duration-700 ease-fluid
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
          ${over ? 'border-accent bg-hover' : 'border-lineStrong bg-raised hover:bg-hover'}`}
      >
        <UploadSimpleIcon size={24} className="text-muted" aria-hidden />
        <span className="mt-3 text-base font-semibold text-white">
          {busy ? 'Processing' : label}
        </span>
        <span className="mt-2 text-sm text-muted">
          {accept.includes('pdf') ? 'PDF or image' : 'JPG, PNG or HEIC'} · drag and drop, or click
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => void ingest(e.target.files)}
        />
      </button>

      {values.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {values.map((src, i) => (
            <li
              key={i}
              className="group relative aspect-square overflow-hidden rounded-xl border border-line"
            >
              {src.startsWith('data:application/pdf') ? (
                <span className="flex h-full items-center justify-center bg-raised text-muted">
                  <FilePdfIcon size={24} aria-hidden />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={`Uploaded evidence ${i + 1}`} className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full
                           bg-base text-white opacity-0 transition-all duration-700 ease-fluid
                           group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={`Remove photo ${i + 1}`}
              >
                <XIcon size={12} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
