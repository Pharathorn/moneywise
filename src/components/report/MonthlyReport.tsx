import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { formatCurrency, formatDate, getSubscriptionMonthAmount } from '../../utils/formatters';
import { Button } from '../ui/Button';
import styles from './MonthlyReport.module.css';

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function MonthlyReport() {
  const { state } = useApp();
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthTransactions = useMemo(
    () =>
      state.transactions
        .filter((t) => t.date.startsWith(monthKey))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [state.transactions, monthKey]
  );

  const totals = useMemo(() => {
    const income = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [monthTransactions]);

  const categoryBreakdown = useMemo(() => {
    const byCategory: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      });
    return Object.entries(byCategory)
      .map(([catId, amount]) => {
        const cat = state.categories.find((c) => c.id === catId);
        return { id: catId, name: cat?.name || catId, color: cat?.color || '#94a3b8', amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions, state.categories]);

  const subscriptionsDue = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.active && s.nextPayment.startsWith(monthKey))
        .sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime()),
    [state.subscriptions, monthKey]
  );

  const debtsDue = useMemo(
    () => state.debts.filter((d) => d.dueDate && d.dueDate.startsWith(monthKey)),
    [state.debts, monthKey]
  );

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    return state.accounts.find((a) => a.id === accountId)?.name || null;
  };

  const goToMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));

  return (
    <div>
      <div className={`${styles.header} ${styles['no-print']}`}>
        <h1 className={styles.title}>Informe mensual</h1>
        <div className={styles.controls}>
          <div className={styles.nav}>
            <button className={styles['nav-btn']} onClick={() => goToMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <span className={styles['month-label']}>{MONTH_LABELS[month]} {year}</span>
            <button className={styles['nav-btn']} onClick={() => goToMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
          <Button icon={<Printer size={16} />} onClick={() => window.print()}>
            Exportar / Imprimir
          </Button>
        </div>
      </div>

      <div className={styles.report}>
        <h2 className={styles['report-title']}>{MONTH_LABELS[month]} {year}</h2>
        <p className={styles['report-subtitle']}>Wash My Cash · Informe generado el {formatDate(new Date().toISOString().split('T')[0])}</p>

        <div className={styles['totals-grid']}>
          <div className={styles['total-box']}>
            <span className={styles['total-label']}>Ingresos</span>
            <span className={`${styles['total-value']} ${styles.positive}`}>{formatCurrency(totals.income)}</span>
          </div>
          <div className={styles['total-box']}>
            <span className={styles['total-label']}>Gastos</span>
            <span className={`${styles['total-value']} ${styles.negative}`}>{formatCurrency(totals.expenses)}</span>
          </div>
          <div className={styles['total-box']}>
            <span className={styles['total-label']}>Balance</span>
            <span className={`${styles['total-value']} ${totals.balance >= 0 ? styles.positive : styles.negative}`}>{formatCurrency(totals.balance)}</span>
          </div>
        </div>

        {categoryBreakdown.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles['section-title']}>Gastos por categoría</h3>
            <table className={styles.table}>
              <tbody>
                {categoryBreakdown.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={styles['category-dot']} style={{ background: c.color }} />
                      {c.name}
                    </td>
                    <td className={styles['col-amount']}>{formatCurrency(c.amount)}</td>
                    <td className={styles['col-percent']}>
                      {totals.expenses > 0 ? Math.round((c.amount / totals.expenses) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles['section-title']}>Transacciones ({monthTransactions.length})</h3>
          {monthTransactions.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th className={styles['col-amount']}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map((t) => {
                  const cat = state.categories.find((c) => c.id === t.category);
                  return (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.description}{cat && <span className={styles.muted}> · {cat.name}</span>}</td>
                      <td>{getAccountName(t.accountId) || '—'}</td>
                      <td className={`${styles['col-amount']} ${t.type === 'income' ? styles.positive : t.type === 'expense' ? styles.negative : ''}`}>
                        {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '↔'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className={styles.muted}>Sin transacciones este mes.</p>
          )}
        </section>

        {subscriptionsDue.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles['section-title']}>Recurrentes con cobro este mes</h3>
            <table className={styles.table}>
              <tbody>
                {subscriptionsDue.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.nextPayment}</td>
                    <td className={`${styles['col-amount']} ${s.type === 'income' ? styles.positive : styles.negative}`}>
                      {s.type === 'income' ? '+' : '-'}{formatCurrency(getSubscriptionMonthAmount(s))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {debtsDue.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles['section-title']}>Deudas con vencimiento este mes</h3>
            <table className={styles.table}>
              <tbody>
                {debtsDue.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name} <span className={styles.muted}>· {d.status === 'completed' ? 'Completada' : 'Pendiente'}</span></td>
                    <td>{d.dueDate}</td>
                    <td className={`${styles['col-amount']} ${d.type === 'collect' ? styles.positive : styles.negative}`}>
                      {d.type === 'collect' ? '+' : '-'}{formatCurrency(d.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}
