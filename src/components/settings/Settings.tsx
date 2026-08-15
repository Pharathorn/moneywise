import { useState } from 'react';
import { Plus, Pencil, Trash2, Download, Upload, X } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { Category, TransactionType } from '../../types';
import { formatCurrency, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import styles from './Settings.module.css';

const COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#ef4444', '#22c55e', '#14b8a6', '#a855f7'];

export function Settings() {
  const { state, dispatch } = useApp();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: 'Tag',
    color: COLORS[0],
    type: 'expense' as TransactionType,
  });
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});

  const getBudgetDraft = (categoryId: string) => {
    if (categoryId in budgetDrafts) return budgetDrafts[categoryId];
    const existing = state.budgets.find((b) => b.categoryId === categoryId);
    return existing ? existing.monthlyLimit.toString() : '';
  };

  const handleSaveBudget = (categoryId: string) => {
    const raw = getBudgetDraft(categoryId);
    const value = parseFloat(raw);
    const existing = state.budgets.find((b) => b.categoryId === categoryId);

    if (!raw || isNaN(value) || value <= 0) {
      if (existing) dispatch({ type: 'DELETE_BUDGET', payload: existing.id });
      setBudgetDrafts((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
      return;
    }

    if (existing) {
      dispatch({ type: 'UPDATE_BUDGET', payload: { ...existing, monthlyLimit: value } });
    } else {
      dispatch({ type: 'ADD_BUDGET', payload: { id: generateId(), categoryId, monthlyLimit: value } });
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.name) return;

    const category: Category = {
      id: editingCategory?.id || generateId(),
      name: newCategory.name,
      icon: newCategory.icon,
      color: newCategory.color,
      type: newCategory.type as 'income' | 'expense',
    };

    if (editingCategory) {
      dispatch({ type: 'UPDATE_CATEGORY', payload: category });
    } else {
      dispatch({ type: 'ADD_CATEGORY', payload: category });
    }

    setNewCategory({ name: '', icon: 'Tag', color: COLORS[0], type: 'expense' });
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setNewCategory({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
    setIsAddingCategory(true);
  };

  const handleDeleteCategory = (id: string) => {
    dispatch({ type: 'DELETE_CATEGORY', payload: id });
  };

  const handleExportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneywise-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          dispatch({ type: 'LOAD_DATA', payload: data });
        } catch {
          alert('Error al importar el archivo');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const totalIncome = state.transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = state.transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
      </div>

      <div className={styles.section}>
        <div className={styles['section-header']}>
          <h3 className={styles['section-title']}>Resumen general</h3>
        </div>
        <div className={styles['stats-section']}>
          <div className={styles['stat-card']}>
            <p className={styles['stat-label']}>Transacciones totales</p>
            <p className={styles['stat-value']}>{state.transactions.length}</p>
          </div>
          <div className={styles['stat-card']}>
            <p className={styles['stat-label']}>Suscripciones activas</p>
            <p className={styles['stat-value']}>{state.subscriptions.filter((s) => s.active).length}</p>
          </div>
          <div className={styles['stat-card']}>
            <p className={styles['stat-label']}>Total ingresos</p>
            <p className={styles['stat-value']} style={{ color: '#22c55e' }}>{formatCurrency(totalIncome)}</p>
          </div>
          <div className={styles['stat-card']}>
            <p className={styles['stat-label']}>Total gastos</p>
            <p className={styles['stat-value']} style={{ color: '#ef4444' }}>{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles['section-header']}>
          <h3 className={styles['section-title']}>Presupuestos</h3>
          <p className={styles['section-subtitle']}>Pon un límite mensual por categoría de gasto (déjalo vacío para quitarlo)</p>
        </div>
        <div className={styles['category-list']}>
          {state.categories.filter((c) => c.type === 'expense').map((cat) => (
            <div key={cat.id} className={styles['category-item']}>
              <div className={styles['category-left']}>
                <div className={styles['category-dot']} style={{ background: `${cat.color}15` }}>
                  <span style={{ color: cat.color, fontSize: '0.6rem', fontWeight: 600 }}>
                    {cat.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className={styles['category-name']}>{cat.name}</span>
              </div>
              <div className={styles.actions} style={{ alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Sin límite"
                  value={getBudgetDraft(cat.id)}
                  onChange={(e) => setBudgetDrafts((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                  onBlur={() => handleSaveBudget(cat.id)}
                  style={{
                    width: '110px',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.8125rem',
                    fontFamily: 'inherit',
                  }}
                />
                {getBudgetDraft(cat.id) && (
                  <button
                    className={styles['action-btn']}
                    title="Quitar límite"
                    onClick={() => {
                      setBudgetDrafts((prev) => ({ ...prev, [cat.id]: '' }));
                      const existing = state.budgets.find((b) => b.categoryId === cat.id);
                      if (existing) dispatch({ type: 'DELETE_BUDGET', payload: existing.id });
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles['section-header']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className={styles['section-title']}>Categorías</h3>
            <p className={styles['section-subtitle']}>Gestiona las categorías para transacciones y suscripciones</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={16} />}
            onClick={() => { setIsAddingCategory(true); setEditingCategory(null); setNewCategory({ name: '', icon: 'Tag', color: COLORS[0], type: 'expense' }); }}
          >
            Añadir
          </Button>
        </div>

        <div className={styles['category-list']}>
          {state.categories.map((cat) => (
            <div key={cat.id} className={styles['category-item']}>
              <div className={styles['category-left']}>
                <div className={styles['category-dot']} style={{ background: `${cat.color}15` }}>
                  <span style={{ color: cat.color, fontSize: '0.6rem', fontWeight: 600 }}>
                    {cat.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className={styles['category-name']}>{cat.name}</span>
                <span className={`${styles['category-type']} ${cat.type}`}>
                  {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
              </div>
              <div className={styles.actions}>
                <button className={styles['action-btn']} onClick={() => handleEditCategory(cat)}>
                  <Pencil size={15} />
                </button>
                <button className={styles['action-btn']} onClick={() => handleDeleteCategory(cat.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {isAddingCategory && (
          <div className={styles['add-category-form']}>
            <div className={styles['form-row']}>
              <Input
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Nombre de la categoría"
              />
              <Select
                value={newCategory.type}
                onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as TransactionType })}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Select>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button size="sm" onClick={handleAddCategory}>
                  {editingCategory ? 'Guardar' : 'Añadir'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${newCategory.color === c ? '#1e293b' : 'transparent'}`,
                    background: c,
                    cursor: 'pointer',
                  }}
                  onClick={() => setNewCategory({ ...newCategory, color: c })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles['section-header']}>
          <h3 className={styles['section-title']}>Datos</h3>
          <p className={styles['section-subtitle']}>Exportar o importar tus datos</p>
        </div>
        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" icon={<Download size={16} />} onClick={handleExportData}>
            Exportar datos
          </Button>
          <Button variant="secondary" icon={<Upload size={16} />} onClick={handleImportData}>
            Importar datos
          </Button>
        </div>
      </div>

      <div className={`${styles.section} ${styles['danger-zone']}`}>
        <div className={`${styles['section-header']} ${styles['danger-header']}`}>
          <h3 className={`${styles['section-title']} ${styles['danger-title']}`}>Zona de peligro</h3>
          <p className={styles['section-subtitle']}>Estas acciones son irreversibles</p>
        </div>
        <div style={{ padding: '1rem 1.5rem' }}>
          <Button
            variant="danger"
            icon={<Trash2 size={16} />}
            onClick={() => {
              if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.')) {
                localStorage.removeItem('moneywise-data');
                window.location.reload();
              }
            }}
          >
            Borrar todos los datos
          </Button>
        </div>
      </div>
    </div>
  );
}
