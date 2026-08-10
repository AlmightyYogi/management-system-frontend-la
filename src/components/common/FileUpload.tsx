import { useRef, useState } from 'react';

interface Props {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string;
  label?: string;
  existingFiles?: string[];
  onExistingRemove?: (filename: string) => void;
  storageFolder?: string;
}

const STORAGE_BASE = '/storage';

const FileUpload = ({
  onFilesChange,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.zip',
  label = 'Upload File Evidence',
  existingFiles = [],
  onExistingRemove,
  storageFolder = '',
}: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCount = existingFiles.length + files.length;
  const remaining = maxFiles - totalCount;

  const handleFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return f.size <= maxSizeMB * 1024 * 1024 && acceptedTypes.includes(ext);
    });
    const merged = [...files, ...arr].slice(0, remaining + files.length);
    setFiles(merged);
    onFilesChange(merged);
  };

  const removeNew = (idx: number) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFilesChange(updated);
  };

  const isImage = (name: string) =>
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(name.split('.').pop()?.toLowerCase() ?? '');

  return (
    <div className="mb-3">
      <label className="form-label fw-semibold">
        {label}{' '}
        <small className="text-muted fw-normal">(Maks {maxFiles} file, {maxSizeMB}MB)</small>
      </label>

      {existingFiles.map((filename) => (
        <div key={filename} className="d-flex align-items-center gap-2 mb-2">
          <input className="form-control form-control-sm bg-light" value={filename} readOnly />
          {onExistingRemove && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => onExistingRemove(filename)}
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={`border border-2 rounded-3 p-4 text-center ${dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary border-opacity-25'}`}
          style={{ cursor: 'pointer', transition: 'all .2s' }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        >
          <i className="bi bi-cloud-upload fs-3 text-muted" />
          <p className="mb-1 small mt-1">Drag & drop atau <span className="text-primary fw-semibold">pilih file</span></p>
          <small className="text-muted">{totalCount}/{maxFiles} file terpakai</small>
          <input
            ref={inputRef}
            type="file"
            className="d-none"
            multiple
            accept={acceptedTypes}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* New file list */}
      {files.length > 0 && (
        <div className="mt-3">
          <small className="text-muted fw-semibold d-block mb-2">File baru:</small>
          <div className="d-flex flex-wrap gap-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="border rounded p-2 text-center position-relative"
                style={{ width: 90, fontSize: 11 }}
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 4 }}
                  />
                ) : (
                  <div style={{ fontSize: 28, lineHeight: '56px' }}>📄</div>
                )}
                <div className="text-truncate text-muted mt-1">{file.name}</div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm position-absolute top-0 end-0 p-0"
                  style={{ width: 18, height: 18, fontSize: 10, lineHeight: 1 }}
                  onClick={() => removeNew(idx)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {existingFiles.length > 0 && (
        <div className="mt-2">
          <small className="text-muted fw-semibold d-block mb-2">File tersimpan:</small>
          <div className="d-flex flex-wrap gap-2">
            {existingFiles.map((filename) => {
              const url = `${STORAGE_BASE}/${storageFolder}/${filename}`;
              return (
                <div key={filename} className="border rounded p-2 text-center" style={{ width: 90, fontSize: 11 }}>
                  {isImage(filename) ? (
                    <a href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt={filename} style={{ width: 72, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                    </a>
                  ) : (
                    <div style={{ fontSize: 28, lineHeight: '56px' }}>📄</div>
                  )}
                  <div className="text-truncate text-muted mt-1">{filename}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;