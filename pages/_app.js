import { useEffect } from 'react';
import '../styles/globals.css';
import IconSprite from '../components/IconSprite';
import { LangProvider } from '../contexts/LangContext';
import { CartProvider } from '../contexts/CartContext';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = (e) => {
      document.body.dataset.theme = e.matches ? 'light' : 'dark';
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <LangProvider>
      <CartProvider>
        <IconSprite />
        <Component {...pageProps} />
      </CartProvider>
    </LangProvider>
  );
}
