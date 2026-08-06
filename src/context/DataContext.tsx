import { createContext, useContext, useReducer, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { AppState, AppAction, Account, Transaction, Subscription, Category, TransactionType, PaymentMethod } from '../types';
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
    default:
      return state;
  }
}

interface DataContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  syncing: boolean;
  isOnline: boolean;
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

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [storedData, setStoredData] = useLocalStorage<AppState>('moneywise-data', initialState);
  const [state, dispatch] = useReducer(appReducer, migrateData(storedData));
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncQueueRef = useRef<Array<{ action: AppAction; timestamp: number }>>([]);
  const hasMigratedRef = useRef(false);

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

    const loadData = async () => {
      setSyncing(true);
      try {
        const [accountsRes, categoriesRes, transactionsRes, subscriptionsRes] = await Promise.all([
          supabase.from('accounts').select('*').eq('user_id', user.id),
          supabase.from('categories').select('*').eq('user_id', user.id),
          supabase.from('transactions').select('*').eq('user_id', user.id),
          supabase.from('subscriptions').select('*').eq('user_id', user.id),
        ]);

        const remoteAccounts = (accountsRes.data || []).map(rowToAccount);
        const remoteCategories = (categoriesRes.data || []).map(rowToCategory);
        const remoteTransactions = (transactionsRes.data || []).map(rowToTransaction);
        const remoteSubscriptions = (subscriptionsRes.data || []).map(rowToSubscription);

        // If remote has data, use it; otherwise migrate local data
        if (remoteAccounts.length > 0 || remoteTransactions.length > 0 || remoteSubscriptions.length > 0) {
          dispatch({
            type: 'LOAD_DATA',
            payload: {
              accounts: remoteAccounts,
              categories: remoteCategories.length > 0 ? remoteCategories : defaultCategories,
              transactions: remoteTransactions,
              subscriptions: remoteSubscriptions,
            },
          });
        } else if (!hasMigratedRef.current) {
          // First login: migrate localStorage data to Supabase
          hasMigratedRef.current = true;
          await migrateLocalToSupabase(user.id, storedData);
          dispatch({ type: 'LOAD_DATA', payload: migrateData(storedData) });
        }
      } catch (err) {
        console.error('Error loading data from Supabase:', err);
      }
      setSyncing(false);
    };

    loadData();
  }, [user]);

  // Process sync queue when coming back online
  useEffect(() => {
    if (isOnline && user && syncQueueRef.current.length > 0) {
      processSyncQueue(user.id);
    }
  }, [isOnline, user]);

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
        });
      }
    } catch (err) {
      console.error('Error migrating data:', err);
    }
  };

  const syncToSupabase = useCallback(async (action: AppAction, userId: string) => {
    try {
      switch (action.type) {
        case 'ADD_ACCOUNT':
          await supabase.from('accounts').upsert({
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
          break;
        case 'UPDATE_ACCOUNT':
          await supabase.from('accounts').update({
            name: action.payload.name,
            bank: action.payload.bank,
            color: action.payload.color,
            icon: action.payload.icon,
            image: action.payload.image,
            active: action.payload.active,
            initial_balance: action.payload.initialBalance,
          }).eq('id', action.payload.id);
          break;
        case 'DELETE_ACCOUNT':
          await supabase.from('accounts').delete().eq('id', action.payload);
          break;

        case 'ADD_TRANSACTION':
          await supabase.from('transactions').upsert({
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
          break;
        case 'UPDATE_TRANSACTION':
          await supabase.from('transactions').update({
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
          break;
        case 'DELETE_TRANSACTION':
          await supabase.from('transactions').delete().eq('id', action.payload);
          break;

        case 'ADD_SUBSCRIPTION':
          await supabase.from('subscriptions').upsert({
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
          });
          break;
        case 'UPDATE_SUBSCRIPTION':
          await supabase.from('subscriptions').update({
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
          }).eq('id', action.payload.id);
          break;
        case 'DELETE_SUBSCRIPTION':
          await supabase.from('subscriptions').delete().eq('id', action.payload);
          break;

        case 'ADD_CATEGORY':
          await supabase.from('categories').upsert({
            id: action.payload.id,
            user_id: userId,
            name: action.payload.name,
            icon: action.payload.icon,
            color: action.payload.color,
            type: action.payload.type,
            image: action.payload.image,
          });
          break;
        case 'UPDATE_CATEGORY':
          await supabase.from('categories').update({
            name: action.payload.name,
            icon: action.payload.icon,
            color: action.payload.color,
            type: action.payload.type,
            image: action.payload.image,
          }).eq('id', action.payload.id);
          break;
        case 'DELETE_CATEGORY':
          await supabase.from('categories').delete().eq('id', action.payload);
          break;
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  }, []);

  const processSyncQueue = async (userId: string) => {
    const queue = [...syncQueueRef.current];
    syncQueueRef.current = [];
    for (const item of queue) {
      await syncToSupabase(item.action, userId);
    }
  };

  const enhancedDispatch = useCallback((action: AppAction) => {
    // Apply locally first
    dispatch(action);

    // Sync to Supabase
    if (user) {
      if (isOnline) {
        syncToSupabase(action, user.id);
      } else {
        // Queue for later
        syncQueueRef.current.push({ action, timestamp: Date.now() });
      }
    }
  }, [user, isOnline, syncToSupabase]);

  return (
    <DataContext.Provider value={{ state, dispatch: enhancedDispatch, syncing, isOnline }}>
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
