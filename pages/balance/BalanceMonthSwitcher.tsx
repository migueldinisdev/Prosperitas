import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const BalanceMonthSwitcher: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const goToPreviousMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const selectMonth = (monthIndex: number) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setShowPicker(false);
  };

  const selectYear = (year: number) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(year);
      return newDate;
    });
  };

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const displayText = `${MONTHS[currentMonth]} ${currentYear}`;

  // Generate year options (5 years back, current year, 2 years forward)
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYearNum - 5 + i);

  return (
    <div className="relative">
      <div className="flex items-center justify-between bg-app-card border border-app-border rounded-xl p-2">
        <button 
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-app-surface rounded-lg text-app-muted hover:text-app-foreground transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>
        
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-app-surface rounded-lg transition-colors"
        >
          <Calendar size={16} className="text-app-muted" />
          <span className="font-semibold text-app-foreground">{displayText}</span>
        </button>
        
        <button 
          onClick={goToNextMonth}
          className="p-2 hover:bg-app-surface rounded-lg text-app-muted hover:text-app-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {showPicker && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute top-full mt-2 left-0 right-0 bg-app-card border border-app-border rounded-xl p-4 shadow-xl z-20">
            {/* Year Selector */}
            <div className="mb-4">
              <label className="text-xs text-app-muted uppercase tracking-wider mb-2 block">
                Year
              </label>
              <div className="grid grid-cols-4 gap-2">
                {years.map(year => (
                  <button
                    key={year}
                    onClick={() => selectYear(year)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      year === currentYear
                        ? 'bg-app-primary text-white'
                        : 'bg-app-surface text-app-foreground hover:bg-app-card'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Month Selector */}
            <div>
              <label className="text-xs text-app-muted uppercase tracking-wider mb-2 block">
                Month
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => selectMonth(index)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      index === currentMonth && currentYear === selectedDate.getFullYear()
                        ? 'bg-app-primary text-white'
                        : 'bg-app-surface text-app-foreground hover:bg-app-card'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
