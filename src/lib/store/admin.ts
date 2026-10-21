'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ADMIN_STORE_KEY } from '@/lib/staff-mode';

interface AdminStore {
  isAdmin: boolean;
  adminName: string;
  adminToken: string | null;
  upgrades: { name: string; price: number }[];
  showLoginModal: boolean;
  currentProductId: number | null;

  // Actions
  setAdmin: (isAdmin: boolean, adminName: string, token: string | null, upgrades?: { name: string; price: number }[]) => void;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  setCurrentProductId: (id: number | null) => void;
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      isAdmin: false,
      adminName: '',
      adminToken: null,
      upgrades: [],
      showLoginModal: false,
      currentProductId: null,

      setAdmin: (isAdmin, adminName, token, upgrades = []) =>
        set({ isAdmin, adminName, adminToken: token, upgrades }),

      logout: () =>
        set({ isAdmin: false, adminName: '', adminToken: null, upgrades: [] }),

      openLoginModal: () =>
        set({ showLoginModal: true }),

      closeLoginModal: () =>
        set({ showLoginModal: false }),

      setCurrentProductId: (id) =>
        set({ currentProductId: id }),
    }),
    {
      name: ADMIN_STORE_KEY,
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        adminName: state.adminName,
        adminToken: state.adminToken,
        upgrades: state.upgrades,
      }),
    }
  )
);
