import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { Debt, PaymentMethod, PAYMENT_METHODS } from '../../types';
import { formatCurrency, getDaysUntil, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './Debts.module.css';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1'];

export function Debts() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const [form, setForm] = useState({
    name: '',
    amount: '',
    type: 'pay' as 'pay' | 'collect',
    accountId: '',
    dueDate: '',
    notes: '',
    color: COLORS[0],
  });

  const activeAccounts = useMemo(() => state.accounts.filter((a) => a.active), [state.accounts]);

  const pendingDebts = useMemo(
    () => state.debts.filter((d) => d.status === 'pending').sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    }),
    [state.debts]
  );

  const completedDebts = useMemo(
    () => state.debts.filter((d) => d.status === 'completed').sort((a, b) => {
      if (a.completedAt && b.completedAt) return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      return 0;
    }),
    [state.debts]
  );

  const toPay = useMemo(
    () => pendingDebts.filter((d) => d.type === 'pay'),
    [pendingDebts]
  );

  const toCollect = useMemo(
    () => pendingDebts.filter((d) => d.type === 'collect'),
    [pendingDebts]
  );

  const totalToPay = useMemo(
    () => toPay.reduce((sum, d) => sum + d.amount, 0),
    [toPay]
  );

  const totalToCollect = useMemo(
    () => toCollect.reduce((sum, d) => sum + d.amount, 0),
    [toCollect]
  );

  const openCreateModal = (type: 'pay' | 'collect') => {
    setEditingDebt(null);
    setForm({
      name: '',
      amount: '',
      type,
      accountId: '',
      dueDate: '',
      notes: '',
      color: type === 'pay' ? '#ef4444' : '#22c55e',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setForm({
      name: debt.name,
      amount: debt.amount.toString(),
      type: debt.type,
      accountId: debt.accountId || '',
      dueDate: debt.dueDate || '',
      notes: debt.notes || '',
      color: debt.color || COLORS[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.amount) return;

    const debt: Debt = {
      id: editingDebt?.id || generateId(),
      name: form.name,
      amount: parseFloat(form.amount),
      type: form.type,
      accountId: form.accountId || undefined,
      dueDate: form.dueDate || undefined,
      status: editingDebt?.status || 'pending',
      notes: form.notes || undefined,
      color: form.color,
      createdAt: editingDebt?.createdAt || new Date().toISOString(),
      completedAt: editingDebt?.completedAt,
    };

    if (editingDebt) {
      dispatch({ type: 'UPDATE_DEBT', payload: debt });
    } else {
      dispatch({ type: 'ADD_DEBT', payload: debt });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_DEBT', payload: id });
  };

  const handleComplete = (debt: Debt) => {
    const today = new Date().toISOString().split('T')[0];

    const updatedDebt: Debt = {
      ...debt,
      status: 'completed',
      completedAt: today,
    };
    dispatch({ type: 'UPDATE_DEBT', payload: updatedDebt });

    if (debt.accountId) {
      const txType = debt.type === 'pay' ? 'expense' : 'income';
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: generateId(),
          type: txType,
          amount: debt.amount,
          description: debt.name,
          category: debt.type === 'pay' ? 'cat-otros-gasto' : 'cat-otros-ingreso',
          date: today,
          recurring: false,
          accountId: debt.accountId,
          paymentMethod: 'transfer',
        },
      });
    }
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    return state.accounts.find((a) => a.id === accountId)?.name || null;
  };

  const renderDebtCard = (debt: Debt) => {
    const days = debt.dueDate ? getDaysUntil(debt.dueDate) : null;
    const accountName = getAccountName(debt.accountId);
    const isOverdue = days !== null && days < 0;
    const isUrgent = days !== null && days >= 0 && days <= 7;

    return (
      <div key={debt.id} className={styles['debt-card']} style={{ borderLeftColor: debt.color || (debt.type === 'pay' ? '#ef4444' : '#22c55e') }}>
        <div className={styles['debt-header']}>
          <div className={styles['debt-info']}>
            <div className={styles['debt-icon']}>
              {debt.type === 'pay' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
            </div>
            <div>
              <div className={styles['debt-name']}>{debt.name}</div>
              <div className={styles['debt-meta']}>
                {accountName && <span style={{ color: '#3b82f6' }}>· {accountName}</span>}
                {debt.notes && <span style={{ color: 'var(--text-muted)' }}>· {debt.notes}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <span className={`${styles['debt-amount']} ${debt.type === 'pay' ? styles.negative : styles.positive}`}>
              {debt.type === 'pay' ? '-' : '+'}{formatCurrency(debt.amount)}
            </span>
            <div className={styles['debt-actions']}>
              <button className={styles['action-btn']} onClick={() => handleComplete(debt)} title="Marcar como pagado/cobrado">
                <CheckCircle size={15} />
              </button>
              <button className={styles['action-btn']} onClick={() => openEditModal(debt)}>
                <Pencil size={15} />
              </button>
              <button className={styles['action-btn']} onClick={() => handleDelete(debt.id)}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
        <div className={styles['debt-details']}>
          {debt.dueDate && (
            <div className={styles['detail-item']}>
              <span className={styles['detail-label']}>Vence</span>
              <span className={styles['detail-value']}>{debt.dueDate}</span>
            </div>
          )}
          {days !== null && (
            <div className={styles['detail-item']}>
              <span className={styles['detail-label']}>Faltan</span>
              <span className={`${styles['days-badge']} ${isOverdue ? styles.overdue : isUrgent ? styles.urgent : styles.ok}`}>
                {isOverdue ? `${Math.abs(days)} días retraso` : `${days} días`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Deudas</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button icon={<ArrowDownCircle size={18} />} onClick={() => openCreateModal('pay')}>
            Deuda por pagar
          </Button>
          <Button variant="secondary" icon={<ArrowUpCircle size={18} />} onClick={() => openCreateModal('collect')}>
            Deuda por cobrar
          </Button>
        </div>
      </div>

      <div className={styles['totals-row']}>
        <div className={`${styles['total-box']} ${styles['total-pay']}`}>
          <div className={styles['total-icon']}>
            <ArrowDownCircle size={20} />
          </div>
          <div>
            <span className={styles['total-label']}>Por pagar</span>
            <span className={`${styles['total-value']} ${styles.negative}`}>{formatCurrency(totalToPay)}</span>
          </div>
        </div>
        <div className={`${styles['total-box']} ${styles['total-collect']}`}>
          <div className={styles['total-icon']}>
            <ArrowUpCircle size={20} />
          </div>
          <div>
            <span className={styles['total-label']}>Por cobrar</span>
            <span className={`${styles['total-value']} ${styles.positive}`}>{formatCurrency(totalToCollect)}</span>
          </div>
        </div>
      </div>

      {toPay.length > 0 && (
        <div className={styles.section}>
          <div className={styles['section-header']}>
            <h2 className={styles['section-title']}>
              <ArrowDownCircle size={18} style={{ color: '#ef4444' }} />
              Por pagar
            </h2>
            <Button size="sm" icon={<Plus size={16} />} onClick={() => openCreateModal('pay')}>
              Añadir
            </Button>
          </div>
          <div className={styles.grid}>
            {toPay.map(renderDebtCard)}
          </div>
        </div>
      )}

      {toCollect.length > 0 && (
        <div className={styles.section}>
          <div className={styles['section-header']}>
            <h2 className={styles['section-title']}>
              <ArrowUpCircle size={18} style={{ color: '#22c55e' }} />
              Por cobrar
            </h2>
            <Button size="sm" icon={<Plus size={16} />} onClick={() => openCreateModal('collect')}>
              Añadir
            </Button>
          </div>
          <div className={styles.grid}>
            {toCollect.map(renderDebtCard)}
          </div>
        </div>
      )}

      {pendingDebts.length === 0 && (
        <div className={styles['empty-state']}>
          <p style={{ color: 'var(--text-muted)' }}>No hay deudas pendientes</p>
        </div>
      )}

      {completedDebts.length > 0 && (
        <div className={styles.section} style={{ marginTop: '2rem' }}>
          <h2 className={styles['section-title']} style={{ opacity: 0.6 }}>
            <CheckCircle size={18} style={{ color: 'var(--text-muted)' }} />
            Completadas
          </h2>
          <div className={styles.grid}>
            {completedDebts.map(renderDebtCard)}
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDebt ? 'Editar deuda' : form.type === 'pay' ? 'Nueva deuda por pagar' : 'Nueva deuda por cobrar'}
      >
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={form.type === 'pay' ? 'Ej: Préstamo amigo' : 'Ej: Factura pendiente'}
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
          <Input
            label="Fecha límite"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>

        {activeAccounts.length > 0 && (
          <Select
            label={form.type === 'pay' ? 'Cuenta para pagar' : 'Cuenta para cobrar'}
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Sin cuenta</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        )}

        <Input
          label="Notas"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Opcional"
        />

        <div style={{ marginTop: '0.75rem' }}>
          <label className={styles['detail-label']} style={{ marginBottom: '0.375rem', display: 'block' }}>Color</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                }}
                onClick={() => setForm({ ...form, color: c })}
              />
            ))}
          </div>
        </div>

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingDebt ? 'Guardar cambios' : 'Añadir'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
