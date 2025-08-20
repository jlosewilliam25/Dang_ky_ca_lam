"use client";
// ...existing code...
import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaSun, FaRegSun, FaCloudSun, FaMoon, FaTrash } from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';
import { useRef, useEffect } from 'react';

const CA_OPTIONS = [
  { value: 'sang', label: 'Sáng', icon: <FaSun className="inline mr-1 text-yellow-400" /> },
  { value: 'chieu', label: 'Chiều', icon: <FaCloudSun className="inline mr-1 text-orange-400" /> },
  { value: 'toi', label: 'Tối', icon: <FaMoon className="inline mr-1 text-purple-700" /> },
  { value: 'sang_nua_dau', label: 'Sáng nửa đầu', icon: <FaRegSun className="inline mr-1 text-yellow-300" /> },
  { value: 'sang_nua_cuoi', label: 'Sáng nửa cuối', icon: <FaRegSun className="inline mr-1 text-yellow-500" /> },
];

const STATUS_COLORS = {
  approved: 'bg-green-500',
  pending: 'bg-orange-400',
  rejected: 'bg-red-400',
  draft: 'bg-gray-300',
};
const STATUS_LABELS = {
  approved: 'Đã duyệt',
  pending: 'Chờ duyệt',
  rejected: 'Từ chối',
  draft: 'Nháp',
};

export default function Home() {
  // Danh sách các nhóm ngày đã chọn (ngày lẻ/dải ngày)
  const [selectedGroups, setSelectedGroups] = useState([]); // [{type: 'single', days: [Date]}, {type: 'range', days: [Date, Date]}]
  const [tempRange, setTempRange] = useState([null, null]);
  const [selectMode, setSelectMode] = useState('multi'); // 'multi' hoặc 'range'
  const [rangeDates, setRangeDates] = useState([null, null]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarTooltip, setCalendarTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
  const calendarRef = useRef(null);
  const [selectedDatesState, setSelectedDatesState] = useState([]);
  const [schedule, setSchedule] = useState({}); // {date: [ca1, ca2]}
  const [note, setNote] = useState('');
  const [status, setStatus] = useState({});
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  // Chọn ngày theo chế độ
  const handleDateChange = (date) => {
    if (selectMode === 'multi') {
      if (Array.isArray(date)) {
        setTempRange([null, null]);
      } else {
        setTempRange([date, null]);
      }
    } else if (selectMode === 'range') {
      if (Array.isArray(date)) {
        setTempRange(date);
      } else {
        if (!tempRange[0]) setTempRange([date, null]);
        else setTempRange([tempRange[0], date]);
      }
    }
  };

  // Thêm nhóm ngày vào danh sách
  const handleAddGroup = () => {
    if (selectMode === 'multi' && tempRange[0]) {
      setSelectedGroups(prev => [...prev, { type: 'single', days: [tempRange[0]] }]);
      setTempRange([null, null]);
    } else if (selectMode === 'range' && tempRange[0] && tempRange[1]) {
      setSelectedGroups(prev => [...prev, { type: 'range', days: [tempRange[0], tempRange[1]] }]);
      setTempRange([null, null]);
    }
  };

  // Xóa nhóm ngày
  const handleRemoveGroup = idx => setSelectedGroups(groups => groups.filter((_, i) => i !== idx));
  const handleClearGroups = () => setSelectedGroups([]);

  // Tạo mảng ngày đã chọn từ các nhóm
  const selectedDates = selectedGroups.flatMap(group => {
    if (group.type === 'single') return group.days;
    if (group.type === 'range') {
      const start = new Date(group.days[0]);
      const end = new Date(group.days[1]);
      const days = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) days.push(new Date(d));
      }
      return days;
    }
    return [];
  });

  // Chỉ lưu ca làm cho các ngày còn hiển thị trong chọn lịch
  const filteredSchedule = Object.fromEntries(
    Object.entries(schedule).filter(([key]) =>
      selectedDates.some(date => date.toDateString() === key)
    )
  );

  // Tính tổng số ca đã đăng ký trong tháng (chỉ tính ngày còn hiển thị)
  const totalCas = Object.values(filteredSchedule).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  // Tooltip ca đã đăng ký khi hover ngày
  const handleDayHover = (date, e) => {
    const key = date.toDateString();
    const cas = schedule[key] || [];
    let text = '';
    if (cas.length > 0) {
      text = 'Đã đăng ký: ' + cas.map(ca => CA_OPTIONS.find(opt => opt.value === ca)?.label).join(', ');
    } else {
      text = 'Chưa đăng ký ca';
    }
    setCalendarTooltip({ show: true, x: e.clientX, y: e.clientY, text });
  };
  const handleDayLeave = () => setCalendarTooltip({ show: false, x: 0, y: 0, text: '' });

  // Chọn ca làm cho từng ngày
  const handleCaChange = (date, ca) => {
    const key = date.toDateString();
    setSchedule(prev => {
      const prevCas = prev[key] || [];
      let newCas;
      if (prevCas.includes(ca)) {
        newCas = prevCas.filter(c => c !== ca);
      } else {
        newCas = [...prevCas, ca];
      }
      return { ...prev, [key]: newCas };
    });
    setStatus(prev => ({ ...prev, [key]: 'draft' }));
  };

  const handleSaveDraft = () => {
    toast('Đã lưu nháp!', { icon: '📝', style: { background: '#faf5ff', color: '#6d28d9' } });
  };

  const handleSubmit = async () => {
    setShowConfirmPopup(true);
  };

  const handleConfirmSend = async () => {
    // Gửi dữ liệu lên API
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: filteredSchedule, note }),
    });
    setShowConfirmPopup(false);
    if (res.ok) {
      toast.success('Gửi đăng ký thành công!', { style: { background: '#faf5ff', color: '#6d28d9' } });
    } else {
      toast.error('Gửi thất bại!', { style: { background: '#fff0f0', color: '#b91c1c' } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-purple-50 py-8 px-2 flex justify-center items-center" style={{ fontFamily: 'Calibri, Arial, sans-serif' }}>
      <Toaster position="top-right" />
      <div className="w-full max-w-2xl bg-white p-6 sm:p-10 rounded-3xl shadow-2xl flex flex-col gap-10 border border-purple-100">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 tracking-wide uppercase">ĐĂNG KÝ CA LÀM</h1>
            <span className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-bold shadow text-lg">TỔNG CA: {totalCas}</span>
          </div>
          <div className="flex gap-3 flex-wrap justify-center mb-2">
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <span key={key} className={`flex items-center gap-1 px-4 py-1 rounded-full text-sm font-bold bg-gray-100 tracking-wide`}>
                <span className={`w-3 h-3 rounded-full ${color} inline-block`} />
                {STATUS_LABELS[key].toUpperCase()}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full flex flex-col gap-6">
          <span className="font-bold text-purple-700 text-xl tracking-wide uppercase">NGÀY ĐĂNG KÝ</span>
          <button
            className="w-full sm:w-fit px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-lg hover:scale-105 hover:from-purple-600 hover:to-blue-700 transition-all text-lg"
            onClick={() => setShowCalendar(true)}
          >
            CHỌN NGÀY
          </button>
          {showCalendar && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 relative w-full max-w-lg border-2 border-purple-400">
                {/* Nút đóng vẫn giữ lại */}
                <button
                  className="absolute top-4 right-4 text-xl text-purple-700 hover:text-red-500 font-bold"
                  onClick={() => setShowCalendar(false)}
                  aria-label="Đóng"
                >×</button>
                <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center">CHỌN NGÀY LÀM</h2>
                <div className="flex justify-center mb-4">
                  <div className="flex gap-4">
                    <button
                      className={`px-5 py-2 rounded-full font-bold shadow border transition-all text-base ${selectMode === 'multi' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-700 scale-105' : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:scale-105'}`}
                      onClick={() => { setSelectMode('multi'); setTempRange([null, null]); }}
                    >Ngày lẻ</button>
                    <button
                      className={`px-5 py-2 rounded-full font-bold shadow border transition-all text-base ${selectMode === 'range' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-700 scale-105' : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:scale-105'}`}
                      onClick={() => { setSelectMode('range'); setTempRange([null, null]); }}
                    >Dải ngày</button>
                  </div>
                </div>
                <div className="relative">
                  <Calendar
                    ref={calendarRef}
                    locale="vi-VN"
                    onClickDay={handleDateChange}
                    value={selectMode === 'range' ? tempRange : tempRange[0] ? tempRange : null}
                    selectRange={selectMode === 'range'}
                    tileDisabled={({ date }) => date.getDay() === 0}
                    tileClassName={({ date }) => {
                      // Xác định ngày thuộc nhóm nào
                      const isSingle = selectedGroups.some(g => g.type === 'single' && g.days[0].toDateString() === date.toDateString());
                      const isRange = selectedGroups.some(g => g.type === 'range' && g.days[0] <= date && date <= g.days[1]);
                      const isTempSingle = selectMode === 'multi' && tempRange[0] && tempRange[0].toDateString() === date.toDateString();
                      const isTempRange = selectMode === 'range' && tempRange[0] && tempRange[1] && tempRange[0] <= date && date <= tempRange[1];
                      let base = 'rounded-xl border border-gray-200';
                      if (isSingle || isTempSingle) base += ' bg-gradient-to-r from-purple-400 to-blue-300 border-2 border-purple-600 scale-105 shadow-md';
                      else if (isRange || isTempRange) base += ' bg-gradient-to-r from-purple-200 to-blue-100 border-2 border-purple-400 shadow-md';
                      return base;
                    }}
                    formatMonth={(locale, date) => {
                      const month = date.getMonth() + 1;
                      const year = date.getFullYear();
                      return `Tháng ${month} năm ${year}`;
                    }}
                    showNeighboringMonth={false}
                    navigationLabel={({ date }) => {
                      const month = date.getMonth() + 1;
                      const year = date.getFullYear();
                      return `Tháng ${month} năm ${year}`;
                    }}
                    // Loại bỏ dot dưới thứ
                    formatShortWeekday={(locale, date) => {
                      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                      return days[date.getDay()];
                    }}
                    onMouseOver={({ activeStartDate, date, view }) => {
                      if (view === 'month' && date) {
                        handleDayHover(date, window.event);
                      }
                    }}
                    onMouseOut={handleDayLeave}
                  />
                  {calendarTooltip.show && (
                    <div
                      className="absolute z-50 px-3 py-2 bg-white border border-purple-200 rounded-xl shadow-lg text-sm text-purple-700"
                      style={{ left: calendarTooltip.x - 220, top: calendarTooltip.y - 120 }}
                    >
                      {calendarTooltip.text}
                    </div>
                  )}
                </div>
                {/* Thêm nút xác nhận lựa chọn ngày */}
                <div className="flex gap-4 mt-6 justify-center">
                  <button
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow hover:scale-105 transition-all text-base"
                    onClick={handleAddGroup}
                  >{selectMode === 'multi' ? 'Thêm ngày lẻ' : 'Thêm dải ngày'}</button>
                  <button
                    className="px-5 py-2 rounded-full bg-gray-200 text-gray-700 font-bold shadow hover:bg-gray-300 transition-all text-base"
                    onClick={handleClearGroups}
                  >Xóa tất cả</button>
                  <button
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold shadow hover:scale-105 transition-all text-base"
                    onClick={() => setShowCalendar(false)}
                  >Xác nhận</button>
                </div>
                {selectedGroups.length > 0 && (
                  <div className="mt-6 flex flex-col gap-2">
                    <span className="font-bold text-purple-700 text-base">Đã chọn:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroups.map((group, idx) => (
                        <span key={idx} className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold shadow text-base ${group.type === 'single' ? 'bg-gradient-to-r from-purple-400 to-blue-200' : 'bg-gradient-to-r from-purple-200 to-blue-100'}`}>
                          {group.type === 'single' ? (
                            <span className="w-3 h-3 rounded-full bg-purple-700 inline-block" />
                          ) : (
                            <span className="px-2 py-1 rounded-full bg-purple-300 text-purple-900 font-bold">{group.days[0].toLocaleDateString()}–{group.days[1].toLocaleDateString()}</span>
                          )}
                          {group.type === 'single' ? group.days[0].toLocaleDateString() : ''}
                          <button onClick={() => handleRemoveGroup(idx)} className="ml-1 text-red-500 hover:text-red-700"><FaTrash /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {selectedDates.length > 0 && (
          <div className="w-full flex flex-col gap-8">
            <span className="font-bold text-purple-700 text-xl tracking-wide uppercase">CA LÀM</span>
            <div className="flex flex-col gap-6">
              {selectedDates.map((date, idx) => (
                <div key={date.toDateString() + '-' + idx} className="rounded-2xl bg-white shadow p-4 flex flex-col gap-2 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-purple-700 text-lg">Ngày {date.toLocaleDateString()}</span>
                    {status[date.toDateString()] && (
                      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-100`}>
                        <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status[date.toDateString()]]} inline-block`} />
                        {STATUS_LABELS[status[date.toDateString()]].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    {CA_OPTIONS.map(opt => {
                      const selected = schedule[date.toDateString()]?.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleCaChange(date, opt.value)}
                          className={`flex items-center gap-1 px-5 py-3 rounded-full border transition-all duration-150 text-lg font-bold shadow-sm focus:outline-none tracking-wide ${selected ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-700 scale-105' : 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:scale-105'}`}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="w-full flex flex-col gap-4">
          <span className="font-bold text-purple-700 text-xl tracking-wide uppercase">GHI CHÚ (NẾU CÓ)</span>
          <textarea
            className="w-full mt-2 p-4 border rounded-2xl shadow focus:outline-none focus:ring-2 focus:ring-purple-300 text-lg bg-white"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Nhập ghi chú cho quản lý..."
          />
        </div>
        <div className="flex w-full justify-end gap-4 mt-4">
          <button className="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-bold shadow hover:bg-gray-300 transition-all text-lg" onClick={handleSaveDraft}>Lưu nháp</button>
          <button className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-700 text-white font-extrabold shadow-xl hover:scale-105 hover:from-purple-600 hover:to-blue-800 transition-all text-xl" onClick={handleSubmit}>Xác nhận</button>
        </div>
        {showConfirmPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.25)] backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border-2 border-blue-200 max-w-md w-full flex flex-col items-center">
              <h3 className="text-2xl font-bold text-blue-700 mb-4 text-center">Bạn chắc chắn về lựa chọn đăng ký ca làm chứ?</h3>
              <div className="flex gap-6 mt-4">
                <button
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold shadow hover:scale-105 transition-all text-lg"
                  onClick={handleConfirmSend}
                >Chắc chắn</button>
                <button
                  className="px-6 py-3 rounded-full bg-gray-100 text-gray-700 font-bold shadow hover:bg-gray-300 transition-all text-lg"
                  onClick={() => setShowConfirmPopup(false)}
                >Hủy</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
