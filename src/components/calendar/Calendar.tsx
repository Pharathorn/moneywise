import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useApp } from '../../context/DataContext';
import { formatCurrency, getOccurrenceInMonth } from '../../utils/formatters';
import styles from './Calendar.module.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface DayEvent {
  id: string;
  label: string;
  amount: number;
  color: string;
}

export function Calendar() {
  const { state } = useApp();
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const eventsByDay = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};

    const push = (date: string | null, event: DayEvent) => {
      if (!date) return;
      if (!map[date]) map[date] = [];
      map[date].push(event);
    };

    state.subscriptions
      .filter((s) => s.active)
      .forEach((s) => {
        const date = getOccurrenceInMonth(s.nextPayment, s.billingCycle, year, month);
        push(date, {
          id: s.id,
          label: s.name,
          amount: s.amount,
          color: s.type === 'income' ? '#22c55e' : s.type === 'transfer' ? '#3b82f6' : '#ef4444',
        });
      });

    state.debts
      .filter((d) => d.status === 'pending' && d.dueDate)
      .forEach((d) => {
        const target = new Date(d.dueDate as string);
        if (target.getFullYear() === year && target.getMonth() === month) {
          push(d.dueDate as string, {
            id: d.id,
            label: d.name,
            amount: d.amount,
            color: d.type === 'pay' ? '#f97316' : '#8b5cf6',
          });
        }
      });

    return map;
  }, [state.subscriptions, state.debts, year, month]);

  const monthTotal = useMemo(() => {
    return Object.values(eventsByDay)
      .flat()
      .reduce((sum, e) => sum + e.amount, 0);
  }, [eventsByDay]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    // Monday-first offset (getDay(): 0=Sun..6=Sat)
    const leading = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: { date: string | null; day: number | null }[] = [];
    for (let i = 0; i < leading; i++) result.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d });
    }
    while (result.length % 7 !== 0) result.push({ date: null, day: null });
    return result;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];

  const goToMonth = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Calendario</h1>
        <div className={styles.nav}>
          <button className={styles['nav-btn']} onClick={() => goToMonth(-1)}>
            <ChevronLeft size={18} />
          </button>
          <span className={styles['month-label']}>{MONTH_LABELS[month]} {year}</span>
          <button className={styles['nav-btn']} onClick={() => goToMonth(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {monthTotal > 0 && (
        <p className={styles.summary}>{Object.values(eventsByDay).flat().length} movimientos programados · {formatCurrency(monthTotal)}</p>
      )}

      <div className={styles.grid}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles['weekday-cell']}>{w}</div>
        ))}
        {cells.map((cell, i) => {
          const events = cell.date ? eventsByDay[cell.date] || [] : [];
          const isToday = cell.date === todayStr;
          return (
            <div key={i} className={`${styles['day-cell']} ${!cell.day ? styles.empty : ''} ${isToday ? styles.today : ''}`}>
              {cell.day && (
                <>
                  <span className={styles['day-number']}>{cell.day}</span>
                  <div className={styles['day-events']}>
                    {events.slice(0, 3).map((e) => (
                      <div key={e.id} className={styles.chip} style={{ borderColor: e.color, color: e.color }} title={`${e.label} · ${formatCurrency(e.amount)}`}>
                        {e.label}
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className={styles['chip-more']}>+{events.length - 3} más</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span><ArrowUpCircle size={14} style={{ color: '#22c55e' }} /> Ingreso</span>
        <span><ArrowDownCircle size={14} style={{ color: '#ef4444' }} /> Gasto</span>
        <span><span className={styles['legend-dot']} style={{ background: '#3b82f6' }} /> Transferencia</span>
        <span><span className={styles['legend-dot']} style={{ background: '#f97316' }} /> Deuda por pagar</span>
        <span><span className={styles['legend-dot']} style={{ background: '#8b5cf6' }} /> Deuda por cobrar</span>
      </div>
    </div>
  );
}
