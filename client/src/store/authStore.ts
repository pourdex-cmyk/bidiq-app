import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  orgId: string | null;
  userRole: string | null;
  setSession: (session: Session | null) => void;
  setOrgContext: (orgId: string, role: string) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      orgId: null,
      userRole: null,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      setOrgContext: (orgId, userRole) => set({ orgId, userRole }),
      signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, orgId: null, userRole: null });
      },
    }),
    { name: 'bidiq-auth', partialize: (s) => ({ session: s.session, orgId: s.orgId, userRole: s.userRole }) }
  )
);
