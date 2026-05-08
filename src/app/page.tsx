'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import NameAvatar from '@/components/NameAvatar';
import styles from './page.module.css';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [userUid, setUserUid] = useState('');
  
  const [searchRoomId, setSearchRoomId] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname');
    const savedUid = localStorage.getItem('userUid');
    
    if (savedNickname && savedUid) {
      setNickname(savedNickname);
      setUserUid(savedUid);
      setIsLoggedIn(true);
    } else {
      // Generate a random 4-digit UID if not exists
      const newUid = Math.floor(1000 + Math.random() * 9000).toString();
      setUserUid(newUid);
    }

    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('get-rooms');
    });

    socket.on('rooms-list', (roomList: any[]) => {
      setRooms(roomList);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      localStorage.setItem('nickname', nickname.trim());
      localStorage.setItem('userUid', userUid);
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nickname');
    localStorage.removeItem('userUid');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setNickname('');
    // Regenerate UID for next login attempt
    const newUid = Math.floor(1000 + Math.random() * 9000).toString();
    setUserUid(newUid);
  };

  const handleJoin = (roomId: string, hasPassword?: boolean) => {
    if (!roomId.trim()) return;
    
    if (hasPassword) {
      setPendingRoomId(roomId.trim());
      setInputPassword('');
      setShowPasswordModal(true);
    } else {
      router.push(`/room/${roomId.trim()}`);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordModal(false);
    router.push(`/room/${pendingRoomId}?pw=${encodeURIComponent(inputPassword)}`);
  };

  const createNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;
    
    const newId = Math.random().toString(36).substr(2, 6).toUpperCase();
    if (socketRef.current) {
      socketRef.current.emit('create-room', { 
        roomId: newId, 
        title: newRoomTitle, 
        description: newRoomDesc,
        password: newRoomPassword
      });
    }
    router.push(`/room/${newId}${newRoomPassword ? `?pw=${encodeURIComponent(newRoomPassword)}` : ''}`);
  };

  if (!isLoggedIn) {
    return (
      <div className={styles.container}>
        <div className={styles.glowBg} />
        <main className={styles.mainContent}>
          <div className={styles.card}>
            <div className={styles.iconCircle}>⚔️</div>
            <h1 className={styles.title}>언제모일까?</h1>
            <p className={styles.subtitle}>팀원들과의 모임 시간을 가장 스마트하고 재미있게 정해보세요.</p>
            <form onSubmit={handleLogin} className={styles.form}>
              <div className={styles.inputGroup}>
                <div className={styles.field}>
                  <label>닉네임</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="사용할 이름"
                    className={styles.input}
                    required
                  />
                </div>
              </div>
              <button type="submit" className={styles.button}>입장하기</button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashHeader}>
        <div className={styles.userInfo}>
          <NameAvatar name={nickname} />
          <div className={styles.userDetails}>
            <span className={styles.userName}>{nickname}</span>
            <span className={styles.userUid}>#{userUid}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn}>로그아웃</button>
        </div>
        
        <div className={styles.quickJoin}>
          <input
            type="text"
            value={searchRoomId}
            onChange={(e) => setSearchRoomId(e.target.value)}
            placeholder="방 코드 입력..."
            className={styles.dashInput}
          />
          <button 
            onClick={() => handleJoin(searchRoomId)} 
            className={styles.dashButton}
          >
            코드 참여
          </button>
        </div>
      </header>

      <main className={styles.dashMain}>
        <div className={styles.dashTitleRow}>
          <h2>참여 가능한 모임</h2>
          <button onClick={() => setShowCreateModal(true)} className={styles.createBtn}>
            + 새 모임 만들기
          </button>
        </div>

        <div className={styles.roomGrid}>
          {rooms.length === 0 ? (
            <div className={styles.emptyState}>
              <p>현재 활성화된 모임이 없습니다.<br/>새로운 모임을 만들어보세요!</p>
            </div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className={styles.roomSquare} onClick={() => handleJoin(room.id, room.hasPassword)}>
                <div className={styles.roomIcon}>
                  {room.hasPassword ? '🔒' : '🏰'}
                </div>
                <div className={styles.roomContent}>
                  <div className={styles.roomName}>{room.title}</div>
                  <div className={styles.roomUid}>UID: {room.id}</div>
                  {room.description && <div className={styles.roomDesc}>{room.description}</div>}
                </div>
                <div className={styles.roomAction}>참여하기 →</div>
              </div>
            ))
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>새로운 모임 생성</h2>
            <form onSubmit={createNewRoom} className={styles.modalForm}>
              <div className={styles.modalSection}>
                <label>모임 제목</label>
                <input 
                  type="text" 
                  value={newRoomTitle}
                  onChange={(e) => setNewRoomTitle(e.target.value)}
                  placeholder="예: 이번 주 팀 회식"
                  required
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalSection}>
                <label>설명 (선택사항)</label>
                <textarea 
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="모임의 목적이나 상세 내용을 적어주세요."
                  className={styles.modalTextarea}
                />
              </div>
              <div className={styles.modalSection}>
                <label>비밀번호 (선택사항)</label>
                <input 
                  type="password" 
                  value={newRoomPassword}
                  onChange={(e) => setNewRoomPassword(e.target.value)}
                  placeholder="비밀번호 설정 시 참여 시 확인합니다."
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>
                  취소
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  방 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>비밀번호 확인</h2>
            <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-dim)' }}>
              이 모임은 비밀번호가 설정되어 있습니다.
            </p>
            <form onSubmit={handlePasswordSubmit} className={styles.modalForm}>
              <div className={styles.modalSection}>
                <label>비밀번호 입력</label>
                <input 
                  type="password" 
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  autoFocus
                  className={styles.modalInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className={styles.cancelBtn}>
                  취소
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  입장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
