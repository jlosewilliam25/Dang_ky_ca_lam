"use client";
import { useState, useRef, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FaSun, FaCloudSun, FaMoon, FaTrash, FaCalendarAlt, FaCheckCircle, FaHourglassHalf, FaTimesCircle } from 'react-icons/fa';
import { Toaster, toast } from 'react-hot-toast';

// --- Cập nhật CA_OPTIONS để chứa thông tin giờ và icon lớn hơn ---
const CA_OPTIONS = [
    { value: 'sang', label: 'Ca sáng', time: '(07:00 - 11:00)', icon: <FaSun className="text-2xl" /> },
    { value: 'chieu', label: 'Ca chiều', time: '(13:00 - 17:00)', icon: <FaCloudSun className="text-2xl" /> },
    { value: 'toi', label: 'Ca tối', time: '(18:00 - 22:00)', icon: <FaMoon className="text-2xl" /> },
];

const STATUS_COLORS = {
    approved: 'bg-green-500',
    pending: 'bg-yellow-400',
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
    // --- KHAI BÁO STATE ---
    const [schedule, setSchedule] = useState({}); // { [dateString]: ['sang', 'chieu'] }
    const [status, setStatus] = useState({}); // { [dateString]: 'draft' | 'pending' | ... }
    const [note, setNote] = useState('');
    const [halfShift, setHalfShift] = useState({}); // { [dateString]: { [ca]: { half: boolean, part: 'first'|'second'|null } } }
    const [selectedGroups, setSelectedGroups] = useState([]); // [{type: 'single', days: [Date]}, {type: 'range', days: [Date, Date]}]
    const [tempRange, setTempRange] = useState([null, null]);
    const [selectMode, setSelectMode] = useState('multi'); // 'multi' hoặc 'range'
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarTooltip, setCalendarTooltip] = useState({ show: false, x: 0, y: 0, text: '' });
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);
    const calendarRef = useRef(null);

    // --- DỮ LIỆU DEMO (thay bằng dữ liệu thực tế) ---
    const totalCa = 20;
    const approved = 4;
    const pending = 2;
    const rejected = 1;
    const registered = approved + pending + rejected;
    const progress = totalCa > 0 ? Math.round((registered / totalCa) * 100) : 0;

    // --- LOGIC TÍNH TOÁN ---
    const selectedDates = useMemo(() => {
        const dates = new Set();
        selectedGroups.forEach(group => {
            if (group.type === 'single') {
                dates.add(group.days[0].toDateString());
            } else if (group.type === 'range') {
                let currentDate = new Date(group.days[0]);
                while (currentDate <= group.days[1]) {
                    dates.add(currentDate.toDateString());
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        });
        return Array.from(dates).map(dateStr => new Date(dateStr)).sort((a, b) => a - b);
    }, [selectedGroups]);


    // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---

    const handleDateChange = (date) => {
        if (selectMode === 'multi') {
            setTempRange([date, null]);
        } else {
            const [start] = tempRange;
            if (start && !tempRange[1]) {
                setTempRange([start, date].sort((a, b) => a - b));
            } else {
                setTempRange([date, null]);
            }
        }
    };

    const handleAddGroup = () => {
        if (selectMode === 'multi' && tempRange[0]) {
            const newGroup = { type: 'single', days: [tempRange[0]] };
            if (!selectedGroups.some(g => g.type === 'single' && g.days[0].getTime() === newGroup.days[0].getTime())) {
                setSelectedGroups(prev => [...prev, newGroup]);
            }
            setTempRange([null, null]);
        } else if (selectMode === 'range' && tempRange[0] && tempRange[1]) {
            setSelectedGroups(prev => [...prev, { type: 'range', days: tempRange }]);
            setTempRange([null, null]);
        }
    };

    const handleClearGroups = () => {
        setSelectedGroups([]);
        setTempRange([null, null]);
    };

    const handleRemoveGroup = (index) => {
        setSelectedGroups(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleDayHover = (date, e) => {
        const key = date.toDateString();
        const cas = schedule[key] || [];
        let text = cas.length > 0
            ? 'Đã đăng ký: ' + cas.map(ca => CA_OPTIONS.find(opt => opt.value === ca)?.label).join(', ')
            : 'Chưa đăng ký ca';
        setCalendarTooltip({ show: true, x: e.clientX, y: e.clientY, text });
    };

    const handleDayLeave = () => setCalendarTooltip({ show: false, x: 0, y: 0, text: '' });

    const handleCaChange = (date, ca) => {
        const key = date.toDateString();
        setSchedule(prev => {
            const prevCas = prev[key] || [];
            const newCas = prevCas.includes(ca) ? prevCas.filter(c => c !== ca) : [...prevCas, ca];
            if (newCas.length === 0) {
                const { [key]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [key]: newCas };
        });
        setStatus(prev => ({ ...prev, [key]: 'draft' }));
        if (!schedule[key]?.includes(ca)) {
            setHalfShift(prev => {
                const day = { ...(prev[key] || {}) };
                if (day[ca]) delete day[ca];
                return { ...prev, [key]: day };
            });
        }
    };

    const handleHalfToggle = (date, ca) => {
        const key = date.toDateString();
        setHalfShift(prev => {
            const day = { ...(prev[key] || {}) };
            if (!day[ca]) {
                day[ca] = { half: true, part: 'first' };
            } else {
                day[ca].half = !day[ca].half;
            }
            if (!day[ca].half) day[ca].part = null;
            return { ...prev, [key]: day };
        });
    };

    const handleHalfPart = (date, ca, part) => {
        const key = date.toDateString();
        setHalfShift(prev => {
            const day = { ...(prev[key] || {}) };
            if (!day[ca]) {
                day[ca] = { half: true, part };
            } else {
                day[ca].part = part;
            }
            return { ...prev, [key]: day };
        });
    };

    const handleSaveDraft = () => {
        toast('Đã lưu nháp!', { icon: '📝', style: { background: '#faf5ff', color: '#6d28d9' } });
    };

    const handleSubmit = async () => {
        setShowConfirmPopup(true);
    };

    const handleConfirmSend = async () => {
        const filteredSchedule = Object.fromEntries(
            Object.entries(schedule).filter(([, cas]) => cas.length > 0)
        );

        if (Object.keys(filteredSchedule).length === 0) {
             toast.error('Bạn chưa đăng ký ca nào!', { style: { background: '#fff0f0', color: '#b91c1c' } });
             setShowConfirmPopup(false);
             return;
        }

        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule: filteredSchedule, note, halfShift }),
        });

        setShowConfirmPopup(false);
        if (res.ok) {
            toast.success('Gửi đăng ký thành công!', { style: { background: '#faf5ff', color: '#6d28d9' } });
        } else {
            toast.error('Gửi thất bại!', { style: { background: '#fff0f0', color: '#b91c1c' } });
        }
    };


    // --- PHẦN JSX RENDER ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-purple-50 flex flex-col items-center py-8 px-2" style={{ fontFamily: 'Inter, Calibri, Arial, sans-serif' }}>
            <Toaster position="top-right" />
            
            <div className="w-full max-w-2xl flex flex-col items-center mb-6">
                <div className="flex items-center gap-3">
                    <FaCalendarAlt className="text-5xl text-purple-600 drop-shadow" />
                    <h1 className="text-4xl sm:text-5xl font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-blue-700 tracking-wide">
                        ĐĂNG KÝ CA LÀM
                    </h1>
                </div>
                <div className="w-32 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mt-2 mb-2" />
            </div>

            <div className="w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col items-center gap-8 border border-purple-100 relative">
                <FaCalendarAlt className="absolute text-[180px] text-purple-100 opacity-20 left-[-40px] top-[-40px] pointer-events-none select-none" />
                
                <div className="w-full flex flex-col items-center gap-6">
                    <span className="text-2xl font-bold text-purple-700 tracking-wide px-6 py-2 rounded-full bg-purple-100 shadow">
                        TỔNG CA: {totalCa}
                    </span>
                    <div className="flex gap-4 sm:gap-6 justify-center items-center w-full">
                        <div className="flex flex-col items-center bg-green-50 rounded-xl px-4 py-2 shadow-sm border border-green-100">
                            <FaCheckCircle className="text-green-500 text-xl mb-1" />
                            <span className="font-bold text-green-700 text-lg">{approved}</span>
                            <span className="text-xs text-green-700">Đã duyệt</span>
                        </div>
                        <div className="flex flex-col items-center bg-yellow-50 rounded-xl px-4 py-2 shadow-sm border border-yellow-100">
                            <FaHourglassHalf className="text-yellow-500 text-xl mb-1" />
                            <span className="font-bold text-yellow-700 text-lg">{pending}</span>
                            <span className="text-xs text-yellow-700">Chờ duyệt</span>
                        </div>
                        <div className="flex flex-col items-center bg-red-50 rounded-xl px-4 py-2 shadow-sm border border-red-100">
                            <FaTimesCircle className="text-red-500 text-xl mb-1" />
                            <span className="font-bold text-red-700 text-lg">{rejected}</span>
                            <span className="text-xs text-red-700">Từ chối</span>
                        </div>
                    </div>
                </div>

                <div className="w-full flex flex-col items-center gap-2">
                    <div className="w-full max-w-md bg-gray-200 rounded-full h-5">
                        <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm font-semibold text-purple-700 mt-1">
                        {registered}/{totalCa} ca đã đăng ký
                    </span>
                </div>

                <div className="w-full flex flex-col gap-4 items-center">
                    <span className="font-bold text-purple-700 text-xl tracking-wide uppercase">NGÀY ĐĂNG KÝ</span>
                    <button
                        className="w-full sm:w-fit px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow-lg hover:scale-105 hover:from-purple-600 hover:to-blue-700 transition-all text-lg"
                        onClick={() => setShowCalendar(true)}
                    >
                        CHỌN NGÀY
                    </button>
                </div>
                
                {showCalendar && (
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.35)] backdrop-blur-md">
                        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 relative w-full max-w-lg border-2 border-purple-400">
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
                                    value={selectMode === 'range' ? tempRange : (tempRange[0] ? [tempRange[0]] : null)}
                                    selectRange={selectMode === 'range'}
                                    tileDisabled={({ date }) => date.getDay() === 0}
                                    tileClassName={({ date }) => {
                                        const dateStr = date.toDateString();
                                        const isSingle = selectedGroups.some(g => g.type === 'single' && g.days[0].toDateString() === dateStr);
                                        const isRange = selectedGroups.some(g => g.type === 'range' && g.days[0] <= date && date <= g.days[1]);
                                        const isTempSingle = selectMode === 'multi' && tempRange[0] && tempRange[0].toDateString() === dateStr;
                                        const isTempRange = selectMode === 'range' && tempRange[0] && tempRange[1] && tempRange[0] <= date && date <= tempRange[1];
                                        let base = 'rounded-xl border border-transparent';
                                        if (isSingle || isTempSingle) base += ' bg-gradient-to-r from-purple-400 to-blue-300 !text-white border-2 border-purple-600 scale-105 shadow-md';
                                        else if (isRange || isTempRange) base += ' bg-gradient-to-r from-purple-200 to-blue-100 border-2 border-purple-400 shadow-md';
                                        return base;
                                    }}
                                    formatShortWeekday={(locale, date) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]}
                                    onMouseOver={({ date, view }, event) => view === 'month' && handleDayHover(date, event)}
                                    onMouseLeave={handleDayLeave}
                                />
                                {calendarTooltip.show && (
                                    <div
                                        className="absolute z-50 px-3 py-2 bg-white border border-purple-200 rounded-xl shadow-lg text-sm text-purple-700 pointer-events-none"
                                        style={{ transform: `translate(${calendarTooltip.x}px, ${calendarTooltip.y}px)` }}
                                    >
                                        {calendarTooltip.text}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 mt-6 justify-center">
                                <button
                                    className="px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shadow hover:scale-105 transition-all text-base"
                                    onClick={handleAddGroup}
                                >{selectMode === 'multi' ? 'Thêm ngày' : 'Thêm dải'}</button>
                                <button
                                    className="px-5 py-2 rounded-full bg-gray-200 text-gray-700 font-bold shadow hover:bg-gray-300 transition-all text-base"
                                    onClick={handleClearGroups}
                                >Xóa tất cả</button>
                                <button
                                    className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold shadow hover:scale-105 transition-all text-base"
                                    onClick={() => setShowCalendar(false)}
                                >Xác nhận</button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* === PHẦN HIỂN THỊ CA LÀM (ĐÃ CẬP NHẬT THEO YÊU CẦU MỚI) === */}
                {selectedDates.length > 0 && (
                    <div className="w-full flex flex-col gap-6">
                        <span className="font-bold text-purple-700 text-xl tracking-wide uppercase text-center">CA LÀM ĐÃ CHỌN</span>
                        {/* Grid layout for selected day boxes */}
                        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedDates.map(date => (
                                // Box for each selected day
                                <div key={date.toDateString()} className="flex flex-col gap-4 rounded-2xl border border-purple-200 bg-white/80 p-4 shadow-md transition-all hover:shadow-lg">
                                    <h3 className="font-bold text-purple-800 text-lg text-center border-b border-purple-200 pb-2">
                                        {date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </h3>
                                    {/* Container for shift cards within a day */}
                                    <div className="flex flex-col gap-4">
                                        {CA_OPTIONS.map(opt => {
                                            const key = date.toDateString();
                                            const selected = schedule[key]?.includes(opt.value);
                                            const half = halfShift[key]?.[opt.value]?.half;
                                            const part = halfShift[key]?.[opt.value]?.part;
                                            return (
                                                // Re-using the well-designed shift card from previous version
                                                <div
                                                    key={opt.value}
                                                    onClick={() => handleCaChange(date, opt.value)}
                                                    className={`
                                                        p-4 rounded-2xl border-2 shadow-lg cursor-pointer transition-all duration-300
                                                        flex flex-col gap-3 justify-between
                                                        ${selected
                                                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-400 scale-105'
                                                            : 'bg-white/90 border-purple-100 hover:border-purple-300 hover:scale-[1.02] hover:shadow-xl'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-lg">{opt.label}</span>
                                                            <span className={`text-sm ${selected ? 'text-purple-200' : 'text-gray-500'}`}>{opt.time}</span>
                                                        </div>
                                                        <div className={`${selected ? 'text-white' : 'text-purple-500'}`}>{opt.icon}</div>
                                                    </div>
                                                    {selected && (
                                                        <div className="border-t-2 border-purple-400/50 pt-3 mt-auto flex flex-col gap-3">
                                                            <label className="flex items-center gap-2 text-base font-medium cursor-pointer w-fit">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={half || false}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handleHalfToggle(date, opt.value);
                                                                    }}
                                                                    className="w-5 h-5 accent-yellow-400 rounded"
                                                                />
                                                                <span>Nửa ca</span>
                                                            </label>
                                                            {half && (
                                                                <div className="flex gap-x-4 gap-y-1 flex-wrap pl-1">
                                                                    <label className="flex items-center gap-1 text-sm font-medium cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`half-part-${key}-${opt.value}`}
                                                                            checked={part === 'first'}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                handleHalfPart(date, opt.value, 'first');
                                                                            }}
                                                                            className="accent-yellow-400"
                                                                        />
                                                                        <span>Nửa đầu</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-1 text-sm font-medium cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`half-part-${key}-${opt.value}`}
                                                                            checked={part === 'second'}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                handleHalfPart(date, opt.value, 'second');
                                                                            }}
                                                                            className="accent-yellow-400"
                                                                        />
                                                                        <span>Nửa sau</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
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
                        className="w-full mt-1 p-4 border border-purple-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300 text-lg bg-white"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Nhập ghi chú cho quản lý..."
                        rows={3}
                    />
                </div>
                
                <div className="flex w-full justify-end gap-4 mt-4">
                    <button className="px-6 py-3 rounded-full bg-gray-200 text-gray-700 font-bold shadow hover:bg-gray-300 transition-all text-lg" onClick={handleSaveDraft}>Lưu nháp</button>
                    <button className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-700 text-white font-extrabold shadow-xl hover:scale-105 hover:from-purple-600 hover:to-blue-800 transition-all text-xl" onClick={handleSubmit}>Xác nhận</button>
                </div>

                {showConfirmPopup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.25)] backdrop-blur-md">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 border-2 border-blue-200 max-w-md w-full flex flex-col items-center">
                            <h3 className="text-2xl font-bold text-blue-700 mb-4 text-center">Bạn chắc chắn muốn gửi đăng ký ca làm đã chọn?</h3>
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
