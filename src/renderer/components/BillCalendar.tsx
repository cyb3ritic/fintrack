import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, PlusCircle, Sparkles } from 'lucide-react';
import { RecurringBill } from '../hooks/useDatabase';
import { useCurrency } from '../context/CurrencyContext';

interface BillCalendarProps {
  recurringBills: RecurringBill[];
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<RecurringBill>;
  toggleBillPaidStatus: (id: number) => Promise<{ id: number; is_paid: boolean } | null>;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function BillCalendar({ recurringBills, addRecurringBill, toggleBillPaidStatus }: BillCalendarProps) {
  const { formatCurrency } = useCurrency();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(formatDateKey(new Date()));
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [billForm, setBillForm] = useState({
    title: '',
    amount: '',
    due_date: formatDateKey(new Date()),
    frequency: 'monthly' as 'monthly' | 'yearly' | 'weekly',
  });
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const billsByDay = useMemo(() => {
    const map = new Map<number, RecurringBill[]>();
    recurringBills.forEach((bill) => {
      const day = Number(bill.due_date.slice(-2));
      const existing = map.get(day) ?? [];
      existing.push(bill);
      map.set(day, existing);
    });
    return map;
  }, [recurringBills]);

  const calendarCells = useMemo(() => {
    const cells: Array<{ key: string; date: Date; inCurrentMonth: boolean; bills: RecurringBill[] }> = [];

    for (let index = 0; index < totalCells; index += 1) {
      const dayOffset = index - firstDayOfMonth + 1;
      const date = new Date(viewYear, viewMonth, dayOffset);
      const inCurrentMonth = date.getMonth() === viewMonth;
      const dayNumber = date.getDate();
      const bills = billsByDay.get(dayNumber) ?? [];
      cells.push({ key: formatDateKey(date), date, inCurrentMonth, bills: bills.filter((bill) => bill.due_date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`) || inCurrentMonth) });
    }

    return cells;
  }, [billsByDay, firstDayOfMonth, totalCells, viewMonth, viewYear]);

  const selectedBills = useMemo(() => {
    if (!selectedDay) {
      return [];
    }

    const [year, month, day] = selectedDay.split('-').map(Number);
    const dayNumber = day;
    return (billsByDay.get(dayNumber) ?? []).filter((bill) => bill.due_date.startsWith(`${year}-${String(month).padStart(2, '0')}`));
  }, [billsByDay, selectedDay]);

  const handleDayClick = (date: Date) => {
    const nextSelected = formatDateKey(date);
    setSelectedDay(nextSelected);
    setBillForm((prev) => ({ ...prev, due_date: nextSelected }));
  };

  const handleToggleBill = async (id: number) => {
    setTogglingId(id);
    try {
      await toggleBillPaidStatus(id);
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateBill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!billForm.title.trim()) {
      setFormMessage('Please enter a bill title.');
      return;
    }

    const amount = Number(billForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormMessage('Please enter a valid positive amount.');
      return;
    }

    setIsSubmittingBill(true);
    setFormMessage(null);

    try {
      await addRecurringBill({
        title: billForm.title.trim(),
        amount,
        due_date: billForm.due_date,
        frequency: billForm.frequency,
        is_paid: false,
      });
      setBillForm((prev) => ({ ...prev, title: '', amount: '', due_date: prev.due_date, frequency: prev.frequency }));
      setSelectedDay(billForm.due_date);
      setFormMessage('New recurring bill added.');
    } catch (error: unknown) {
      setFormMessage(error instanceof Error ? error.message : 'Could not add recurring bill.');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Bill Calendar</h1>
          <p className="text-sm text-gray-500">Track recurring outlays and mark them paid at a glance.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/25 px-3 py-2">
          <button onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800/50 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[150px] text-center text-sm font-semibold text-gray-200">
            {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-800/50 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-hidden lg:flex-row">
        <div className="flex-1 rounded-2xl border border-border bg-card/25 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
              <CalendarDays className="h-4 w-4 text-accent-indigo" />
              Monthly schedule
            </div>
            <div className="rounded-full border border-accent-emerald/30 bg-accent-emerald/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-emerald">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Recurring
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day) => (
              <div key={day} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              const isToday = formatDateKey(cell.date) === formatDateKey(new Date());
              const isSelected = selectedDay === formatDateKey(cell.date);
              const hasBills = cell.bills.length > 0;

              return (
                <motion.button
                  key={cell.key}
                  whileHover={{ y: -1, scale: 0.99 }}
                  onClick={() => handleDayClick(cell.date)}
                  className={`flex min-h-[110px] flex-col rounded-2xl border p-2 text-left transition-all ${
                    cell.inCurrentMonth ? 'border-border bg-background/35' : 'border-border/40 bg-background/15 text-gray-600'
                  } ${isSelected ? 'ring-1 ring-accent-indigo' : ''}`}
                >
                  <div className={`mb-2 text-xs font-semibold ${isToday ? 'text-accent-emerald' : 'text-gray-400'}`}>
                    {cell.date.getDate()}
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
                    <AnimatePresence mode="popLayout">
                      {cell.bills.slice(0, 3).map((bill) => (
                        <motion.div
                          key={`${cell.key}-${bill.id}`}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                            bill.is_paid
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300 opacity-70'
                              : 'border-accent-indigo/20 bg-accent-indigo/10 text-accent-indigo'
                          }`}
                        >
                          {bill.is_paid ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : <Circle className="mr-1 inline h-3 w-3" />}
                          {bill.title}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {hasBills && cell.bills.length > 3 ? <span className="text-[10px] font-semibold text-gray-500">+{cell.bills.length - 3} more</span> : null}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full rounded-2xl border border-border bg-card/25 p-4 backdrop-blur-md lg:w-[320px]"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-200">Upcoming bills</h3>
              <p className="text-xs text-gray-500">Click a day to view scheduled bills, then use the buttons below to mark them paid or unpaid.</p>
            </div>
            {selectedDay ? <span className="text-[11px] font-semibold text-gray-500">{selectedDay}</span> : null}
          </div>

          <form onSubmit={handleCreateBill} className="mb-4 rounded-2xl border border-border/70 bg-background/25 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              <PlusCircle className="h-3.5 w-3.5 text-accent-indigo" />
              Add recurring bill
            </div>
            <div className="space-y-2">
              <input
                value={billForm.title}
                onChange={(event) => setBillForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Bill title"
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-gray-100 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billForm.amount}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="Amount"
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-gray-100 outline-none"
                />
                <input
                  type="date"
                  value={billForm.due_date}
                  onChange={(event) => setBillForm((prev) => ({ ...prev, due_date: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-gray-100 outline-none"
                />
              </div>
              <select
                value={billForm.frequency}
                onChange={(event) => setBillForm((prev) => ({ ...prev, frequency: event.target.value as 'monthly' | 'yearly' | 'weekly' }))}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-gray-100 outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            {formMessage ? <p className="mt-2 text-[11px] text-gray-400">{formMessage}</p> : null}
            <button
              type="submit"
              disabled={isSubmittingBill}
              className="mt-3 w-full rounded-xl bg-accent-indigo/15 px-3 py-2 text-sm font-semibold text-accent-indigo transition hover:bg-accent-indigo/25 disabled:opacity-60"
            >
              {isSubmittingBill ? 'Adding...' : 'Add recurring bill'}
            </button>
          </form>

          <AnimatePresence mode="popLayout">
            {selectedBills.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-dashed border-border p-4 text-sm text-gray-500">
                No recurring bills are scheduled for this day.
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedBills.map((bill) => (
                  <motion.div
                    key={bill.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className={`rounded-2xl border p-3 ${bill.is_paid ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-border bg-background/25'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-100">{bill.title}</p>
                        <p className="mt-1 text-xs text-gray-500">Due {bill.due_date}</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-200">{formatCurrency(bill.amount)}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${bill.is_paid ? 'text-emerald-300' : 'text-gray-500'}`}>
                        {bill.is_paid ? 'Paid' : 'Upcoming'}
                      </span>
                      <button
                        onClick={() => handleToggleBill(bill.id)}
                        disabled={togglingId === bill.id}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${bill.is_paid ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-accent-indigo/15 text-accent-indigo hover:bg-accent-indigo/25'}`}
                      >
                        {togglingId === bill.id ? 'Updating...' : bill.is_paid ? 'Mark unpaid' : 'Mark paid'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </motion.aside>
      </div>
    </div>
  );
}
