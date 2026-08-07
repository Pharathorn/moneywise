import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, CreditCard, Landmark, Home } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../../context/DataContext';
import { formatCurrency, getCurrentMonthKey, getSubscriptionMonthAmount } from '../../utils/formatters';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { state } = useApp();
  const currentMonth = getCurrentMonthKey();

  const monthTransactions = useMemo(
    () => state.transactions.filter((t) => t.date.startsWith(currentMonth)),
    [state.transactions, currentMonth]
  );

  const summary = useMemo(() => {
    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const recurringIncome = state.subscriptions
      .filter((s) => s.active && s.type === 'income')
      .reduce((sum, s) => sum + getSubscriptionMonthAmount(s), 0);

    const recurringExpenses = state.subscriptions
      .filter((s) => s.active && s.type === 'expense' && s.section !== 'housing')
      .reduce((sum, s) => sum + getSubscriptionMonthAmount(s), 0);

    const mortgagePayment = state.housingConfig?.monthlyPayment || 0;

    const housingSubs = state.subscriptions
      .filter((s) => s.active && s.section === 'housing')
      .reduce((sum, s) => sum + getSubscriptionMonthAmount(s), 0);

    const housingExpenses = housingSubs + mortgagePayment;
    const totalMonthlyExpenses = recurringExpenses + housingExpenses;

    return { income, expenses, balance: income - expenses, recurringIncome, recurringExpenses, housingExpenses, totalMonthlyExpenses };
  }, [monthTransactions, state.subscriptions, state.housingConfig]);

  const accountsSummary = useMemo(() => {
    return state.accounts
      .filter((a) => a.active)
      .map((account) => {
        const accountTransactions = monthTransactions.filter((t) => t.accountId === account.id);
        const income = accountTransactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const expenses = accountTransactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...account, income, expenses, balance: (account.initialBalance || 0) + income - expenses };
      });
  }, [state.accounts, monthTransactions]);

  const categoryData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = state.categories.find((c) => c.id === t.category);
        const name = cat ? cat.name : 'Otros';
        byCategory[name] = (byCategory[name] || 0) + t.amount;
      });

    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [monthTransactions, state.categories]);

  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; label: string }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-ES', { month: 'short' });
      months[key] = { income: 0, expenses: 0, label };
    }

    state.transactions.forEach((t) => {
      const key = t.date.substring(0, 7);
      if (months[key]) {
        if (t.type === 'income') {
          months[key].income += t.amount;
        } else {
          months[key].expenses += t.amount;
        }
      }
    });

    return Object.entries(months).map(([, data]) => ({
      name: data.label,
      income: data.income,
      expenses: data.expenses,
    }));
  }, [state.transactions]);

  const upcomingSubscriptions = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.active)
        .sort((a, b) => new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime())
        .slice(0, 8),
    [state.subscriptions]
  );

  const recentTransactions = useMemo(
    () => [...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [state.transactions]
  );

  const PIE_COLORS = ['#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#ef4444', '#22c55e'];

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 1.5rem 0' }}>
        Dashboard
      </h1>

      <div className={styles['summary-grid']}>
        <div className={styles['summary-card']}>
          <p className={styles['summary-label']}>
            <Wallet size={16} /> Balance mensual
          </p>
          <p className={`${styles['summary-value']} ${summary.balance >= 0 ? styles.positive : styles.negative}`}>
            {formatCurrency(summary.balance)}
          </p>
        </div>
        <div className={styles['summary-card']}>
          <p className={styles['summary-label']}>
            <TrendingUp size={16} /> Ingresos
          </p>
          <p className={`${styles['summary-value']} ${styles.positive}`}>{formatCurrency(summary.income)}</p>
        </div>
        <div className={styles['summary-card']}>
          <p className={styles['summary-label']}>
            <TrendingDown size={16} /> Gastos
          </p>
          <p className={`${styles['summary-value']} ${styles.negative}`}>{formatCurrency(summary.expenses)}</p>
        </div>
        <div className={styles['summary-card']}>
          <p className={styles['summary-label']}>
            <CreditCard size={16} /> Recurrentes
          </p>
          <p className={`${styles['summary-value']} ${styles.neutral}`}>
            <span style={{ color: '#22c55e', fontSize: '0.875rem' }}>+{formatCurrency(summary.recurringIncome)}</span>
            {' / '}
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>-{formatCurrency(summary.recurringExpenses)}</span>
          </p>
        </div>
        <div className={styles['summary-card']}>
          <p className={styles['summary-label']}>
            <Home size={16} /> Vivienda
          </p>
          <p className={`${styles['summary-value']} ${styles.negative}`}>{formatCurrency(summary.housingExpenses)}</p>
        </div>
        <div className={styles['summary-card']} style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <p className={styles['summary-label']} style={{ color: '#991b1b' }}>
            <TrendingDown size={16} /> Gasto total / mes
          </p>
          <p className={`${styles['summary-value']} ${styles.negative}`}>{formatCurrency(summary.totalMonthlyExpenses)}</p>
        </div>
      </div>

      {accountsSummary.length > 0 && (
        <div className={styles['accounts-section']}>
          <h3 className={styles['section-title']}>
            <Landmark size={18} />
            Cuentas bancarias
          </h3>
          <div className={styles['accounts-grid']}>
            {accountsSummary.map((account) => (
              <div key={account.id} className={styles['account-card']}>
                <div className={styles['account-header']}>
                  <div className={styles['account-info']}>
                    <div className={styles['account-logo']} style={{ background: `${account.color}15` }}>
                      {account.image ? (
                        <img src={account.image} alt="" />
                      ) : (
                        <span style={{ color: account.color, fontWeight: 700 }}>
                          {account.bank.substring(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className={styles['account-name']}>{account.name}</div>
                      <div className={styles['account-bank']}>{account.bank}</div>
                    </div>
                  </div>
                  <div className={styles['account-balance']} style={{ color: account.balance >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatCurrency(account.balance)}
                  </div>
                </div>
                <div className={styles['account-stats']}>
                  <span className={styles['account-income']}>+{formatCurrency(account.income)}</span>
                  <span className={styles['account-expense']}>-{formatCurrency(account.expenses)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles['charts-grid']}>
        <div className={styles['chart-card']}>
          <h3 className={styles['chart-title']}>Ingresos vs Gastos (6 meses)</h3>
          <div className={styles['chart-container']}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 13 }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Ingresos" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gastos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles['chart-card']}>
          <h3 className={styles['chart-title']}>Gastos por categoría</h3>
          <div className={styles['chart-container']}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 13 }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles['empty-message']}>Sin gastos este mes</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles['recent-section']}>
        <div className={styles['recent-card']}>
          <h3 className={styles['recent-title']}>Últimas transacciones</h3>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((t) => {
              const cat = state.categories.find((c) => c.id === t.category);
              return (
                <div key={t.id} className={styles['transaction-item']}>
                  <div className={styles['transaction-left']}>
                    {t.image ? (
                      <div className={styles['transaction-image']}>
                        <img src={t.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    ) : (
                      <div
                        className={styles['transaction-icon']}
                        style={{ background: cat ? `${cat.color}15` : '#f1f5f9' }}
                      >
                        <span style={{ color: cat?.color || '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                          {cat?.name?.substring(0, 2).toUpperCase() || 'OT'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className={styles['transaction-name']}>{t.description}</div>
                      <div className={styles['transaction-category']}>{cat?.name || 'Sin categoría'}</div>
                    </div>
                  </div>
                  <span className={`${styles['transaction-amount']} ${t.type === 'income' ? styles.income : styles.expense}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className={styles['empty-message']}>Sin transacciones este mes</div>
          )}
        </div>

        <div className={styles['recent-card']}>
          <h3 className={styles['recent-title']}>Próximos cobros/ingresos</h3>
          {upcomingSubscriptions.length > 0 ? (
            upcomingSubscriptions.map((s) => (
              <div key={s.id} className={styles['subscription-item']}>
                <div className={styles['subscription-left']}>
                  {s.image ? (
                    <div className={styles['subscription-image']}>
                      <img src={s.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  ) : (
                    <div className={styles['subscription-dot']} style={{ background: s.color }} />
                  )}
                  <div>
                    <div className={styles['subscription-name']}>
                      {s.name}
                      {s.section === 'housing' && (
                        <span style={{ marginLeft: '0.375rem', fontSize: '0.6875rem', color: '#8b5cf6', background: '#f5f3ff', padding: '0.125rem 0.375rem', borderRadius: '4px', fontWeight: 500 }}>Casa</span>
                      )}
                    </div>
                    <div className={styles['subscription-date']}>
                      {s.type === 'income' ? 'Ingreso' : 'Gasto'} · {s.nextPayment}
                    </div>
                  </div>
                </div>
                <span className={`${styles['subscription-amount']}`} style={{ color: s.type === 'income' ? '#22c55e' : '#1e293b' }}>
                  {s.type === 'income' ? '+' : '-'}{formatCurrency(s.amount)}
                </span>
              </div>
            ))
          ) : (
            <div className={styles['empty-message']}>Sin recurrentes próximos</div>
          )}
        </div>
      </div>
    </div>
  );
}
