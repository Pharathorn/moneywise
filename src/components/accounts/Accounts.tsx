import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Wallet, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { Account } from '../../types';
import { formatCurrency, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './Accounts.module.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#ef4444', '#14b8a6', '#6366f1'];

const BANK_ICONS: Record<string, string> = {
  'Santander': 'S',
  'BBVA': 'B',
  'CaixaBank': 'C',
  'Bankinter': 'K',
  'Sabadell': 'S',
  'Unicaja': 'U',
  'ING': 'I',
  'Openbank': 'O',
  'Revolut': 'R',
  'N26': 'N',
};

export function Accounts() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [form, setForm] = useState({
    name: '',
    bank: '',
    color: COLORS[0],
    image: '',
    active: true,
    initialBalance: '',
  });

  const accountsWithStats = useMemo(() => {
    return state.accounts.map((account) => {
      const accountTransactions = state.transactions.filter((t) => t.accountId === account.id);
      const income = accountTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenses = accountTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const accountSubscriptions = state.subscriptions.filter((s) => s.accountId === account.id && s.active);
      const recurringIncome = accountSubscriptions
        .filter((s) => s.type === 'income')
        .reduce((sum, s) => {
          const monthly = s.billingCycle === 'yearly' ? s.amount / 12 : s.billingCycle === 'weekly' ? s.amount * 4.33 : s.amount;
          return sum + monthly;
        }, 0);
      const recurringExpenses = accountSubscriptions
        .filter((s) => s.type === 'expense')
        .reduce((sum, s) => {
          const monthly = s.billingCycle === 'yearly' ? s.amount / 12 : s.billingCycle === 'weekly' ? s.amount * 4.33 : s.amount;
          return sum + monthly;
        }, 0);

      return {
        ...account,
        income,
        expenses,
        balance: (account.initialBalance || 0) + income - expenses,
        recurringIncome,
        recurringExpenses,
        transactionCount: accountTransactions.length,
        subscriptionCount: accountSubscriptions.length,
      };
    });
  }, [state.accounts, state.transactions, state.subscriptions]);

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm({
      name: '',
      bank: '',
      color: COLORS[0],
      image: '',
      active: true,
      initialBalance: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      bank: account.bank,
      color: account.color,
      image: account.image || '',
      active: account.active,
      initialBalance: (account.initialBalance || 0).toString(),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.bank) return;

    const account: Account = {
      id: editingAccount?.id || generateId(),
      name: form.name,
      bank: form.bank,
      color: form.color,
      icon: form.bank.substring(0, 1).toUpperCase(),
      image: form.image || undefined,
      active: form.active,
      initialBalance: parseFloat(form.initialBalance) || 0,
    };

    if (editingAccount) {
      dispatch({ type: 'UPDATE_ACCOUNT', payload: account });
    } else {
      dispatch({ type: 'ADD_ACCOUNT', payload: account });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_ACCOUNT', payload: id });
  };

  const getBankIcon = (bank: string) => {
    return BANK_ICONS[bank] || bank.substring(0, 1).toUpperCase();
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Cuentas bancarias</h1>
        <Button icon={<Plus size={18} />} onClick={openCreateModal}>
          Añadir cuenta
        </Button>
      </div>

      <div className={styles['accounts-grid']}>
        {accountsWithStats.length > 0 ? (
          accountsWithStats.map((account) => (
            <div key={account.id} className={`${styles['account-card']} ${!account.active ? styles.inactive : ''}`}>
              <div className={styles['account-header']}>
                <div className={styles['account-info']}>
                  <div className={styles['account-logo']} style={{ background: `${account.color}15` }}>
                    {account.image ? (
                      <img src={account.image} alt={account.name} />
                    ) : (
                      <span style={{ color: account.color, fontSize: '1.125rem', fontWeight: 700 }}>
                        {getBankIcon(account.bank)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className={styles['account-name']}>{account.name}</div>
                    <div className={styles['account-bank']}>{account.bank}</div>
                  </div>
                </div>
                <div className={styles['account-actions']}>
                  <button className={styles['action-btn']} onClick={() => openEditModal(account)}>
                    <Pencil size={15} />
                  </button>
                  <button className={styles['action-btn']} onClick={() => handleDelete(account.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className={styles['account-stats']}>
                <div className={styles.stat}>
                  <span className={styles['stat-label']}>Ingresos</span>
                  <span className={`${styles['stat-value']} ${styles.income}`}>{formatCurrency(account.income)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles['stat-label']}>Gastos</span>
                  <span className={`${styles['stat-value']} ${styles.expense}`}>{formatCurrency(account.expenses)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles['stat-label']}>Balance</span>
                  <span className={`${styles['stat-value']} ${account.balance >= 0 ? styles.income : styles.expense}`}>
                    {formatCurrency(account.balance)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles['stat-label']}>Recurrentes</span>
                  <span className={styles['stat-value']}>
                    <span style={{ color: '#22c55e' }}>+{formatCurrency(account.recurringIncome)}</span>
                    {' / '}
                    <span style={{ color: '#ef4444' }}>-{formatCurrency(account.recurringExpenses)}</span>
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles['empty-state']}>
            <Wallet size={48} className={styles['empty-icon']} />
            <p>No hay cuentas bancarias configuradas</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              Añade tus cuentas para organizar tus finanzas
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Editar cuenta' : 'Nueva cuenta'}
      >
        <Input
          label="Nombre de la cuenta"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ej: Cuenta principal"
        />

        <Input
          label="Banco"
          value={form.bank}
          onChange={(e) => setForm({ ...form, bank: e.target.value })}
          placeholder="Ej: Santander"
        />

        <Input
          label="Saldo actual"
          type="number"
          step="0.01"
          value={form.initialBalance}
          onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
          placeholder="0.00"
        />

        <div className={styles['image-section']}>
          <label className={styles['image-label']}>Logo del banco (URL)</label>
          <div className={styles['image-input-row']}>
            <div className={styles['image-input']}>
              <Input
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
            <div className={`${styles['image-preview']} ${!form.image ? styles.empty : ''}`}>
              {form.image ? (
                <img src={form.image} alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <ImageIcon size={20} />
              )}
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.375rem' }}>
            Pega la URL del logo de tu banco. Si no pones nada, se usará la inicial.
          </p>
        </div>

        <div>
          <label className={styles['image-label']}>Color</label>
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

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingAccount ? 'Guardar cambios' : 'Añadir cuenta'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
