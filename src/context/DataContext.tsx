import { createContext, useContext, useReducer, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppAction, Account, Transaction, Subscription, Category, TransactionType, PaymentMethod, HousingConfig, SubscriptionSection } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { defaultCategories } from '../utils/categories';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const initialState: AppState = {
  transactions: [],
  subscriptions: [],
  categories: defaultCategories,
  accounts: [],
};

function migrateData(data: unknown): AppState {
  const d = data as Record<string, unknown>;
  return {
    transactions: Array.isArray(d.transactions) ? d.transactions : [],
    subscriptions: Array.isArray(d.subscriptions) ? d.subscriptions : [],
    categories: Array.isArray(d.categories) ? d.categories : defaultCategories,
    accounts: Array.isArray(d.accounts) ? d.accounts : [],
    housingConfig: d.housingConfig as HousingConfig | undefined,
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case 'DELETE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload),
      };
    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, action.payload] };
    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case 'DELETE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.filter((s) => s.id !== action.payload),
      };
    case 'ADD_CATEGORY':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };
    case 'DELETE_CATEGORY':
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.payload),
      };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
      };
    case 'LOAD_DATA':
      return action.payload;
    case 'SET_HOUSING_CONFIG':
      return { ...state, housingConfig: action.payload };
    default:
      return state;
  }
}

interface DataContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  syncing: boolean;
  isOnline: boolean;
  manualSync: () => Promise<void>;
  syncError: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper: convert DB row to app type
function rowToTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    description: row.description as string,
    category: row.category as string,
    date: row.date as string,
    recurring: row.recurring as boolean,
    subscriptionId: row.subscription_id as string | undefined,
    accountId: row.account_id as string | undefined,
    toAccountId: row.to_account_id as string | undefined,
    paymentMethod: row.payment_method as PaymentMethod | undefined,
    image: row.image as string | undefined,
  };
}

function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: row.id as string,
    type: row.type as TransactionType,
    name: row.name as string,
    amount: Number(row.amount),
    billingCycle: row.billing_cycle as 'weekly' | 'monthly' | 'yearly',
    nextPayment: row.next_payment as string,
    category: row.category as string,
    color: row.color as string,
    active: row.active as boolean,
    accountId: row.account_id as string | undefined,
    toAccountId: row.to_account_id as string | undefined,
    paymentMethod: row.payment_method as PaymentMethod | undefined,
    image: row.image as string | undefined,
    section: (row.section as SubscriptionSection) || 'general',
  };
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    bank: row.bank as string,
    color: row.color as string,
    icon: row.icon as string,
    active: row.active as boolean,
    image: row.image as string | undefined,
    initialBalance: Number(row.initial_balance) || 0,
  };
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string,
    color: row.color as string,
    type: row.type as 'income' | 'expense',
    image: row.image as string | undefined,
  };
}

function rowToHousingConfig(row: Record<string, unknown>): HousingConfig {
  return {
    totalCapital: Number(row.total_capital),
    monthlyPayment: Number(row.monthly_payment),
    startDate: row.start_date as string,
    termMonths: Number(row.term_months),
    interestRate: row.interest_rate != null ? Number(row.interest_rate) : undefined,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [storedData, setStoredData] = useLocalStorage<AppState>('moneywise-data', initialState);
  const [state, dispatch] = useReducer(appReducer, migrateData(storedData));
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncQueueRef = useRef<Array<{ action: AppAction; timestamp: number }>>(
    (() => {
      try {
        const saved = localStorage.getItem('moneywise-sync-queue');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    })()
  );
  const hasMigratedRef = useRef(false);
  const lastSyncRef = useRef(0);

  // Persist sync queue to localStorage
  const persistQueue = useCallback(() => {
    try {
      localStorage.setItem('moneywise-sync-queue', JSON.stringify(syncQueueRef.current));
    } catch { /* ignore */ }
  }, []);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    setStoredData(state);
  }, [state, setStoredData]);

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (!user) {
      hasMigratedRef.current = false;
      return;
    }

    loadDataFromSupabase(user.id);

    // Re-fetch when page becomes visible (user switches back to tab/app)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user) {
        const now = Date.now();
        if (now - lastSyncRef.current > 10000) { // Throttle: max once per 10s
          lastSyncRef.current = now;
          loadDataFromSupabase(user.id);
        }
      }
    };

    // Process queue when coming back online
    const handleOnline = () => {
      if (user && syncQueueRef.current.length > 0) {
        processSyncQueue(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [user]);

  const loadDataFromSupabase = async (userId: string) => {
    setSyncing(true);
    try {
      const [accountsRes, categoriesRes, transactionsRes, subscriptionsRes, housingRes] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('subscriptions').select('*').eq('user_id', userId),
        supabase.from('housing_config').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      // Detect auth errors (400/401 = session expired)
      const allResults = [accountsRes, categoriesRes, transactionsRes, subscriptionsRes, housingRes];
      const authError = allResults.find(r => r.error?.code === 'PGRST301' || r.status === 400 || r.status === 401);
      if (authError) {
        console.error('[Sync] Auth error - session expired:', authError.error);
        setSyncError('Sesión expirada. Inicia sesión de nuevo.');
        setSyncing(false);
        return;
      }

      if (accountsRes.error) console.error('Error loading accounts:', accountsRes.error);
      if (categoriesRes.error) console.error('Error loading categories:', categoriesRes.error);
      if (transactionsRes.error) console.error('Error loading transactions:', transactionsRes.error);
      if (subscriptionsRes.error) console.error('Error loading subscriptions:', subscriptionsRes.error);
      if (housingRes.error) console.error('Error loading housing:', housingRes.error);

      const remoteAccounts = (accountsRes.data || []).map(rowToAccount);
      const remoteCategories = (categoriesRes.data || []).map(rowToCategory);
      const remoteTransactions = (transactionsRes.data || []).map(rowToTransaction);
      const remoteSubscriptions = (subscriptionsRes.data || []).map(rowToSubscription);
      const remoteHousing = housingRes.data ? rowToHousingConfig(housingRes.data) : undefined;

      if (remoteAccounts.length > 0 || remoteTransactions.length > 0 || remoteSubscriptions.length > 0) {
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            accounts: remoteAccounts,
            categories: remoteCategories.length > 0 ? remoteCategories : defaultCategories,
            transactions: remoteTransactions,
            subscriptions: remoteSubscriptions,
            housingConfig: remoteHousing,
          },
        });
      } else if (!hasMigratedRef.current) {
        hasMigratedRef.current = true;
        await migrateLocalToSupabase(userId, storedData);
        dispatch({ type: 'LOAD_DATA', payload: migrateData(storedData) });
      }
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
    }
    setSyncing(false);
  };

  const migrateLocalToSupabase = async (userId: string, data: AppState) => {
    try {
      // Migrate accounts
      for (const account of data.accounts) {
        await supabase.from('accounts').insert({
          id: account.id,
          user_id: userId,
          name: account.name,
          bank: account.bank,
          color: account.color,
          icon: account.icon,
          image: account.image,
          active: account.active,
          initial_balance: account.initialBalance || 0,
        });
      }

      // Migrate categories (only non-default ones)
      const defaultIds = defaultCategories.map((c) => c.id);
      for (const cat of data.categories) {
        if (!defaultIds.includes(cat.id)) {
          await supabase.from('categories').insert({
            id: cat.id,
            user_id: userId,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            type: cat.type,
            image: cat.image,
          });
        }
      }

      // Migrate transactions
      for (const t of data.transactions) {
        await supabase.from('transactions').insert({
          id: t.id,
          user_id: userId,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: t.date,
          recurring: t.recurring,
          subscription_id: t.subscriptionId,
          account_id: t.accountId,
          to_account_id: t.toAccountId,
          payment_method: t.paymentMethod,
          image: t.image,
        });
      }

      // Migrate subscriptions
      for (const s of data.subscriptions) {
        await supabase.from('subscriptions').insert({
          id: s.id,
          user_id: userId,
          type: s.type,
          name: s.name,
          amount: s.amount,
          billing_cycle: s.billingCycle,
          next_payment: s.nextPayment,
          category: s.category,
          color: s.color,
          active: s.active,
          account_id: s.accountId,
          to_account_id: s.toAccountId,
          payment_method: s.paymentMethod,
          image: s.image,
          section: s.section || 'general',
        });
      }
    } catch (err) {
      console.error('Error migrating data:', err);
    }
  };

  const syncToSupabase = useCallback(async (action: AppAction, userId: string) => {
    let result: { error: unknown };

    switch (action.type) {
      case 'ADD_ACCOUNT':
        result = await supabase.from('accounts').upsert({
          id: action.payload.id,
          user_id: userId,
          name: action.payload.name,
          bank: action.payload.bank,
          color: action.payload.color,
          icon: action.payload.icon,
          image: action.payload.image,
          active: action.payload.active,
          initial_balance: action.payload.initialBalance,
        });
        if (result.error) throw result.error;
        break;
      case 'UPDATE_ACCOUNT':
        result = await supabase.from('accounts').update({
          name: action.payload.name,
          bank: action.payload.bank,
          color: action.payload.color,
          icon: action.payload.icon,
          image: action.payload.image,
          active: action.payload.active,
          initial_balance: action.payload.initialBalance,
        }).eq('id', action.payload.id);
        if (result.error) throw result.error;
        break;
      case 'DELETE_ACCOUNT':
        result = await supabase.from('accounts').delete().eq('id', action.payload);
        if (result.error) throw result.error;
        break;

      case 'ADD_TRANSACTION':
        result = await supabase.from('transactions').upsert({
          id: action.payload.id,
          user_id: userId,
          type: action.payload.type,
          amount: action.payload.amount,
          description: action.payload.description,
          category: action.payload.category,
          date: action.payload.date,
          recurring: action.payload.recurring,
          subscription_id: action.payload.subscriptionId,
          account_id: action.payload.accountId,
          to_account_id: action.payload.toAccountId,
          payment_method: action.payload.paymentMethod,
          image: action.payload.image,
        });
        if (result.error) throw result.error;
        break;
      case 'UPDATE_TRANSACTION':
        result = await supabase.from('transactions').update({
          type: action.payload.type,
          amount: action.payload.amount,
          description: action.payload.description,
          category: action.payload.category,
          date: action.payload.date,
          recurring: action.payload.recurring,
          subscription_id: action.payload.subscriptionId,
          account_id: action.payload.accountId,
          to_account_id: action.payload.toAccountId,
          payment_method: action.payload.paymentMethod,
          image: action.payload.image,
        }).eq('id', action.payload.id);
        if (result.error) throw result.error;
        break;
      case 'DELETE_TRANSACTION':
        result = await supabase.from('transactions').delete().eq('id', action.payload);
        if (result.error) throw result.error;
        break;

      case 'ADD_SUBSCRIPTION':
        result = await supabase.from('subscriptions').upsert({
          id: action.payload.id,
          user_id: userId,
          type: action.payload.type,
          name: action.payload.name,
          amount: action.payload.amount,
          billing_cycle: action.payload.billingCycle,
          next_payment: action.payload.nextPayment,
          category: action.payload.category,
          color: action.payload.color,
          active: action.payload.active,
          account_id: action.payload.accountId,
          to_account_id: action.payload.toAccountId,
          payment_method: action.payload.paymentMethod,
          image: action.payload.image,
          section: action.payload.section || 'general',
        });
        if (result.error) throw result.error;
        break;
      case 'UPDATE_SUBSCRIPTION':
        result = await supabase.from('subscriptions').update({
          type: action.payload.type,
          name: action.payload.name,
          amount: action.payload.amount,
          billing_cycle: action.payload.billingCycle,
          next_payment: action.payload.nextPayment,
          category: action.payload.category,
          color: action.payload.color,
          active: action.payload.active,
          account_id: action.payload.accountId,
          to_account_id: action.payload.toAccountId,
          payment_method: action.payload.paymentMethod,
          image: action.payload.image,
          section: action.payload.section || 'general',
        }).eq('id', action.payload.id);
        if (result.error) throw result.error;
        break;
      case 'DELETE_SUBSCRIPTION':
        result = await supabase.from('subscriptions').delete().eq('id', action.payload);
        if (result.error) throw result.error;
        break;

      case 'ADD_CATEGORY':
        result = await supabase.from('categories').upsert({
          id: action.payload.id,
          user_id: userId,
          name: action.payload.name,
          icon: action.payload.icon,
          color: action.payload.color,
          type: action.payload.type,
          image: action.payload.image,
        });
        if (result.error) throw result.error;
        break;
      case 'UPDATE_CATEGORY':
        result = await supabase.from('categories').update({
          name: action.payload.name,
          icon: action.payload.icon,
          color: action.payload.color,
          type: action.payload.type,
          image: action.payload.image,
        }).eq('id', action.payload.id);
        if (result.error) throw result.error;
        break;
      case 'DELETE_CATEGORY':
        result = await supabase.from('categories').delete().eq('id', action.payload);
        if (result.error) throw result.error;
        break;

      case 'SET_HOUSING_CONFIG':
        result = await supabase.from('housing_config').upsert({
          id: userId,
          user_id: userId,
          total_capital: action.payload.totalCapital,
          monthly_payment: action.payload.monthlyPayment,
          start_date: action.payload.startDate,
          term_months: action.payload.termMonths,
          interest_rate: action.payload.interestRate,
        });
        if (result.error) throw result.error;
        break;
    }
  }, []);

  const processSyncQueue = async (userId: string) => {
    const queue = [...syncQueueRef.current];
    syncQueueRef.current = [];
    persistQueue();
    for (const item of queue) {
      try {
        await syncToSupabase(item.action, userId);
      } catch {
        // Re-queue failed items
        syncQueueRef.current.push(item);
      }
    }
    persistQueue();
  };

  const enhancedDispatch = useCallback((action: AppAction) => {
    // Apply locally first
    dispatch(action);

    // Sync to Supabase
    if (user) {
      if (isOnline) {
        syncToSupabase(action, user.id).catch((err) => {
          // Detect auth errors
          if (err?.status === 400 || err?.status === 401 || err?.code === 'PGRST301') {
            setSyncError('Sesión expirada. Inicia sesión de nuevo.');
            return;
          }
          syncQueueRef.current.push({ action, timestamp: Date.now() });
          persistQueue();
        });
      } else {
        syncQueueRef.current.push({ action, timestamp: Date.now() });
        persistQueue();
      }
    }
  }, [user, isOnline, syncToSupabase, persistQueue]);

  const manualSync = useCallback(async () => {
    if (user) {
      setSyncing(true);
      setSyncError(null);
      try {
        await loadDataFromSupabase(user.id);
        if (syncQueueRef.current.length > 0) {
          await processSyncQueue(user.id);
        }
        setSyncError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error de sincronización';
        setSyncError(msg);
        console.error('Manual sync error:', err);
      }
      setSyncing(false);
    }
  }, [user, loadDataFromSupabase]);

  return (
    <DataContext.Provider value={{ state, dispatch: enhancedDispatch, syncing, isOnline, manualSync, syncError }}>
      {children}
    </DataContext.Provider>
  );
}

export function useApp() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useApp must be used within a DataProvider');
  }
  return context;
}
