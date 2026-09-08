import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Target, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { SavingsGoal } from '../../types';
import { formatCurrency, getDaysUntil, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './SavingsGoals.module.css';

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#06b6d4', '#6366f1'];

export function SavingsGoals() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    accountId: '',
    currentAmount: '',
    color: COLORS[0],
  });

  const activeAccounts = useMemo(() => state.accounts.filter((a) => a.active), [state.accounts]);

  // Live balance for accounts linked to a goal (same formula as Cuentas/Dashboard).
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    activeAccounts.forEach((account) => {
      const income = state.transactions
        .filter((t) => t.type === 'income' && t.accountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = state.transactions
        .filter((t) => t.type === 'expense' && t.accountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersIn = state.transactions
        .filter((t) => t.type === 'transfer' && t.toAccountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const transfersOut = state.transactions
        .filter((t) => t.type === 'transfer' && t.accountId === account.id)
        .reduce((sum, t) => sum + t.amount, 0);
      balances[account.id] = (account.initialBalance || 0) + income - expenses + transfersIn - transfersOut;
    });
    return balances;
  }, [activeAccounts, state.transactions]);

  const goalsWithProgress = useMemo(() => {
    return [...state.savingsGoals]
      .map((goal) => {
        const current = goal.accountId ? (accountBalances[goal.accountId] ?? 0) : (goal.currentAmount || 0);
        const percent = goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
        const reached = current >= goal.targetAmount;
        return { ...goal, current, percent, reached };
      })
      .sort((a, b) => {
        if (a.reached !== b.reached) return a.reached ? 1 : -1;
        return b.percent - a.percent;
      });
  }, [state.savingsGoals, accountBalances]);

  const openCreateModal = () => {
    setEditingGoal(null);
    setForm({ name: '', targetAmount: '', targetDate: '', accountId: '', currentAmount: '', color: COLORS[0] });
    setIsModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      targetDate: goal.targetDate || '',
      accountId: goal.accountId || '',
      currentAmount: (goal.currentAmount || 0).toString(),
      color: goal.color,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.targetAmount) return;

    const goal: SavingsGoal = {
      id: editingGoal?.id || generateId(),
      name: form.name,
      targetAmount: parseFloat(form.targetAmount),
      targetDate: form.targetDate || undefined,
      accountId: form.accountId || undefined,
      currentAmount: form.accountId ? undefined : (parseFloat(form.currentAmount) || 0),
      color: form.color,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
    };

    if (editingGoal) {
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: goal });
    } else {
      dispatch({ type: 'ADD_SAVINGS_GOAL', payload: goal });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: id });
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    return state.accounts.find((a) => a.id === accountId)?.name || null;
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Metas de ahorro</h1>
        <Button icon={<Plus size={18} />} onClick={openCreateModal}>
          Nueva meta
        </Button>
      </div>

      {goalsWithProgress.length > 0 ? (
        <div className={styles.grid}>
          {goalsWithProgress.map((goal) => {
            const days = goal.targetDate ? getDaysUntil(goal.targetDate) : null;
            const accountName = getAccountName(goal.accountId);
            return (
              <div key={goal.id} className={`${styles['goal-card']} ${goal.reached ? styles.reached : ''}`} style={{ borderLeftColor: goal.color }}>
                <div className={styles['goal-header']}>
                  <div>
                    <div className={styles['goal-name']}>
                      {goal.name}
                      {goal.reached && <CheckCircle2 size={16} style={{ color: '#22c55e', marginLeft: '0.375rem', verticalAlign: 'middle' }} />}
                    </div>
                    <div className={styles['goal-meta']}>
                      {accountName ? `Vinculada a ${accountName}` : 'Saldo manual'}
                      {goal.targetDate && days !== null && (
                        <span> · {days < 0 ? `${Math.abs(days)} días de retraso` : `${days} días`}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles['goal-actions']}>
                    <button className={styles['action-btn']} onClick={() => openEditModal(goal)}>
                      <Pencil size={15} />
                    </button>
                    <button className={styles['action-btn']} onClick={() => handleDelete(goal.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles['goal-amounts']}>
                  <span className={styles['goal-current']}>{formatCurrency(goal.current)}</span>
                  <span className={styles['goal-target']}>de {formatCurrency(goal.targetAmount)}</span>
                </div>

                <div className={styles['progress-bar']}>
                  <div
                    className={styles['progress-fill']}
                    style={{ width: `${goal.percent}%`, background: goal.reached ? '#22c55e' : goal.color }}
                  />
                </div>
                <div className={styles['goal-percent']} style={{ color: goal.reached ? '#22c55e' : 'var(--text-muted)' }}>
                  {Math.round(goal.percent)}%
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles['empty-state']}>
          <Target size={48} className={styles['empty-icon']} />
          <p>No hay metas de ahorro todavía</p>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Crea una para hacer seguimiento de un objetivo</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Editar meta' : 'Nueva meta de ahorro'}
      >
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Vacaciones, Fondo de emergencia"
        />

        <div className={styles['form-grid']}>
          <Input
            label="Importe objetivo"
            type="number"
            step="0.01"
            min="0"
            value={form.targetAmount}
            onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
            placeholder="2000"
          />
          <Input
            label="Fecha objetivo"
            type="date"
            value={form.targetDate}
            onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
          />
        </div>

        {activeAccounts.length > 0 && (
          <Select
            label="Cuenta vinculada (opcional)"
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Sin cuenta · saldo manual</option>
            {activeAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        )}

        {!form.accountId && (
          <Input
            label="Ahorrado hasta ahora"
            type="number"
            step="0.01"
            min="0"
            value={form.currentAmount}
            onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
            placeholder="0.00"
          />
        )}

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
            {editingGoal ? 'Guardar cambios' : 'Crear meta'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
