import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Transaction, TransactionType } from '../../types';
import { formatCurrency, formatDate, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './Transactions.module.css';

export function Transactions() {
  const { state, dispatch } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const [form, setForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    recurring: false,
  });

  const filteredTransactions = useMemo(() => {
    return [...state.transactions]
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.transactions, filterType, filterCategory, searchTerm]);

  const categories = useMemo(
    () => state.categories.filter((c) => c.type === form.type),
    [state.categories, form.type]
  );

  const filterCategories = useMemo(
    () => state.categories.filter((c) => filterType === 'all' || c.type === filterType),
    [state.categories, filterType]
  );

  const openCreateModal = () => {
    setEditingTransaction(null);
    setForm({
      type: 'expense',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      recurring: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setEditingTransaction(t);
    setForm({
      type: t.type,
      amount: t.amount.toString(),
      description: t.description,
      category: t.category,
      date: t.date,
      recurring: t.recurring,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.amount || !form.description || !form.category) return;

    const transaction: Transaction = {
      id: editingTransaction?.id || generateId(),
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      category: form.category,
      date: form.date,
      recurring: form.recurring,
      subscriptionId: editingTransaction?.subscriptionId,
    };

    if (editingTransaction) {
      dispatch({ type: 'UPDATE_TRANSACTION', payload: transaction });
    } else {
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_TRANSACTION', payload: id });
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Transacciones</h1>
        <Button icon={<Plus size={18} />} onClick={openCreateModal}>
          Añadir
        </Button>
      </div>

      <div className={styles.filters}>
        <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className={styles['filter-input']}
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
        <select
          className={styles['filter-input']}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}
        >
          <option value="all">Todos los tipos</option>
          <option value="income">Ingresos</option>
          <option value="expense">Gastos</option>
        </select>
        <select
          className={styles['filter-input']}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">Todas las categorías</option>
          {filterCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className={styles['transaction-list']}>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => {
            const cat = state.categories.find((c) => c.id === t.category);
            return (
              <div key={t.id} className={styles['transaction-row']}>
                <div className={styles['transaction-left']}>
                  <div
                    className={styles['category-dot']}
                    style={{ background: cat ? `${cat.color}15` : '#f1f5f9' }}
                  >
                    <span style={{ color: cat?.color || '#94a3b8' }}>
                      {cat?.name?.substring(0, 2).toUpperCase() || 'OT'}
                    </span>
                  </div>
                  <div className={styles['transaction-info']}>
                    <span className={styles['transaction-desc']}>{t.description}</span>
                    <div className={styles['transaction-meta']}>
                      <span>{cat?.name || 'Sin categoría'}</span>
                      <span>•</span>
                      <span>{formatDate(t.date)}</span>
                      {t.recurring && <span>🔄</span>}
                    </div>
                  </div>
                </div>
                <div className={styles['transaction-right']}>
                  <span className={`${styles['transaction-amount']} ${t.type === 'income' ? styles.income : styles.expense}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <div className={styles['transaction-actions']}>
                    <button className={styles['action-btn']} onClick={() => openEditModal(t)}>
                      <Pencil size={16} />
                    </button>
                    <button className={styles['action-btn']} onClick={() => handleDelete(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles['empty-state']}>
            <ArrowLeftRight size={48} className={styles['empty-icon']} />
            <p>No hay transacciones</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTransaction ? 'Editar transacción' : 'Nueva transacción'}
      >
        <div className={styles['type-toggle']}>
          <button
            className={`${styles['type-btn']} ${form.type === 'expense' ? styles['active-expense'] : ''}`}
            onClick={() => setForm({ ...form, type: 'expense', category: '' })}
          >
            Gasto
          </button>
          <button
            className={`${styles['type-btn']} ${form.type === 'income' ? styles['active-income'] : ''}`}
            onClick={() => setForm({ ...form, type: 'income', category: '' })}
          >
            Ingreso
          </button>
        </div>

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
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>

        <Input
          label="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Ej: Compra supermercado"
        />

        <Select
          label="Categoría"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="">Seleccionar categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingTransaction ? 'Guardar cambios' : 'Añadir transacción'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
