/**
 * Icons.jsx — SVG icon components ported from dealflow360.html
 */

const Icon = ({ d, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d}
  </svg>
);

export const IconDash = (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>} />;
export const IconPipe = (p) => <Icon {...p} d={<><path d="M4 4h4v16H4z"/><path d="M10 4h4v10h-4z"/><path d="M16 4h4v6h-4z"/></>} />;
export const IconCart = (p) => <Icon {...p} d={<><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.8h8.4a2 2 0 0 0 2-1.6L21 7H6"/></>} />;
export const IconCheck = (p) => <Icon {...p} d={<><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></>} />;
export const IconTruck = (p) => <Icon {...p} d={<><rect x="1" y="6" width="14" height="11"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></>} />;
export const IconRefresh = (p) => <Icon {...p} d={<><path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 10a8 8 0 0 0-14.9-3.5M4 14a8 8 0 0 0 14.9 3.5"/></>} />;
export const IconUsers = (p) => <Icon {...p} d={<><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M15.5 13.2a5.5 5.5 0 0 1 5.9 5.5"/></>} />;
