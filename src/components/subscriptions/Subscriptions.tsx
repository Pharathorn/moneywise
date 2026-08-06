import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Subscription, TransactionType } from '../../types';
import { formatCurrency, getDaysUntil, getMonthlyAmount, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './Subscriptions.module.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ef4444'];

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  yearly: 'Anual',
};

export function Subscriptions() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [form, setForm] = useState({
    type: 'expense' as TransactionType,
    name: '',
    amount: '',
    billingCycle: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    nextPayment: new Date().toISOString().split('T')[0],
    category: '',
    color: COLORS[0],
    active: true,
  });

  const monthlyExpenseTotal = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.active && s.type === 'expense')
        .reduce((sum, s) => sum + getMonthlyAmount(s.amount, s.billingCycle), 0),
    [state.subscriptions]
  );

  const monthlyIncomeTotal = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.active && s.type === 'income')
        .reduce((sum, s) => sum + getMonthlyAmount(s.amount, s.billingCycle), 0),
    [state.subscriptions]
  );

  const sortedSubscriptions = useMemo(
    () =>
      [...state.subscriptions].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime();
      }),
    [state.subscriptions]
  );

  const filteredCategories = useMemo(
    () => state.categories.filter((c) => c.type === form.type),
    [state.categories, form.type]
  );

  const openCreateModal = () => {
    setEditingSub(null);
    setForm({
      type: 'expense',
      name: '',
      amount: '',
      billingCycle: 'monthly',
      nextPayment: new Date().toISOString().split('T')[0],
      category: '',
      color: COLORS[0],
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s: Subscription) => {
    setEditingSub(s);
    setForm({
      type: s.type,
      name: s.name,
      amount: s.amount.toString(),
      billingCycle: s.billingCycle,
      nextPayment: s.nextPayment,
      category: s.category,
      color: s.color,
      active: s.active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount || !form.category) return;

    const subscription: Subscription = {
      id: editingSub?.id || generateId(),
      type: form.type,
      name: form.name,
      amount: parseFloat(form.amount),
      billingCycle: form.billingCycle,
      nextPayment: form.nextPayment,
      category: form.category,
      color: form.color,
      active: form.active,
    };

    if (editingSub) {
      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: subscription });
    } else {
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscription });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id });
  };

  const incomeSubs = sortedSubscriptions.filter((s) => s.type === 'income');
  const expenseSubs = sortedSubscriptions.filter((s) => s.type === 'expense');

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Ingresos y Gastos recurrentes</h1>
        <Button icon={<Plus size={18} />} onClick={openCreateModal}>
          Añadir
        </Button>
      </div>

      <div className={styles['totals-row']}>
        <div className={`${styles['total-box']} ${styles['total-income']}`}>
          <div className={styles['total-icon']}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span className={styles['total-label']}>Ingresos recurrentes / mes</span>
            <span className={`${styles['total-value']} ${styles.positive}`}>{formatCurrency(monthlyIncomeTotal)}</span>
          </div>
        </div>
        <div className={`${styles['total-box']} ${styles['total-expense']}`}>
          <div className={styles['total-icon']}>
            <TrendingDown size={20} />
          </div>
          <div>
            <span className={styles['total-label']}>Gastos recurrentes / mes</span>
            <span className={`${styles['total-value']} ${styles.negative}`}>{formatCurrency(monthlyExpenseTotal)}</span>
          </div>
        </div>
      </div>

      {incomeSubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles['section-title']}>
            <TrendingUp size={18} style={{ color: '#22c55e' }} />
            Ingresos recurrentes
          </h2>
          <div className={styles.grid}>
            {incomeSubs.map((s) => {
              const days = getDaysUntil(s.nextPayment);
              const cat = state.categories.find((c) => c.id === s.category);
              return (
                <div key={s.id} className={`${styles['sub-card']} ${styles['sub-income']} ${!s.active ? styles.inactive : ''}`}>
                  <div className={styles['sub-header']}>
                    <div className={styles['sub-info']}>
                      <div className={styles['sub-dot']} style={{ background: s.color }} />
                      <div>
                        <div className={styles['sub-name']}>{s.name}</div>
                        <div className={styles['sub-category']}>{cat?.name || ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`${styles['sub-amount']} ${styles.positive}`}>+{formatCurrency(s.amount)}</span>
                      <div className={styles['sub-actions']}>
                        <button className={styles['action-btn']} onClick={() => openEditModal(s)}>
                          <Pencil size={15} />
                        </button>
                        <button className={styles['action-btn']} onClick={() => handleDelete(s.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles['sub-details']}>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Ciclo</span>
                      <span className={styles['sub-detail-value']}>{CYCLE_LABELS[s.billingCycle]}</span>
                    </div>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Próximo cobro</span>
                      <span className={styles['sub-detail-value']}>{s.nextPayment}</span>
                    </div>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Faltan</span>
                      <span className={`${styles['days-badge']} ${days <= 7 ? styles.soon : styles.ok}`}>
                        {days} días
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expenseSubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles['section-title']}>
            <TrendingDown size={18} style={{ color: '#ef4444' }} />
            Gastos recurrentes
          </h2>
          <div className={styles.grid}>
            {expenseSubs.map((s) => {
              const days = getDaysUntil(s.nextPayment);
              const cat = state.categories.find((c) => c.id === s.category);
              return (
                <div key={s.id} className={`${styles['sub-card']} ${styles['sub-expense']} ${!s.active ? styles.inactive : ''}`}>
                  <div className={styles['sub-header']}>
                    <div className={styles['sub-info']}>
                      <div className={styles['sub-dot']} style={{ background: s.color }} />
                      <div>
                        <div className={styles['sub-name']}>{s.name}</div>
                        <div className={styles['sub-category']}>{cat?.name || ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`${styles['sub-amount']} ${styles.negative}`}>-{formatCurrency(s.amount)}</span>
                      <div className={styles['sub-actions']}>
                        <button className={styles['action-btn']} onClick={() => openEditModal(s)}>
                          <Pencil size={15} />
                        </button>
                        <button className={styles['action-btn']} onClick={() => handleDelete(s.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles['sub-details']}>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Ciclo</span>
                      <span className={styles['sub-detail-value']}>{CYCLE_LABELS[s.billingCycle]}</span>
                    </div>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Próximo cobro</span>
                      <span className={styles['sub-detail-value']}>{s.nextPayment}</span>
                    </div>
                    <div className={styles['sub-detail']}>
                      <span className={styles['sub-detail-label']}>Faltan</span>
                      <span className={`${styles['days-badge']} ${days <= 7 ? styles.soon : styles.ok}`}>
                        {days} días
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedSubscriptions.length === 0 && (
        <div className={styles['empty-state']}>
          <CreditCard size={48} className={styles['empty-icon']} />
          <p>No hay ingresos ni gastos recurrentes</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSub ? 'Editar recurrente' : 'Nuevo recurrente'}
      >
        <div className={styles['type-toggle']}>
          <button
            className={`${styles['type-btn']} ${form.type === 'expense' ? styles['active-expense'] : ''}`}
            onClick={() => setForm({ ...form, type: 'expense', category: '' })}
          >
            <TrendingDown size={16} />
            Gasto recurrente
          </button>
          <button
            className={`${styles['type-btn']} ${form.type === 'income' ? styles['active-income'] : ''}`}
            onClick={() => setForm({ ...form, type: 'income', category: '' })}
          >
            <TrendingUp size={16} />
            Ingreso recurrente
          </button>
        </div>

        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={form.type === 'income' ? 'Ej: Nómina' : 'Ej: Netflix'}
        />

        <div className={styles['form-grid']}>
          <Input
            label="Importe"
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
          />
          <Select
            label="Ciclo de facturación"
            value={form.billingCycle}
            onChange={(e) => setForm({ ...form, billingCycle: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </Select>
        </div>

        <Input
          label={form.type === 'income' ? 'Próximo ingreso' : 'Próximo cobro'}
          type="date"
          value={form.nextPayment}
          onChange={(e) => setForm({ ...form, nextPayment: e.target.value })}
        />

        <Select
          label="Categoría"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="">Seleccionar categoría</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className={styles['form-grid']}>
          <div>
            <label className={styles['sub-detail-label']} style={{ display: 'block', marginBottom: '0.375rem' }}>Color</label>
            <div className={styles['color-options']}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`${styles['color-btn']} ${form.color === c ? styles.selected : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>
          <div>
            <label className={styles['sub-detail-label']} style={{ display: 'block', marginBottom: '0.375rem' }}>Estado</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.375rem' }}>
              <button
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: `2px solid ${form.active ? '#22c55e' : '#e2e8f0'}`,
                  background: form.active ? '#f0fdf4' : 'white',
                  color: form.active ? '#16a34a' : '#94a3b8',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={() => setForm({ ...form, active: true })}
              >
                Activa
              </button>
              <button
                style={{
                  width: 'auto',
                  height: 'auto',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: `2px solid ${!form.active ? '#ef4444' : '#e2e8f0'}`,
                  background: !form.active ? '#fef2f2' : 'white',
                  color: !form.active ? '#dc2626' : '#94a3b8',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={() => setForm({ ...form, active: false })}
              >
                Pausada
              </button>
            </div>
          </div>
        </div>

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingSub ? 'Guardar cambios' : 'Añadir'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
