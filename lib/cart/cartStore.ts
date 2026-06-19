import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  secondaryName?: string;
  packLabel: string; // "PACK of 1"
  price: number;
  mrp: number;
  upiDiscountPercent: number;
  upiMaxDiscount: number;
  cardDiscountPercent: number;
  cardMaxDiscount: number;
  image: string;
  quantity: number;
}

export type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  type: string;
};

interface CartState {
  isOpen: boolean;
  items: CartItem[];
  addresses: Address[];
  selectedAddressId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (productId: string, packLabel: string) => void;
  updateQty: (productId: string, packLabel: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
  itemCount: () => number;
  addAddress: (address: Omit<Address, "id">) => string;
  editAddress: (id: string, address: Omit<Address, "id">) => void;
  setSelectedAddress: (id: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      items: [],
      addresses: [],
      selectedAddressId: null,
      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      addItem: (item, qty = 1) =>
        set((state) => {
          const idx = state.items.findIndex(
            (x) => x.productId === item.productId && x.packLabel === item.packLabel,
          );
          if (idx >= 0) {
            const next = [...state.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
            return { items: next, isOpen: true };
          }
          return { items: [...state.items, { ...item, quantity: qty }], isOpen: true };
        }),
      removeItem: (productId, packLabel) =>
        set((state) => ({
          items: state.items.filter((x) => !(x.productId === productId && x.packLabel === packLabel)),
        })),
      updateQty: (productId, packLabel, quantity) =>
        set((state) => ({
          items: state.items
            .map((x) =>
              x.productId === productId && x.packLabel === packLabel
                ? { ...x, quantity: Math.max(0, Math.min(99, quantity)) }
                : x,
             )
             .filter((x) => x.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
      subtotal: () => get().items.reduce((sum, x) => sum + x.price * x.quantity, 0),
      total: () => get().subtotal(),
      itemCount: () => get().items.reduce((sum, x) => sum + x.quantity, 0),
      addAddress: (address) => {
        const id = Math.random().toString(36).substring(7);
        const newAddress = { ...address, id };
        set((state) => ({
          addresses: [...state.addresses.map(a => address.isDefault ? { ...a, isDefault: false } : a), newAddress],
          selectedAddressId: id,
        }));
        return id;
      },
      editAddress: (id, address) => {
        set((state) => ({
          addresses: state.addresses.map(a => {
            if (a.id === id) {
              return { ...address, id };
            }
            if (address.isDefault) {
              return { ...a, isDefault: false };
            }
            return a;
          })
        }));
      },
      setSelectedAddress: (id) => set({ selectedAddressId: id }),
    }),
    { name: "punchraksha-cart" },
  ),
);

