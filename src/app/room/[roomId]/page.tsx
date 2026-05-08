'use client';

import { useState, useEffect, use } from 'react';
import Calendar2D from "@/components/Calendar2D";
import NameAvatar from "@/components/NameAvatar";
import ChatPanel from "@/components/ChatPanel";
import styles from "./RoomPage.module.css";
import Link from 'next/link';

interface Participant {
  id: string;
  nickname: string;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const [nickname, setNickname] = useState('');
  const [userUid, setUserUid] = useState('');
  const [meta, setMeta] = useState({ title: '', description: '' });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);

  useEffect(() => {
    setNickname(localStorage.getItem('nickname') || '게스트');
    setUserUid(localStorage.getItem('userUid') || '0000');
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Link href="/" className={styles.backBtn}>
            <span className={styles.backIcon}>←</span> 대시보드로 돌아가기
          </Link>
          <div className={styles.roomInfo}>
            <span className={styles.roomTitle}>{meta.title || roomId}</span>
            <span className={styles.roomUid}>방 코드: #{roomId}</span>
          </div>
        </div>

        {meta.description && (
          <div className={styles.descriptionBox}>
            {meta.description}
          </div>
        )}
        
        <div className={styles.userInfo}>
          <div className={styles.participantBadge} onClick={() => setShowParticipants(!showParticipants)}>
            <span className={styles.badgeLabel}>현재 참가자</span>
            <div className={styles.count}>{participants.length}명</div>
            
            {showParticipants && (
              <div className={styles.participantList} onClick={e => e.stopPropagation()}>
                <div className={styles.listHeader}>참가자 목록</div>
                {participants.map(p => (
                  <div key={p.id} className={styles.participantItem}>
                    <NameAvatar name={p.nickname} size="sm" />
                    <span>{p.nickname}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.userProfile}>
            <NameAvatar name={nickname} />
            <div className={styles.userMeta}>
              <span className={styles.userName}>{nickname}</span>
              <span className={styles.userUid}>#{userUid}</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className={styles.main}>
        <div className={styles.contentLayout}>
          <div className={styles.calendarSection}>
            <Calendar2D 
              roomId={roomId} 
              onMetaLoad={setMeta} 
              onParticipantsUpdate={setParticipants}
            />
          </div>
          <aside className={styles.chatSection}>
            <ChatPanel roomId={roomId} />
          </aside>
        </div>
      </main>
    </div>
  );
}
