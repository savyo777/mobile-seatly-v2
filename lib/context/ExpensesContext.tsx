import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useOwnerScope } from '@/hooks/useOwnerScope';
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
  /** Lowercase ISO 4217 currency code of the selected restaurant. Used as
   *  the conversion target when a scanned receipt is in a different
   *  currency. Null when no specific restaurant is selected. */
  ownerRestaurantCurrency: string | null;
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
  const { restaurantIds, selectedRestaurantId, selectedRestaurant } = useOwnerScope();
  const restaurantIdsKey = restaurantIds.join('|');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // The expense-create / scan flow needs a single restaurant id to attach
  // new rows to. In all-mode this is null and the calling screen should
  // prompt the user to pick a specific restaurant.
  const ownerRestaurantId = selectedRestaurantId;
  const ownerRestaurantCurrency = selectedRestaurant?.currency
    ? selectedRestaurant.currency.toLowerCase()
    : null;

  const reload = useCallback(async () => {
    if (!user || !isStaffLike) {
      setExpenses(isDemoModeEnabled() ? DEMO_EXPENSES : []);
      return;
    }
    setLoading(true);
    try {
      if (restaurantIds.length === 0) {
        setExpenses(isDemoModeEnabled() ? DEMO_EXPENSES : []);
      } else {
        const rowGroups = await Promise.all(restaurantIds.map((rid) => listExpenses(rid)));
        const rows = rowGroups.flat();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isStaffLike, restaurantIdsKey]);

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
      ownerRestaurantCurrency,
      expenses,
      loading,
      refresh: reload,
      addExpense,
      addLocalExpense,
      patchExpense,
      removeExpense,
    }),
    [ownerRestaurantId, ownerRestaurantCurrency, expenses, loading, reload, addExpense, addLocalExpense, patchExpense, removeExpense],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses() {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used inside ExpensesProvider');
  return ctx;
}
