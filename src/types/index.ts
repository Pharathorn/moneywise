export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentMethod = 'card' | 'cash' | 'bizum' | 'transfer' | 'other';
export type SubscriptionSection = 'general' | 'housing';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: 'Tarjeta' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

export interface HousingConfig {
  totalCapital: number;
  monthlyPayment: number;
  startDate: string;
  termMonths: number;
  interestRate?: number;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  color: string;
  icon: string;
  image?: string;
  active: boolean;
  initialBalance: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  recurring: boolean;
  subscriptionId?: string;
  accountId?: string;
  toAccountId?: string;
  paymentMethod?: PaymentMethod;
  image?: string;
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
  accountId?: string;
  toAccountId?: string;
  paymentMethod?: PaymentMethod;
  image?: string;
  section?: SubscriptionSection;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  image?: string;
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
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'SET_HOUSING_CONFIG'; payload: HousingConfig }
  | { type: 'ADD_DEBT'; payload: Debt }
  | { type: 'UPDATE_DEBT'; payload: Debt }
  | { type: 'DELETE_DEBT'; payload: string }
  | { type: 'LOAD_DATA'; payload: AppState };

export interface Debt {
  id: string;
  name: string;
  amount: number;
  type: 'pay' | 'collect';
  accountId?: string;
  dueDate?: string;
  status: 'pending' | 'completed';
  notes?: string;
  color?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AppState {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: Category[];
  accounts: Account[];
  housingConfig?: HousingConfig;
  debts: Debt[];
}
