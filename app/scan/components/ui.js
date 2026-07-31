'use client';

/* Small shared UI atoms: icons, bottom sheet, busy overlay, toast. */

const PATHS = {
  back: 'M15 18l-6-6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  plus: 'M12 5v14M5 12h14',
  camera:
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
  flash: 'M13 2L3 14h8l-1 8 10-12h-8l1-8z',
  gallery:
    'M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21',
  crop: 'M6.13 1L6 16a2 2 0 002 2h15 M1 6.13L16 6a2 2 0 012 2v15',
  rotateL: 'M1 4v6h6 M3.51 15a9 9 0 102.13-9.36L1 10',
  rotateR: 'M23 4v6h-6 M20.49 15a9 9 0 11-2.12-9.36L23 10',
  trash: 'M3 6h18 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
  share: 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13',
  download: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  text: 'M4 7V4h16v3 M9 20h6 M12 4v16',
  chevronL: 'M15 18l-6-6 6-6',
  chevronR: 'M9 18l6-6-6-6',
  more: 'M12 13a1 1 0 100-2 1 1 0 000 2z M12 6a1 1 0 100-2 1 1 0 000 2z M12 20a1 1 0 100-2 1 1 0 000 2z',
  auto: 'M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4z M18 15l.8 2 2.2.8-2.2.8-.8 2-.8-2-2.2-.8 2.2-.8z',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z',
  copy: 'M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1',
};

export function Icon({ name, size = 21, strokeWidth = 1.9 }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

export function IconButton({ name, label, onClick, disabled, active, danger, size }) {
  return (
    <button
      type="button"
      className={`sf-iconbtn${active ? ' sf-iconbtn--on' : ''}${danger ? ' sf-iconbtn--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon name={name} size={size} />
    </button>
  );
}

export function Sheet({ title, note, onClose, children }) {
  return (
    <div
      className="sf-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="sf-sheet">
        <div className="sf-grab" />
        {title ? <h3>{title}</h3> : null}
        {note ? <p className="sf-note">{note}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function Busy({ label, progress }) {
  return (
    <div className="sf-busy" role="status" aria-live="polite">
      <div className="sf-spinner" />
      <div>{label}</div>
      {typeof progress === 'number' ? (
        <div className="sf-progress">
          <i style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="sf-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
