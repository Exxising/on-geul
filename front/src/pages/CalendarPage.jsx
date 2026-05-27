import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCalendarEvents, getDocuments } from '../api/documents';
import { useToast } from '../hooks/useToast';

const CalendarPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 18)); // May 2026
  const [events, setEvents] = useState([]);
  const [selectedDateStr, setSelectedDateStr] = useState('2026-05-20');
  const [pendingItems, setPendingItems] = useState([]);
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'drag'
  const [isDraggingScheduled, setIsDraggingScheduled] = useState(false);

  useEffect(() => {
    // Load persisted calendar events
    const loadedEvents = getCalendarEvents();
    setEvents(loadedEvents);

    // Fetch all action items from documents
    const fetchPendingActionItems = async () => {
      try {
        const docs = await getDocuments();
        const allItems = [];
        docs.forEach((doc) => {
          if (doc.actionItems) {
            doc.actionItems.forEach((item) => {
              allItems.push({
                ...item,
                docTitle: doc.title,
                docId: doc.id
              });
            });
          }
        });
        setPendingItems(allItems);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPendingActionItems();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(new Date(year, month, d));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateStr = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventsForDate = (dateStr) => {
    return events.filter(e => e.date === dateStr);
  };

  const selectedEvents = getEventsForDate(selectedDateStr);

  // Delete/unschedule event
  const handleDeleteEvent = (eventId, silent = false) => {
    const updatedEvents = events.filter(ev => ev.id !== eventId);
    setEvents(updatedEvents);
    localStorage.setItem('ongle_calendar_events', JSON.stringify(updatedEvents));
    if (!silent) {
      showToast('일정이 취소되어 다시 대기 리스트로 반환되었습니다.', 'info');
    }
  };

  // HTML5 Drag and Drop handlers
  const handleDragStartPending = (e, item) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ ...item, source: 'pending' }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartScheduled = (e, evObj) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ ...evObj, source: 'scheduled' }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingScheduled(true);
  };

  const handleDragEndScheduled = () => {
    setIsDraggingScheduled(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnDay = (e, dateStr) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (!data || !data.title) return;

      const updatedEvents = [...events];
      const existingIdx = updatedEvents.findIndex(ev => ev.title === data.title);

      if (data.source === 'scheduled') {
        // Move/Reschedule existing scheduled event
        if (existingIdx > -1) {
          updatedEvents[existingIdx].date = dateStr;
        }
        setEvents(updatedEvents);
        localStorage.setItem('ongle_calendar_events', JSON.stringify(updatedEvents));
        showToast(`일정이 ${dateStr}로 변경되었습니다.`, 'success');
      } else {
        // Add new from pending
        if (existingIdx > -1) {
          updatedEvents[existingIdx].date = dateStr;
        } else {
          updatedEvents.push({
            id: `ev-${Date.now()}`,
            title: data.title,
            assignee: data.assignee || '미지정',
            date: dateStr,
            docTitle: data.docTitle || '수동 드래그 등록',
            docId: data.docId
          });
        }
        setEvents(updatedEvents);
        localStorage.setItem('ongle_calendar_events', JSON.stringify(updatedEvents));
        showToast(`'${data.title}' 일정이 ${dateStr}로 정상 등록되었습니다.`, 'success');
      }

      setSelectedDateStr(dateStr);
      setIsDraggingScheduled(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Dropzone on right sidebar to unschedule/cancel events
  const handleDropOnCancelZone = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.source === 'scheduled') {
        handleDeleteEvent(data.id);
      }
      setIsDraggingScheduled(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="max-w-[1100px] mx-auto px-6 pt-12 pb-24 md:py-16 flex flex-col gap-6">
      {/* Header */}
      <section className="space-y-4">
        <h1 className="font-display text-display text-on-surface">Calendar Planner</h1>
        <p className="font-body-md text-body-md text-secondary">
          액션 아이템을 달력 칸으로 드래그하여 일정을 등록하거나, 달력 속 일정을 우측 사이드바로 드래그 앤 드롭하여 간편하게 취소해 보세요.
        </p>
      </section>

      {/* Main Planner Grid */}
      <div className="flex flex-col lg:flex-row border border-outline-variant rounded bg-surface-container-lowest overflow-hidden min-h-[560px]">
        
        {/* Left Side: Monthly Calendar Grid */}
        <div className="flex-grow p-6 flex flex-col gap-4">
          {/* Calendar Navigation */}
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <h3 className="font-headline-md text-headline-md font-extrabold text-on-surface">
              {year}년 {month + 1}월
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button
                onClick={handleNextMonth}
                className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-label-md text-label-md text-secondary border-b border-outline-variant/40 pb-2">
            <span className="text-error">일</span>
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span>토</span>
          </div>

          {/* Month Blocks */}
          <div className="grid grid-cols-7 gap-2 flex-grow min-h-[350px]">
            {daysArray.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={`empty-${idx}`} className="bg-transparent border border-transparent rounded"></div>;
              }

              const dateStr = formatDateStr(dateObj);
              const isSelected = dateStr === selectedDateStr;
              const dateEvents = getEventsForDate(dateStr);
              const hasEvents = dateEvents.length > 0;
              const dayNum = dateObj.getDate();
              const isSunday = dateObj.getDay() === 0;

              return (
                <div
                  key={`day-${dateStr}`}
                  onClick={() => setSelectedDateStr(dateStr)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnDay(e, dateStr)}
                  className={`border p-2 rounded min-h-[72px] flex flex-col justify-between cursor-pointer transition-all duration-150 relative group ${
                    isSelected
                      ? 'border-primary bg-[#eaf1eb]'
                      : 'border-outline-variant bg-surface hover:bg-surface-container-low hover:border-primary/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-label-md text-xs ${isSunday ? 'text-error' : 'text-on-surface'}`}>
                      {dayNum}
                    </span>
                    <span className="material-symbols-outlined text-[12px] text-primary opacity-0 group-hover:opacity-40 transition-opacity">
                      download
                    </span>
                  </div>
                  
                  {/* Scheduled Event Chips (DRAGGABLE OUT OF CALENDAR!) */}
                  {hasEvents && (
                    <div className="flex flex-col gap-1 mt-1 max-w-full">
                      {dateEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={(e) => handleDragStartScheduled(e, ev)}
                          onDragEnd={handleDragEndScheduled}
                          className="px-1 py-0.5 bg-primary text-white text-[9px] rounded font-caption truncate max-w-full cursor-grab active:cursor-grabbing hover:bg-opacity-90 hover:scale-95 transition-all"
                          title={`${ev.title} (드래그하여 일정 변경 또는 사이드바에 드롭하여 취소)`}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dateEvents.length > 2 && (
                        <span className="text-[9px] text-secondary font-caption font-bold ml-1">
                          외 {dateEvents.length - 2}건 더 있음
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side Panel: Interactive Planner */}
        <div className="w-full lg:w-[350px] border-t lg:border-t-0 lg:border-l border-outline-variant bg-surface flex flex-col min-h-[300px]">
          {/* Slack / Calendar Connect Buttons */}
          <div className="p-3 border-b border-outline-variant flex items-center justify-end gap-2">
            <button
              onClick={() => {
                const SLACK_CLIENT = import.meta.env.VITE_SLACK_CLIENT_ID;
                const REDIRECT = import.meta.env.VITE_SLACK_REDIRECT_URI || `${window.location.origin}/auth/slack/callback`;
                if (!SLACK_CLIENT) {
                  showToast('VITE_SLACK_CLIENT_ID 환경변수를 설정하세요.', 'error');
                  return;
                }
                const scopes = encodeURIComponent('identity.basic,identity.email,users:read');
                const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT}&scope=${scopes}&redirect_uri=${encodeURIComponent(REDIRECT)}`;
                window.location.href = url;
              }}
              className="px-3 py-1.5 rounded border border-outline-variant text-label-md font-label-md hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              슬랙 연결
            </button>
          </div>
          {/* Tab Header */}
          <div className="flex border-b border-outline-variant bg-surface-container-low">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-3 text-center font-label-md text-xs font-bold border-b-2 transition-all ${
                activeTab === 'events'
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              선택일정 ({selectedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('drag')}
              className={`flex-1 py-3 text-center font-label-md text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1 ${
                activeTab === 'drag'
                  ? 'border-primary text-primary bg-surface'
                  : 'border-transparent text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">drag_indicator</span>
              액션 플래너 ({pendingItems.length})
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 flex flex-col justify-between">
            <div>
              {/* Tab 1: Selected Date Events List */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  <div className="text-xs text-secondary font-bold flex items-center gap-1 mb-2">
                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                    {selectedDateStr} 일정 내역
                  </div>
                  {selectedEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 border border-outline-variant bg-surface-container-lowest rounded hover:border-primary transition-all duration-150 flex flex-col gap-2 relative group/card"
                        >
                          {/* Close/Delete Button */}
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-error/10 text-secondary hover:text-error transition"
                            title="일정 삭제"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>

                          <div>
                            <h4 className="font-body-md text-sm font-bold text-on-surface leading-snug pr-6 break-all">
                              {ev.title}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 pt-1.5">
                              <span className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-caption border border-outline-variant text-secondary flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">person</span>
                                담당: {ev.assignee}
                              </span>
                            </div>
                          </div>
                          {ev.docId && (
                            <button
                              onClick={() => navigate(`/result/${ev.docId}`)}
                              className="mt-1 text-[10px] font-caption text-primary hover:underline flex items-center gap-1 self-start border-t border-outline-variant/40 pt-2 w-full text-left"
                            >
                              <span className="material-symbols-outlined text-[11px]">description</span>
                              출처: {ev.docTitle}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 text-secondary gap-3">
                      <span className="material-symbols-outlined text-4xl text-outline-variant">
                        event_busy
                      </span>
                      <p className="font-body-md text-sm">등록된 일정이 없습니다.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Drag and Drop Action Planner */}
              {activeTab === 'drag' && (
                <div className="space-y-4">
                  <div className="text-xs text-secondary font-bold leading-normal mb-2 bg-[#f4f7f4] p-3 rounded border border-primary/20 text-[#4f6051] flex gap-2 items-start">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0">info</span>
                    <span>아래 카드를 달력 칸으로 드래그하여 등록하거나, 달력 속 일정을 여기 사이드바 빈 공간에 던져넣어 일정을 바로 취소할 수 있습니다.</span>
                  </div>

                  {pendingItems.length > 0 ? (
                    <div className="space-y-3">
                      {pendingItems.map((item, idx) => {
                        const isScheduled = events.some((ev) => ev.title === item.title);
                        return (
                          <div
                            key={`${item.title}-${idx}`}
                            draggable
                            onDragStart={(e) => handleDragStartPending(e, item)}
                            className={`p-3 border rounded cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary transition-all duration-150 flex flex-col gap-2 relative bg-surface-container-lowest ${
                              isScheduled 
                                ? 'border-dashed border-outline-variant opacity-75' 
                                : 'border-outline-variant'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5 select-none">
                                drag_indicator
                              </span>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-body-md text-sm font-bold text-on-surface leading-snug break-words">
                                  {item.title}
                                </h4>
                                <p className="text-[10px] text-secondary font-caption mt-1 truncate">
                                  출처: {item.docTitle}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/40 mt-1">
                              <span className="px-1.5 py-0.5 bg-surface-container rounded text-[9px] font-caption text-secondary flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">person</span>
                                담당: {item.assignee || '미지정'}
                              </span>
                              
                              {isScheduled ? (
                                <span className="text-[9px] font-caption text-primary font-bold flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                  등록됨
                                </span>
                              ) : (
                                <span className="text-[9px] font-caption text-secondary flex items-center gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  일정 미지정
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 text-secondary gap-3">
                      <span className="material-symbols-outlined text-4xl text-outline-variant">
                        playlist_add_check
                      </span>
                      <p className="font-body-md text-sm">드래그할 수 있는 액션 아이템이 없습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drag Out of Calendar Trash Dropzone (Only visible when dragging a scheduled event chip!) */}
            {isDraggingScheduled && (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDropOnCancelZone}
                className="mt-6 p-6 border-2 border-dashed border-error/50 bg-error/5 text-error rounded flex flex-col items-center justify-center gap-2 animate-pulse hover:bg-error/10 hover:border-error transition-all duration-150"
              >
                <span className="material-symbols-outlined text-3xl">delete_sweep</span>
                <span className="font-label-md text-xs font-bold">여기에 떨어뜨려 일정 해제하기</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default CalendarPage;
