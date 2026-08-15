export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getMonthKey(date: string): string {
  return date.substring(0, 7);
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function getMonthlyAmount(amount: number, cycle: string): number {
  switch (cycle) {
    case 'weekly':
      return amount * 4.33;
    case 'yearly':
      return amount / 12;
    default:
      return amount;
  }
}

export function isSubscriptionDueThisMonth(subscription: { billingCycle: string; nextPayment: string }): boolean {
  if (subscription.billingCycle !== 'yearly') return true;
  const now = new Date();
  const nextDue = new Date(subscription.nextPayment);
  return nextDue.getFullYear() === now.getFullYear() && nextDue.getMonth() === now.getMonth();
}

export function getSubscriptionMonthAmount(subscription: { amount: number; billingCycle: string; nextPayment: string }): number {
  if (subscription.billingCycle === 'yearly') {
    return isSubscriptionDueThisMonth(subscription) ? subscription.amount : 0;
  }
  return getMonthlyAmount(subscription.amount, subscription.billingCycle);
}

export function isPaidThisCycle(nextPayment: string): boolean {
  return getDaysUntil(nextPayment) <= 0;
}

function advanceOnce(date: Date, billingCycle: string): void {
  if (billingCycle === 'weekly') date.setDate(date.getDate() + 7);
  else if (billingCycle === 'yearly') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
}

// Whether `now` still falls within the billing period that `due` belongs to
// (same month for monthly, same 7-day span for weekly, same year for yearly).
function withinSamePeriod(due: Date, now: Date, billingCycle: string): boolean {
  if (billingCycle === 'yearly') return due.getFullYear() === now.getFullYear();
  if (billingCycle === 'weekly') {
    const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 7;
  }
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
}

// Advances a past-due `nextPayment` to the next occurrence once its billing
// period has fully elapsed (e.g. once the calendar month has changed for a
// monthly subscription). Stays put while still "paid" within the same period.
export function getRolledOverDate(nextPayment: string, billingCycle: string): string {
  const due = new Date(nextPayment);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  while (due < now && !withinSamePeriod(due, now, billingCycle)) {
    advanceOnce(due, billingCycle);
  }
  return due.toISOString().split('T')[0];
}

export function needsRollover(nextPayment: string, billingCycle: string): boolean {
  return getRolledOverDate(nextPayment, billingCycle) !== nextPayment;
}

// For calendar display: projects a recurring item's date into an arbitrary
// (year, month) without mutating anything. Monthly/yearly items always land
// on the same day-of-month (clamped to the shortest month); weekly items
// aren't projected across months (too many occurrences to be useful here) —
// they only show up if their stored date already falls in that month.
export function getOccurrenceInMonth(nextPayment: string, billingCycle: string, year: number, month: number): string | null {
  const d = new Date(nextPayment);
  if (billingCycle === 'weekly') {
    return d.getFullYear() === year && d.getMonth() === month ? nextPayment : null;
  }
  if (billingCycle === 'yearly' && d.getMonth() !== month) return null;

  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
