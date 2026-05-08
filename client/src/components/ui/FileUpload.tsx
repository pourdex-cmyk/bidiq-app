import { useCallback, useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  accept?: string;
  onFile: (file: File) => void;
  label?: string;
  hint?: string;
  maxSizeMb?: number;
  className?: string;
}

export default function FileUpload({ accept, onFile, label, hint, maxSizeMb = 50, className }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (maxSizeMb && file.size > maxSizeMb * 1024 * 1024) {
      setError(`File exceeds ${maxSizeMb}MB limit`);
      return;
    }
    setError(null);
    setSelected(file);
    onFile(file);
  }, [maxSizeMb, onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>}
      {!selected ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors',
            dragging
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]'
          )}
        >
          <Upload className="w-8 h-8 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Drop file here or <span className="text-brand-400">browse</span></p>
          {hint && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
          <File className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate">{selected.name}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{(selected.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setSelected(null)} className="p-1 hover:bg-[var(--bg-overlay)] rounded">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
