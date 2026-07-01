import { useCartStore, type CartItem } from "@/lib/cart/cartStore";

/**
 * Adds an item to the cart and opens the drawer.
 * Auth is NOT required here — guests can freely add to cart.
 * Authentication is checked at checkout time inside CartDrawer.
 */
export function useAddToCart() {
  const addItem = useCartStore((s) => s.addItem);

  return (item: Omit<CartItem, "quantity">, qty: number = 1) => {
    addItem(item, qty);
  };
}
