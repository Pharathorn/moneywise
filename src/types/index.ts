export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  recurring: boolean;
  subscriptionId?: string;
}

export interface Subscription {
  id: string;
  type: TransactionType;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly' | 'weekly';
  nextPayment: string;
  category: string;
  color: string;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

export interface MonthSummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export type AppAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_SUBSCRIPTION'; payload: Subscription }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: Subscription }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string }
  | { type: 'ADD_CATEGORY'; payload: Category }
  | { type: 'UPDATE_CATEGORY'; payload: Category }
  | { type: 'DELETE_CATEGORY'; payload: string }
  | { type: 'LOAD_DATA'; payload: AppState };

export interface AppState {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: Category[];
}
