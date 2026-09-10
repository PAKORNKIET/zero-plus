// contexts/CartContext.js
import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  total: 0,
});

const STORAGE_KEY = 'zeroplus_cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  // load from localStorage once, client-side only
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to read cart from localStorage', e);
    }
    setHydrated(true);
  }, []);

  // persist on every change, after initial hydration
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(product) {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) return prev; // already in cart
      return [...prev, {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        is_free: product.is_free,
        category_id: product.category_id,
      }];
    });
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + (i.is_free ? 0 : Number(i.price)), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
