import { Category } from '../types';

export const defaultCategories: Category[] = [
  // Gastos
  { id: 'cat-alimentacion', name: 'Alimentación', icon: 'UtensilsCrossed', color: '#f97316', type: 'expense' },
  { id: 'cat-transporte', name: 'Transporte', icon: 'Car', color: '#3b82f6', type: 'expense' },
  { id: 'cat-vivienda', name: 'Vivienda', icon: 'Home', color: '#8b5cf6', type: 'expense' },
  { id: 'cat-ocio', name: 'Ocio', icon: 'Gamepad2', color: '#ec4899', type: 'expense' },
  { id: 'cat-salud', name: 'Salud', icon: 'Heart', color: '#ef4444', type: 'expense' },
  { id: 'cat-educacion', name: 'Educación', icon: 'GraduationCap', color: '#06b6d4', type: 'expense' },
  { id: 'cat-servicios', name: 'Servicios', icon: 'Zap', color: '#eab308', type: 'expense' },
  { id: 'cat-ropa', name: 'Ropa', icon: 'Shirt', color: '#a855f7', type: 'expense' },
  { id: 'cat-mascotas', name: 'Mascotas', icon: 'PawPrint', color: '#f472b6', type: 'expense' },
  { id: 'cat-otros-gasto', name: 'Otros', icon: 'MoreHorizontal', color: '#6b7280', type: 'expense' },
  // Vivienda
  { id: 'cat-hipoteca', name: 'Hipoteca', icon: 'Landmark', color: '#6366f1', type: 'expense' },
  { id: 'cat-seguro-hogar', name: 'Seguro hogar', icon: 'Shield', color: '#0ea5e9', type: 'expense' },
  { id: 'cat-luz', name: 'Luz', icon: 'Lightbulb', color: '#eab308', type: 'expense' },
  { id: 'cat-agua', name: 'Agua', icon: 'Droplets', color: '#06b6d4', type: 'expense' },
  { id: 'cat-internet', name: 'Internet', icon: 'Wifi', color: '#8b5cf6', type: 'expense' },
  { id: 'cat-ibi', name: 'IBI', icon: 'Receipt', color: '#f97316', type: 'expense' },
  { id: 'cat-comunidad', name: 'Comunidad', icon: 'Building2', color: '#64748b', type: 'expense' },
  // Ingresos
  { id: 'cat-salario', name: 'Salario', icon: 'Briefcase', color: '#22c55e', type: 'income' },
  { id: 'cat-freelance', name: 'Freelance', icon: 'Laptop', color: '#10b981', type: 'income' },
  { id: 'cat-inversiones', name: 'Inversiones', icon: 'TrendingUp', color: '#14b8a6', type: 'income' },
  { id: 'cat-otros-ingreso', name: 'Otros', icon: 'Plus', color: '#6ee7b7', type: 'income' },
];
