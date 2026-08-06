import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CreditCard, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { Subscription, TransactionType, PaymentMethod, PAYMENT_METHODS } from '../../types';
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
    accountId: '',
    toAccountId: '',
    paymentMethod: 'card' as PaymentMethod,
    image: '',
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

  const monthlyTransferTotal = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.active && s.type === 'transfer')
        .reduce((sum, s) => sum + getMonthlyAmount(s.amount, s.billingCycle), 0),
    [state.subscriptions]
  );

  const sortedSubscriptions = useMemo(
    () =>
      [...state.subscriptions]
        .filter((s) => s.section !== 'housing')
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'income' ? -1 : a.type === 'expense' ? 1 : 2;
          if (a.active !== b.active) return a.active ? -1 : 1;
          return new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime();
        }),
    [state.subscriptions]
  );

  const filteredCategories = useMemo(
    () => state.categories.filter((c) => c.type === (form.type === 'transfer' ? 'expense' : form.type)),
    [state.categories, form.type]
  );

  const activeAccounts = useMemo(
    () => state.accounts.filter((a) => a.active),
    [state.accounts]
  );

  const destinationAccounts = useMemo(
    () => activeAccounts.filter((a) => a.id !== form.accountId),
    [activeAccounts, form.accountId]
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
      accountId: '',
      toAccountId: '',
      paymentMethod: 'card',
      image: '',
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
      accountId: s.accountId || '',
      toAccountId: s.toAccountId || '',
      paymentMethod: s.paymentMethod || 'card',
      image: s.image || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) return;
    if (form.type !== 'transfer' && !form.category) return;
    if (form.type === 'transfer' && (!form.accountId || !form.toAccountId)) return;

    const subscription: Subscription = {
      id: editingSub?.id || generateId(),
      type: form.type,
      name: form.name,
      amount: parseFloat(form.amount),
      billingCycle: form.billingCycle,
      nextPayment: form.nextPayment,
      category: form.type === 'transfer' ? 'transfer' : form.category,
      color: form.color,
      active: form.active,
      accountId: form.accountId || undefined,
      toAccountId: form.type === 'transfer' ? form.toAccountId : undefined,
      paymentMethod: form.type !== 'transfer' ? form.paymentMethod : undefined,
      image: form.image || undefined,
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

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    const account = state.accounts.find((a) => a.id === accountId);
    return account?.name || null;
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    if (!method) return null;
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const incomeSubs = sortedSubscriptions.filter((s) => s.type === 'income');
  const expenseSubs = sortedSubscriptions.filter((s) => s.type === 'expense');
  const transferSubs = sortedSubscriptions.filter((s) => s.type === 'transfer');

  const renderCard = (s: Subscription) => {
    const days = getDaysUntil(s.nextPayment);
    const cat = state.categories.find((c) => c.id === s.category);
    const accountName = getAccountName(s.accountId);
    const toAccountName = getAccountName(s.toAccountId);
    const paymentLabel = getPaymentMethodLabel(s.paymentMethod);

    return (
      <div key={s.id} className={`${styles['sub-card']} ${styles[`sub-${s.type}`]} ${!s.active ? styles.inactive : ''}`}>
        <div className={styles['sub-header']}>
          <div className={styles['sub-info']}>
            {s.image ? (
              <div className={styles['sub-image']}>
                <img src={s.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
            ) : s.type === 'transfer' ? (
              <div className={styles['sub-transfer-icon']}>
                <ArrowRightLeft size={16} />
              </div>
            ) : (
              <div className={styles['sub-dot']} style={{ background: s.color }} />
            )}
            <div>
              <div className={styles['sub-name']}>{s.name}</div>
              <div className={styles['sub-category']}>
                {s.type === 'transfer' ? (
                  <span style={{ color: '#3b82f6' }}>
                    {accountName || 'Sin cuenta'} → {toAccountName || 'Sin cuenta'}
                  </span>
                ) : (
                  <>
                    {cat?.name || ''}
                    {accountName && <span style={{ color: '#3b82f6' }}> · {accountName}</span>}
                    {paymentLabel && <span> · {paymentLabel}</span>}
                  </>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span className={`${styles['sub-amount']} ${styles[s.type === 'income' ? 'positive' : s.type === 'transfer' ? '' : 'negative']}`}
              style={s.type === 'transfer' ? { color: '#3b82f6' } : undefined}>
              {s.type === 'income' ? '+' : s.type === 'transfer' ? '↔' : '-'}{formatCurrency(s.amount)}
            </span>
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
            <span className={styles['sub-detail-label']}>Próximo</span>
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
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Recurrentes</h1>
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
            <span className={styles['total-label']}>Ingresos / mes</span>
            <span className={`${styles['total-value']} ${styles.positive}`}>{formatCurrency(monthlyIncomeTotal)}</span>
          </div>
        </div>
        <div className={`${styles['total-box']} ${styles['total-expense']}`}>
          <div className={styles['total-icon']}>
            <TrendingDown size={20} />
          </div>
          <div>
            <span className={styles['total-label']}>Gastos / mes</span>
            <span className={`${styles['total-value']} ${styles.negative}`}>{formatCurrency(monthlyExpenseTotal)}</span>
          </div>
        </div>
        {monthlyTransferTotal > 0 && (
          <div className={`${styles['total-box']} ${styles['total-transfer']}`}>
            <div className={styles['total-icon']}>
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <span className={styles['total-label']}>Transferencias / mes</span>
              <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '1.125rem' }}>{formatCurrency(monthlyTransferTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {incomeSubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles['section-title']}>
            <TrendingUp size={18} style={{ color: '#22c55e' }} />
            Ingresos recurrentes
          </h2>
          <div className={styles.grid}>
            {incomeSubs.map(renderCard)}
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
            {expenseSubs.map(renderCard)}
          </div>
        </div>
      )}

      {transferSubs.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles['section-title']}>
            <ArrowRightLeft size={18} style={{ color: '#3b82f6' }} />
            Transferencias recurrentes
          </h2>
          <div className={styles.grid}>
            {transferSubs.map(renderCard)}
          </div>
        </div>
      )}

      {sortedSubscriptions.length === 0 && (
        <div className={styles['empty-state']}>
          <CreditCard size={48} className={styles['empty-icon']} />
          <p>No hay recurrentes</p>
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
            Gasto
          </button>
          <button
            className={`${styles['type-btn']} ${form.type === 'income' ? styles['active-income'] : ''}`}
            onClick={() => setForm({ ...form, type: 'income', category: '' })}
          >
            <TrendingUp size={16} />
            Ingreso
          </button>
          <button
            className={`${styles['type-btn']} ${form.type === 'transfer' ? styles['active-transfer'] : ''}`}
            onClick={() => setForm({ ...form, type: 'transfer', category: 'transfer' })}
          >
            <ArrowRightLeft size={16} />
            Transferencia
          </button>
        </div>

        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={form.type === 'transfer' ? 'Ej: Ahorro mensual' : form.type === 'income' ? 'Ej: Nómina' : 'Ej: Netflix'}
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

        {form.type === 'transfer' ? (
          <div className={styles['form-grid']}>
            <Select
              label="Cuenta origen"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value, toAccountId: '' })}
            >
              <option value="">Seleccionar cuenta</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
            <Select
              label="Cuenta destino"
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
            >
              <option value="">Seleccionar cuenta</option>
              {destinationAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
        ) : (
          <div className={styles['form-grid']}>
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

            {activeAccounts.length > 0 && (
              <Select
                label="Cuenta"
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              >
                <option value="">Sin cuenta</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            )}
          </div>
        )}

        {form.type !== 'transfer' && (
          <Select
            label="Método de pago"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        )}

        <Input
          label="Imagen (URL)"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          placeholder="https://ejemplo.com/logo.png"
        />
        {form.image && (
          <div className={styles['image-preview']}>
            <img src={form.image} alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}

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
