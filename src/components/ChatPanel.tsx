'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import NameAvatar from './NameAvatar';
import styles from './ChatPanel.module.css';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export default function ChatPanel({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    const urlParams = new URLSearchParams(window.location.search);
    const password = urlParams.get('pw');

    socket.emit('join-room', { 
      roomId, 
      nickname: localStorage.getItem('nickname') || '게스트',
      password,
      userId: localStorage.getItem('userId')
    });

    socket.on('new-message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('join-error', (msg: string) => {
      // Calendar2D already handles redirection, so we just log or ignore here
      console.error('Chat Join Error:', msg);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (socketRef.current) {
      socketRef.current.emit('send-message', { roomId, message: inputValue.trim() });
    }
    setInputValue('');
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        실시간 채팅
      </div>
      <div className={styles.messageList} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>메시지를 보내 대화를 시작해보세요!</div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={styles.messageItem}>
              <NameAvatar name={msg.sender} size="sm" />
              <div className={styles.messageContent}>
                <div className={styles.messageMeta}>
                  <span className={styles.senderName}>{msg.sender}</span>
                  <span className={styles.timestamp}>{msg.timestamp}</span>
                </div>
                <div className={styles.messageText}>{msg.text}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSend} className={styles.chatInputArea}>
        <input 
          type="text" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className={styles.chatInput}
        />
        <button type="submit" className={styles.sendBtn}>전송</button>
      </form>
    </div>
  );
}
