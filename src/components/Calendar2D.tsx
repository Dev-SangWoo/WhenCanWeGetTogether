'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import styles from './Calendar2D.module.css';

type AvailabilityType = 'unavailable' | 'tentative';

interface Block {
  id: string;
  position: [number, number]; // [YYYYMMDD, typeIndex]
  userId: string;
  nickname: string;
}

interface Participant {
  id: string;
  nickname: string;
}

const TYPE_MAP: Record<AvailabilityType, number> = { 'unavailable': 1, 'tentative': 2 };

export default function Calendar2D({ roomId, onMetaLoad, onParticipantsUpdate }: { 
  roomId: string, 
  onMetaLoad?: (meta: { title: string, description: string }) => void,
  onParticipantsUpdate?: (participants: Participant[]) => void
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectionMode, setSelectionMode] = useState<AvailabilityType>('unavailable');
  
  const myId = useRef('');
  const myNickname = useRef('');

  useEffect(() => {
    myId.current = localStorage.getItem('userId') || Math.random().toString(36).substr(2, 9);
    myNickname.current = localStorage.getItem('nickname') || '게스트';
    localStorage.setItem('userId', myId.current);

    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const password = urlParams.get('pw');
      socket.emit('join-room', { 
        roomId, 
        nickname: myNickname.current, 
        password,
        userId: myId.current 
      });
    });

    socket.on('join-error', (msg: string) => {
      alert(msg);
      window.location.href = '/';
    });

    socket.on('room-meta', (meta: { title: string, description: string }) => {
      if (onMetaLoad) onMetaLoad(meta);
    });

    socket.on('participants-update', (userList: Participant[]) => {
      setParticipants(userList);
      if (onParticipantsUpdate) onParticipantsUpdate(userList);
    });

    socket.on('init-blocks', (allBlocks: Block[]) => {
      setBlocks(allBlocks);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, onMetaLoad, onParticipantsUpdate]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }, []);

  const handleUpdate = (dateKeys: number[], isRemoval: boolean = false) => {
    // 오늘 이후의 날짜만 필터링
    const validKeys = dateKeys.filter(dk => dk >= todayKey);
    if (validKeys.length === 0) return;

    const typeIndex = TYPE_MAP[selectionMode];
    const newBlocks: Block[] = validKeys.map(dk => ({
      id: `${myId.current}-${dk}`,
      position: [dk, typeIndex],
      userId: myId.current,
      nickname: myNickname.current
    }));

    if (socketRef.current) {
      socketRef.current.emit('update-blocks', { roomId, blocks: newBlocks, isRemoval });
    }
  };

  const handleDateClick = (dateKey: number) => {
    if (dateKey < todayKey) return; // 과거 날짜 클릭 방지

    const typeIndex = TYPE_MAP[selectionMode];
    const existing = blocks.find(b => b.position[0] === dateKey && b.userId === myId.current);
    const isRemoval = existing && existing.position[1] === typeIndex;
    handleUpdate([dateKey], isRemoval);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) days.push({ day: prevMonthDays - i, monthOffset: -1, currentMonth: false });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, monthOffset: 0, currentMonth: true });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, monthOffset: 1, currentMonth: false });
    return days;
  }, [currentDate, firstDayOfMonth, daysInMonth, prevMonthDays]);

  const getDateKey = (day: number, monthOffset: number) => {
    const d = new Date(year, month + monthOffset, day);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  };

  const commonDays = useMemo(() => {
    const results = new Set<number>();
    calendarDays.forEach(d => {
      const dk = getDateKey(d.day, d.monthOffset);
      const dayBlocks = blocks.filter(b => b.position[0] === dk);
      const isAnyoneProblematic = dayBlocks.some(b => b.position[1] === 1 || b.position[1] === 2);
      if (!isAnyoneProblematic) results.add(dk);
    });
    return results;
  }, [blocks, calendarDays]);

  const weekRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.monthTitle}>
            {year}년 {month + 1}월
          </div>
          <div className={styles.crownLegend}>
            <span className={styles.crownLabel}>👑 왕관:</span> 모든 참가자 가능!
          </div>
        </div>
        <div className={styles.navBtns}>
          <div className={styles.modeSelector}>
            <button 
              className={`${styles.modeBtn} ${selectionMode === 'unavailable' ? styles.active + ' ' + styles.unavailable : ''}`} 
              onClick={() => setSelectionMode('unavailable')}
            >
              <span className={styles.dot} /> 불가능
            </button>
            <button 
              className={`${styles.modeBtn} ${selectionMode === 'tentative' ? styles.active + ' ' + styles.tentative : ''}`} 
              onClick={() => setSelectionMode('tentative')}
            >
              <span className={styles.dot} /> 미정
            </button>
          </div>
          <div className={styles.navigation}>
            <button className={styles.navBtn} onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>이전</button>
            <button className={styles.navBtn} onClick={() => setCurrentDate(new Date())}>오늘</button>
            <button className={styles.navBtn} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>다음</button>
          </div>
        </div>
      </div>

      <div className={styles.dayNames}>
        <div className={styles.selectorPlaceholder} /> 
        {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className={styles.daysGrid}>
        {weekRows.map((week, wIdx) => (
          <React.Fragment key={wIdx}>
            <div 
              className={styles.weekSelector} 
              onClick={() => {
                const weekKeys = week.map(d => getDateKey(d.day, d.monthOffset));
                const validKeys = weekKeys.filter(dk => dk >= todayKey);
                const typeIndex = TYPE_MAP[selectionMode];
                
                // 해당 주의 유효한 날짜들이 모두 현재 모드로 선택되어 있는지 확인
                const allSelected = validKeys.length > 0 && validKeys.every(dk => 
                  blocks.some(b => b.position[0] === dk && b.userId === myId.current && b.position[1] === typeIndex)
                );
                
                handleUpdate(weekKeys, allSelected);
              }}
              title="한 주 전체 선택"
            >
              →
            </div>
            {week.map((d, i) => {
              const dk = getDateKey(d.day, d.monthOffset);
              const dayBlocks = blocks.filter(b => b.position[0] === dk);
              const myDayBlocks = dayBlocks.filter(b => b.userId === myId.current);
              const unUsers = dayBlocks.filter(b => b.position[1] === 1).map(b => b.nickname);
              const teUsers = dayBlocks.filter(b => b.position[1] === 2).map(b => b.nickname);

              return (
                <div 
                  key={i} 
                  className={`
                    ${styles.dayCell} 
                    ${!d.currentMonth ? styles.otherMonth : ''} 
                    ${dk < todayKey ? styles.isPast : ''}
                    ${commonDays.has(dk) && dk >= todayKey ? styles.cellAvailable : unUsers.length > 0 ? styles.cellUnavailable : teUsers.length > 0 ? styles.cellTentative : ''}
                  `} 
                  onClick={() => handleDateClick(dk)}
                >
                  <div className={styles.cellHeader}>
                    <div className={styles.dayNumber}>{d.day}</div>
                    {commonDays.has(dk) && dk >= todayKey && (
                      <div className={styles.crownWrapper}>
                        <span className={styles.crownIcon}>👑</span>
                        <span className={styles.crownText}>모두 가능!</span>
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.nameList}>
                    {unUsers.map((name, idx) => (
                      <div key={`un-${idx}`} className={`${styles.nameTag} ${styles.nameTagUn}`}>
                        {name}
                      </div>
                    ))}
                    {teUsers.map((name, idx) => (
                      <div key={`te-${idx}`} className={`${styles.nameTag} ${styles.nameTagTe}`}>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
