import { useState, useMemo } from 'react';
import { Home, Plus, Pencil, Trash2, Landmark, Shield, Lightbulb, Droplets, Wifi, Receipt, Building2 } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { Subscription, HousingConfig, PaymentMethod, PAYMENT_METHODS } from '../../types';
import { formatCurrency, getDaysUntil, getSubscriptionMonthAmount, generateId } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import styles from './Housing.module.css';

const COLORS = ['#6366f1', '#0ea5e9', '#eab308', '#06b6d4', '#8b5cf6', '#f97316', '#64748b', '#ef4444'];

const HOUSING_CATEGORIES = [
  { id: 'cat-hipoteca', name: 'Hipoteca', icon: Landmark },
  { id: 'cat-seguro-hogar', name: 'Seguro hogar', icon: Shield },
  { id: 'cat-luz', name: 'Luz', icon: Lightbulb },
  { id: 'cat-agua', name: 'Agua', icon: Droplets },
  { id: 'cat-internet', name: 'Internet', icon: Wifi },
  { id: 'cat-ibi', name: 'IBI', icon: Receipt },
  { id: 'cat-comunidad', name: 'Comunidad', icon: Building2 },
];

function monthsBetween(start: string, end: Date): number {
  const s = new Date(start);
  const months = (end.getFullYear() - s.getFullYear()) * 12 + (end.getMonth() - s.getMonth());
  return Math.max(0, months);
}

export function Housing() {
  const { state, dispatch } = useApp();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const [configForm, setConfigForm] = useState({
    totalCapital: '',
    monthlyPayment: '',
    startDate: new Date().toISOString().split('T')[0],
    termMonths: '',
    interestRate: '',
  });

  const [subForm, setSubForm] = useState({
    name: '',
    amount: '',
    billingCycle: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    nextPayment: new Date().toISOString().split('T')[0],
    category: 'cat-seguro-hogar',
    color: COLORS[0],
    active: true,
    accountId: '',
    paymentMethod: 'card' as PaymentMethod,
    image: '',
  });

  const config = state.housingConfig;

  const mortgageStats = useMemo(() => {
    if (!config) return null;
    const monthsPaid = monthsBetween(config.startDate, new Date());
    const totalPayments = config.termMonths;
    const effectiveMonthsPaid = Math.min(monthsPaid, totalPayments);

    let remaining: number;
    let capitalPaid: number;
    let totalInterestPaid: number;

    if (config.interestRate && config.interestRate > 0) {
      const r = config.interestRate / 100 / 12;
      const factorN = Math.pow(1 + r, totalPayments);
      const factorNpaid = Math.pow(1 + r, effectiveMonthsPaid);

      // Fórmula de amortización francesa
      remaining = config.totalCapital * factorNpaid - config.monthlyPayment * (factorNpaid - 1) / r;
      remaining = Math.max(0, remaining);

      const totalPaid = effectiveMonthsPaid * config.monthlyPayment;
      capitalPaid = config.totalCapital - remaining;
      totalInterestPaid = totalPaid - capitalPaid;
    } else {
      capitalPaid = effectiveMonthsPaid * config.monthlyPayment;
      remaining = Math.max(0, config.totalCapital - capitalPaid);
      totalInterestPaid = 0;
    }

    const percentPaid = Math.min(100, (effectiveMonthsPaid / totalPayments) * 100);
    const endDate = new Date(config.startDate);
    endDate.setMonth(endDate.getMonth() + totalPayments);

    return {
      monthsPaid: effectiveMonthsPaid,
      totalPayments,
      capitalPaid,
      remaining,
      percentPaid,
      totalInterestPaid,
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [config]);

  const housingSubs = useMemo(
    () =>
      state.subscriptions
        .filter((s) => s.section === 'housing')
        .sort((a, b) => {
          if (a.active !== b.active) return a.active ? -1 : 1;
          return new Date(a.nextPayment).getTime() - new Date(b.nextPayment).getTime();
        }),
    [state.subscriptions]
  );

  const monthlyTotal = useMemo(
    () => housingSubs.filter((s) => s.active && !(config && s.category === 'cat-hipoteca' && s.amount === config.monthlyPayment)).reduce((sum, s) => sum + getSubscriptionMonthAmount(s), 0),
    [housingSubs, config]
  );

  const activeAccounts = useMemo(() => state.accounts.filter((a) => a.active), [state.accounts]);

  const openConfigModal = () => {
    if (config) {
      setConfigForm({
        totalCapital: config.totalCapital.toString(),
        monthlyPayment: config.monthlyPayment.toString(),
        startDate: config.startDate,
        termMonths: config.termMonths.toString(),
        interestRate: config.interestRate?.toString() || '',
      });
    }
    setIsConfigOpen(true);
  };

  const handleSaveConfig = () => {
    if (!configForm.totalCapital || !configForm.monthlyPayment || !configForm.termMonths) return;
    const housingConfig: HousingConfig = {
      totalCapital: parseFloat(configForm.totalCapital),
      monthlyPayment: parseFloat(configForm.monthlyPayment),
      startDate: configForm.startDate,
      termMonths: parseInt(configForm.termMonths),
      interestRate: configForm.interestRate ? parseFloat(configForm.interestRate) : undefined,
    };
    dispatch({ type: 'SET_HOUSING_CONFIG', payload: housingConfig });
    setIsConfigOpen(false);
  };

  const openCreateSubModal = () => {
    setEditingSub(null);
    setSubForm({
      name: '',
      amount: '',
      billingCycle: 'monthly',
      nextPayment: new Date().toISOString().split('T')[0],
      category: 'cat-seguro-hogar',
      color: COLORS[0],
      active: true,
      accountId: '',
      paymentMethod: 'card',
      image: '',
    });
    setIsSubModalOpen(true);
  };

  const openEditSubModal = (s: Subscription) => {
    setEditingSub(s);
    setSubForm({
      name: s.name,
      amount: s.amount.toString(),
      billingCycle: s.billingCycle,
      nextPayment: s.nextPayment,
      category: s.category,
      color: s.color,
      active: s.active,
      accountId: s.accountId || '',
      paymentMethod: s.paymentMethod || 'card',
      image: s.image || '',
    });
    setIsSubModalOpen(true);
  };

  const handleSaveSub = () => {
    if (!subForm.name || !subForm.amount) return;

    const subscription: Subscription = {
      id: editingSub?.id || generateId(),
      type: 'expense',
      name: subForm.name,
      amount: parseFloat(subForm.amount),
      billingCycle: subForm.billingCycle,
      nextPayment: subForm.nextPayment,
      category: subForm.category,
      color: subForm.color,
      active: subForm.active,
      accountId: subForm.accountId || undefined,
      paymentMethod: subForm.paymentMethod,
      image: subForm.image || undefined,
      section: 'housing',
    };

    if (editingSub) {
      dispatch({ type: 'UPDATE_SUBSCRIPTION', payload: subscription });
    } else {
      dispatch({ type: 'ADD_SUBSCRIPTION', payload: subscription });
    }
    setIsSubModalOpen(false);
  };

  const handleDeleteSub = (id: string) => {
    dispatch({ type: 'DELETE_SUBSCRIPTION', payload: id });
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return null;
    return state.accounts.find((a) => a.id === accountId)?.name || null;
  };

  const getPaymentMethodLabel = (method?: PaymentMethod) => {
    if (!method) return null;
    return PAYMENT_METHODS.find((m) => m.value === method)?.label || method;
  };

  const getCatInfo = (catId: string) => {
    return HOUSING_CATEGORIES.find((c) => c.id === catId) || { name: catId, icon: Home };
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Vivienda</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!config && (
            <Button icon={<Landmark size={18} />} onClick={openConfigModal}>
              Configurar hipoteca
            </Button>
          )}
          <Button icon={<Plus size={18} />} onClick={openCreateSubModal}>
            Añadir gasto
          </Button>
        </div>
      </div>

      <div className={styles['mortgage-section']}>
        <h2 className={styles['section-title']}>
          <Landmark size={18} style={{ color: '#6366f1' }} />
          Hipoteca
        </h2>

        {config && mortgageStats ? (
          <div className={styles['mortgage-card']}>
            <div className={styles['mortgage-header']}>
              <div>
                <div className={styles['amount-label']}>Capital restante</div>
                <div className={`${styles['amount-value']} ${styles.remaining}`}>
                  {formatCurrency(mortgageStats.remaining)}
                </div>
              </div>
              <button className={styles['action-btn']} onClick={openConfigModal} style={{ opacity: 1 }}>
                <Pencil size={18} />
              </button>
            </div>

            <div className={styles['progress-bar']}>
              <div className={styles['progress-fill']} style={{ width: `${mortgageStats.percentPaid}%` }} />
            </div>

            <div className={styles['mortgage-details']}>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Capital total</span>
                <span className={styles['detail-value']}>{formatCurrency(config.totalCapital)}</span>
              </div>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Cuota mensual</span>
                <span className={styles['detail-value']}>{formatCurrency(config.monthlyPayment)}</span>
              </div>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Pagado</span>
                <span className={styles['detail-value']}>{formatCurrency(mortgageStats.capitalPaid)}</span>
              </div>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Cuotas</span>
                <span className={styles['detail-value']}>{mortgageStats.monthsPaid} / {mortgageStats.totalPayments}</span>
              </div>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Plazo restante</span>
                <span className={styles['detail-value']}>{mortgageStats.totalPayments - mortgageStats.monthsPaid} meses</span>
              </div>
              <div className={styles['detail-item']}>
                <span className={styles['detail-label']}>Fin estimado</span>
                <span className={styles['detail-value']}>{mortgageStats.endDate}</span>
              </div>
              {config.interestRate != null && (
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>Interés</span>
                  <span className={styles['detail-value']}>{config.interestRate}%</span>
                </div>
              )}
              {mortgageStats.totalInterestPaid > 0 && (
                <div className={styles['detail-item']}>
                  <span className={styles['detail-label']}>Intereses pagados</span>
                  <span className={styles['detail-value']} style={{ color: '#ef4444' }}>{formatCurrency(mortgageStats.totalInterestPaid)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles['empty-mortgage']} onClick={openConfigModal}>
            <Landmark size={40} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>Configurar hipoteca</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>Añade los datos de tu préstamo para tracking automático</p>
          </div>
        )}
      </div>

      <div className={styles['housing-subs']}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className={styles['section-title']} style={{ margin: 0 }}>
            <Home size={18} style={{ color: '#8b5cf6' }} />
            Gastos de hogar
          </h2>
          {monthlyTotal > 0 && (
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {formatCurrency(monthlyTotal)} / mes
            </span>
          )}
        </div>

        {housingSubs.length > 0 ? (
          <div className={styles['subs-grid']}>
            {housingSubs.map((s) => {
              const days = getDaysUntil(s.nextPayment);
              const catInfo = getCatInfo(s.category);
              const CatIcon = catInfo.icon;
              const accountName = getAccountName(s.accountId);
              const paymentLabel = getPaymentMethodLabel(s.paymentMethod);

              return (
                <div key={s.id} className={`${styles['sub-card']} ${!s.active ? styles.inactive : ''}`}>
                  <div className={styles['sub-header']}>
                    <div className={styles['sub-info']}>
                      {s.image ? (
                        <div className={styles['sub-image']}>
                          <img src={s.image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      ) : (
                        <div className={styles['sub-dot']} style={{ background: s.color }} />
                      )}
                      <div>
                        <div className={styles['sub-name']}>{s.name}</div>
                        <div className={styles['sub-category']}>
                          {catInfo.name}
                          {accountName && <span style={{ color: '#3b82f6' }}> · {accountName}</span>}
                          {paymentLabel && <span> · {paymentLabel}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`${styles['sub-amount']} ${styles.negative}`}>-{formatCurrency(s.amount)}</span>
                      <div className={styles['sub-actions']}>
                        <button className={styles['action-btn']} onClick={() => openEditSubModal(s)}>
                          <Pencil size={15} />
                        </button>
                        <button className={styles['action-btn']} onClick={() => handleDeleteSub(s.id)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={styles['sub-details']}>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Ciclo</span>
                      <span className={styles['sub-detail-value']}>
                        {s.billingCycle === 'monthly' ? 'Mensual' : s.billingCycle === 'yearly' ? 'Anual' : 'Semanal'}
                      </span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Próximo</span>
                      <span className={styles['sub-detail-value']}>{s.nextPayment}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Faltan</span>
                      <span className={styles['sub-detail-value']} style={{ color: days <= 7 ? '#ef4444' : days <= 14 ? '#f97316' : '#22c55e' }}>
                        {days} días
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles['empty-state']}>
            <Home size={40} className={styles['empty-icon']} />
            <p>No hay gastos de hogar registrados</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Añade seguros, luz, agua, internet...</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title={config ? 'Editar hipoteca' : 'Configurar hipoteca'}
      >
        <div className={styles['form-grid']}>
          <Input
            label="Capital total"
            type="number"
            step="0.01"
            min="0"
            value={configForm.totalCapital}
            onChange={(e) => setConfigForm({ ...configForm, totalCapital: e.target.value })}
            placeholder="150000"
          />
          <Input
            label="Cuota mensual"
            type="number"
            step="0.01"
            min="0"
            value={configForm.monthlyPayment}
            onChange={(e) => setConfigForm({ ...configForm, monthlyPayment: e.target.value })}
            placeholder="800"
          />
        </div>

        <div className={styles['form-grid']}>
          <Input
            label="Fecha inicio"
            type="date"
            value={configForm.startDate}
            onChange={(e) => setConfigForm({ ...configForm, startDate: e.target.value })}
          />
          <Input
            label="Plazo (meses)"
            type="number"
            min="1"
            value={configForm.termMonths}
            onChange={(e) => setConfigForm({ ...configForm, termMonths: e.target.value })}
            placeholder="300"
          />
        </div>

        <Input
          label="Tasa de interés (%)"
          type="number"
          step="0.01"
          min="0"
          value={configForm.interestRate}
          onChange={(e) => setConfigForm({ ...configForm, interestRate: e.target.value })}
          placeholder="Opcional"
        />

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsConfigOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveConfig}>
            {config ? 'Guardar cambios' : 'Configurar'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={editingSub ? 'Editar gasto' : 'Nuevo gasto de hogar'}
      >
        <Input
          label="Nombre"
          value={subForm.name}
          onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
          placeholder="Ej: Seguro del hogar"
        />

        <div className={styles['form-grid']}>
          <Input
            label="Importe"
            type="number"
            step="0.01"
            min="0"
            value={subForm.amount}
            onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
            placeholder="0.00"
          />
          <Select
            label="Ciclo"
            value={subForm.billingCycle}
            onChange={(e) => setSubForm({ ...subForm, billingCycle: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
          >
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
            <option value="weekly">Semanal</option>
          </Select>
        </div>

        <div className={styles['form-grid']}>
          <Select
            label="Categoría"
            value={subForm.category}
            onChange={(e) => setSubForm({ ...subForm, category: e.target.value })}
          >
            {HOUSING_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <Input
            label="Próximo pago"
            type="date"
            value={subForm.nextPayment}
            onChange={(e) => setSubForm({ ...subForm, nextPayment: e.target.value })}
          />
        </div>

        {activeAccounts.length > 0 && (
          <div className={styles['form-grid']}>
            <Select
              label="Cuenta"
              value={subForm.accountId}
              onChange={(e) => setSubForm({ ...subForm, accountId: e.target.value })}
            >
              <option value="">Sin cuenta</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>

            <Select
              label="Método de pago"
              value={subForm.paymentMethod}
              onChange={(e) => setSubForm({ ...subForm, paymentMethod: e.target.value as PaymentMethod })}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </Select>
          </div>
        )}

        <Input
          label="Imagen (URL)"
          value={subForm.image}
          onChange={(e) => setSubForm({ ...subForm, image: e.target.value })}
          placeholder="https://ejemplo.com/logo.png"
        />
        {subForm.image && (
          <div style={{ marginTop: '0.5rem' }}>
            <img src={subForm.image} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80px', borderRadius: '8px' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <label className={styles['detail-label']} style={{ marginBottom: '0.375rem', display: 'block' }}>Color</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: subForm.color === c ? '2px solid #1e293b' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                }}
                onClick={() => setSubForm({ ...subForm, color: c })}
              />
            ))}
          </div>
        </div>

        <div className={styles['form-actions']}>
          <Button variant="secondary" onClick={() => setIsSubModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveSub}>
            {editingSub ? 'Guardar cambios' : 'Añadir'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
