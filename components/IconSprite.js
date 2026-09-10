// components/IconSprite.js
// Mounted once (in _app.js). Every icon elsewhere in the app is then just:
//   <svg className="ic"><use href="#i-cube" /></svg>
export default function IconSprite() {
  return (
    <svg style={{ display: 'none' }}>
      <symbol id="i-mug" viewBox="0 0 24 24"><path d="M4 4h13v9a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V4Z"/><path d="M17 8h2a3 3 0 0 1 0 6h-2"/><path d="M7 2v2M11 2v2"/></symbol>
      <symbol id="i-pick" viewBox="0 0 24 24"><path d="M4 4c5 0 12 3 16 7-2 2-5 3-8 3-1 3-4 6-8 6 2-4 3-7 3-8-4-3-6-6-6-8Z"/></symbol>
      <symbol id="i-window" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="6.5" cy="6.5" r=".4"/><circle cx="9" cy="6.5" r=".4"/></symbol>
      <symbol id="i-gift" viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12"/><path d="M3 9h18v4H3z"/><path d="M12 9v12"/><path d="M12 9c-1.5-4-6-4-6-1.5S9 9 12 9Z"/><path d="M12 9c1.5-4 6-4 6-1.5S15 9 12 9Z"/></symbol>
      <symbol id="i-cube" viewBox="0 0 24 24"><path d="M12 2 21 7 21 17 12 22 3 17 3 7 12 2Z"/><path d="M3 7 12 12 21 7"/><path d="M12 12 12 22"/></symbol>
      <symbol id="i-layers" viewBox="0 0 24 24"><path d="M12 2 22 8 12 14 2 8 12 2Z"/><path d="M2 13 12 19 22 13"/><path d="M2 17.5 12 23 22 17.5"/></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2 14.9 8.6 22 9.3 16.5 14 18.2 21 12 17.3 5.8 21 7.5 14 2 9.3 9.1 8.6 12 2Z"/></symbol>
      <symbol id="i-puzzle" viewBox="0 0 24 24"><path d="M4 4h6a2.2 2.2 0 1 1 0 4.4H4V4Z"/><path d="M4 8.4V16h7.6a2.2 2.2 0 1 0 0-4.4"/><path d="M14 4h6v6.4a2.2 2.2 0 1 1-4.4 0"/><path d="M20 14v6h-6v-6"/></symbol>
      <symbol id="i-sword" viewBox="0 0 24 24"><path d="M5 19 18 6"/><path d="M15 3 21 3 21 9"/><path d="M4 20 6 18"/><path d="M13 8 16 11"/></symbol>
      <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 2v6M12 16v6M2 12h6M16 12h6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M19.1 4.9l-4.2 4.2M9.1 14.9l-4.2 4.2"/></symbol>
      <symbol id="i-cart" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.2 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 6H6"/></symbol>
      <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></symbol>
      <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></symbol>
      <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 21S3 14.5 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14.5 12 21 12 21Z"/></symbol>
      <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></symbol>
      <symbol id="i-play" viewBox="0 0 24 24"><path d="M6 4l14 8-14 8V4Z"/></symbol>
      <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6V2Z"/><path d="M15 2v5h5"/></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l2.5 2.5L16 9"/></symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></symbol>
    </svg>
  );
}
