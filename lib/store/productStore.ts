import { create } from "zustand";

interface ProductSelectionState {
  selectedPackLabel: string;
  setSelectedPackLabel: (label: string) => void;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (isOpen: boolean) => void;
}

export const useProductStore = create<ProductSelectionState>((set) => ({
  selectedPackLabel: "",
  setSelectedPackLabel: (label) => set({ selectedPackLabel: label }),
  isReviewModalOpen: false,
  setIsReviewModalOpen: (isOpen) => set({ isReviewModalOpen: isOpen }),
}));
