'use client';

import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const RU_MONTHS_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const RU_MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localYMD(d);
}

function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDeadline(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d} ${RU_MONTHS_GEN[m - 1]} ${y}`;
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Выберите дату' }: DatePickerProps) {
  const min = getTomorrow();

  const initialDate = (() => {
    const ref = value && value >= min ? value : min;
    const [y, m] = ref.split('-').map(Number);
    return { year: y, month: m - 1 };
  })();

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function buildGrid(): (number | null)[] {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    // Mon-first: Sun(0)→6, Mon(1)→0, ...
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  function dayYMD(day: number): string {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function selectDay(day: number) {
    const ymd = dayYMD(day);
    if (ymd < min) return;
    onChange(ymd);
    setOpen(false);
  }

  const grid = buildGrid();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const ref = value && value >= min ? value : min;
          const [y, m] = ref.split('-').map(Number);
          setViewYear(y);
          setViewMonth(m - 1);
          setOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-2xl bg-card py-4 pl-5 pr-4 text-left shadow-[0_4px_16px_rgb(var(--foreground-rgb)_/_0.05)] transition-colors active:bg-secondary"
      >
        <Calendar className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className={`flex-1 text-base font-semibold ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value ? formatDeadline(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            aria-label="Очистить дату"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <X className="size-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[28px] bg-background px-4 pb-10 pt-5"
            style={{ boxShadow: '0 -8px 40px rgb(var(--foreground-rgb) / 0.18)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={prevMonth}
                className="flex size-11 items-center justify-center rounded-full bg-card text-foreground active:bg-secondary"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <span className="text-[17px] font-bold text-foreground">
                {RU_MONTHS_NOM[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="flex size-11 items-center justify-center rounded-full bg-card text-foreground active:bg-secondary"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className="py-1 text-center text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: i >= 5 ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
              {grid.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="size-11" />;
                const ymd = dayYMD(day);
                const disabled = ymd < min;
                const selected = ymd === value;
                const isWeekend = (i % 7) >= 5;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => selectDay(day)}
                    disabled={disabled}
                    className={`
                      mx-auto flex size-11 items-center justify-center rounded-full
                      text-[15px] font-semibold transition-all duration-150
                      ${selected
                        ? 'text-white'
                        : disabled
                        ? 'cursor-not-allowed text-muted-foreground/30'
                        : isWeekend
                        ? 'active:bg-primary/15 active:scale-95'
                        : 'active:bg-primary/15 active:scale-95'
                      }
                    `}
                    style={
                      selected
                        ? { background: 'var(--primary)', boxShadow: '0 4px 14px rgb(var(--primary-rgb) / 0.4)' }
                        : !disabled && isWeekend
                        ? { color: 'var(--primary)' }
                        : {}
                    }
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
