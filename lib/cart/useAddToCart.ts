import { useAuthStore } from "@/lib/auth/authStore";
import { useCartStore, type CartItem } from "@/lib/cart/cartStore";

export function useAddToCart() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const addItem = useCartStore((s) => s.addItem);

  return (item: Omit<CartItem, "quantity">, qty: number = 1) => {
    if (!isAuthenticated) {
      openAuthModal(() => {
        addItem(item, qty);
      });
    } else {
      addItem(item, qty);
    }
  };
}
