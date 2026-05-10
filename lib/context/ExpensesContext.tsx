import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type CreateExpenseInput,
  type UpdateExpensePatch,
} from '@/lib/expenses/expensesApi';
import type { Expense } from '@/lib/expenses/types';
import { DEMO_EXPENSES } from '@/lib/mock/ownerApp';

type ExpensesContextValue = {
  ownerRestaurantId: string | null;
  expenses: Expense[];
  loading: boolean;
  refresh: () => Promise<void>;
  addExpense: (input: CreateExpenseInput) => Promise<Expense | null>;
  /** Adds an expense to local state only — used for demo-mode saves
   *  where there is no real restaurant to persist against. */
  addLocalExpense: (expense: Expense) => void;
  patchExpense: (id: string, patch: UpdateExpensePatch) => Promise<Expense | null>;
  removeExpense: (id: string) => Promise<void>;
};

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const { user, isStaffLike } = useAuthSession();
  const [ownerRestaurantId, setOwnerRestaurantId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const reload = useCallback(async () => {
    if (!user || !isStaffLike) {
      setOwnerRestaurantId(null);
      setExpenses(isDemoModeEnabled() ? DEMO_EXPENSES : []);
      return;
    }
    setLoading(true);
    try {
      const restaurant = await fetchCurrentOwnerRestaurant();
      setOwnerRestaurantId(restaurant?.id ?? null);
      if (!restaurant?.id) {
        setExpenses(isDemoModeEnabled() ? DEMO_EXPENSES : []);
      } else {
        const rows = await listExpenses(restaurant.id);
        if (rows.length === 0 && isDemoModeEnabled()) {
          setExpenses(DEMO_EXPENSES);
        } else {
          setExpenses(rows);
        }
      }
    } catch {
      setExpenses(isDemoModeEnabled() ? DEMO_EXPENSES : []);
    } finally {
      setLoading(false);
    }
  }, [user, isStaffLike]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addExpense = useCallback<ExpensesContextValue['addExpense']>(
    async (input) => {
      const created = await createExpense(input);
      if (created) {
        setExpenses((prev) => [created, ...prev]);
      }
      return created;
    },
    [],
  );

  const addLocalExpense = useCallback<ExpensesContextValue['addLocalExpense']>((expense) => {
    setExpenses((prev) => [expense, ...prev.filter((e) => e.id !== expense.id)]);
  }, []);

  const patchExpense = useCallback<ExpensesContextValue['patchExpense']>(
    async (id, patch) => {
      const updated = await updateExpense(id, patch);
      if (updated) {
        setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
      }
      return updated;
    },
    [],
  );

  const removeExpense = useCallback<ExpensesContextValue['removeExpense']>(async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpense(id);
    } catch {
      void reload();
    }
  }, [reload]);

  const value = useMemo<ExpensesContextValue>(
    () => ({
      ownerRestaurantId,
      expenses,
      loading,
      refresh: reload,
      addExpense,
      addLocalExpense,
      patchExpense,
      removeExpense,
    }),
    [ownerRestaurantId, expenses, loading, reload, addExpense, addLocalExpense, patchExpense, removeExpense],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside ExpensesProvider');
  return ctx;
}
