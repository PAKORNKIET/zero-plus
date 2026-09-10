// components/Footer.js
import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="wrap foot-row">
        <div className="foot-prompt">zero@plus $ exit_code <span style={{ color: 'var(--ok)' }}>0</span></div>
        <div className="foot-links">
          <Link href="/rules">Purchase Rules</Link>
          <a href="#">Discord</a>
        </div>
      </div>
    </footer>
  );
}
