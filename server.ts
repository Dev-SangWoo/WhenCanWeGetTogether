import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import Redis from 'ioredis-mock';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const redis = new Redis();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  io.on('connection', (socket) => {
    let currentRoom = '';
    let currentNickname = '';

    socket.on('join-room', async ({ roomId, nickname, password, userId }) => {
      if (!roomId) return;
      
      console.log(`[Join] User ${nickname} (${userId}) attempting to join room ${roomId}`);
      const metaRaw = await redis.get(`room:${roomId}:meta`);
      const meta = metaRaw ? JSON.parse(metaRaw) : { title: roomId, description: '', password: '' };

      if (meta.password && meta.password !== password) {
        console.log(`[Join Error] Incorrect password for room ${roomId}`);
        socket.emit('join-error', '비밀번호가 틀렸습니다.');
        return;
      }

      socket.join(roomId);
      currentRoom = roomId;
      currentNickname = nickname;

      await redis.hset(`room:${roomId}:participants`, socket.id, nickname);
      
      socket.emit('room-meta', { title: meta.title, description: meta.description });

      const blocks = await redis.get(`room:${roomId}:blocks`);
      socket.emit('init-blocks', blocks ? JSON.parse(blocks) : []);

      const participants = await redis.hgetall(`room:${roomId}:participants`);
      // Filter to unique nicknames for display
      const uniqueNames = Array.from(new Set(Object.values(participants)));
      const uniqueParticipants = uniqueNames.map(name => ({
        id: Object.keys(participants).find(key => participants[key] === name),
        nickname: name
      }));

      io.to(roomId).emit('participants-update', uniqueParticipants);
      console.log(`[Join Success] User ${nickname} joined room ${roomId}`);
    });

    socket.on('send-message', ({ roomId, message }) => {
      if (!roomId || !currentNickname) {
        console.log(`[Chat Error] Missing roomId or nickname. Room: ${roomId}, Nickname: ${currentNickname}`);
        return;
      }
      
      console.log(`[Chat] Message from ${currentNickname} in room ${roomId}: ${message}`);
      const chatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        sender: currentNickname,
        text: message,
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      io.to(roomId).emit('new-message', chatMessage);
    });

    socket.on('update-blocks', async ({ roomId, blocks: incomingBlocks, isRemoval }) => {
      if (!roomId) return;
      const blocksRaw = await redis.get(`room:${roomId}:blocks`);
      let blocks = blocksRaw ? JSON.parse(blocksRaw) : [];

      incomingBlocks.forEach((nb: any) => {
        // Simplified position: [YYYYMMDD, typeIndex]
        const idx = blocks.findIndex((eb: any) => 
          eb.position[0] === nb.position[0] && 
          eb.userId === nb.userId
        );

        if (isRemoval) {
          if (idx !== -1) blocks.splice(idx, 1);
        } else {
          if (idx !== -1) blocks[idx] = nb;
          else blocks.push(nb);
        }
      });

      await redis.set(`room:${roomId}:blocks`, JSON.stringify(blocks));
      io.to(roomId).emit('init-blocks', blocks);
    });

    socket.on('get-rooms', async () => {
      const roomIds = await redis.smembers('all_rooms');
      const roomData = await Promise.all(roomIds.map(async (id) => {
        const metaRaw = await redis.get(`room:${id}:meta`);
        const meta = metaRaw ? JSON.parse(metaRaw) : { title: id, description: '', password: '' };
        return { 
          id, 
          title: meta.title, 
          description: meta.description, 
          hasPassword: !!meta.password 
        };
      }));
      socket.emit('rooms-list', roomData);
    });

    socket.on('create-room', async ({ roomId, title, description, password }) => {
      await redis.sadd('all_rooms', roomId);
      await redis.set(`room:${roomId}:meta`, JSON.stringify({ title, description, password }));
      const roomIds = await redis.smembers('all_rooms');
      const roomData = await Promise.all(roomIds.map(async (id) => {
        const metaRaw = await redis.get(`room:${id}:meta`);
        const meta = metaRaw ? JSON.parse(metaRaw) : { title: id, description: '', password: '' };
        return { 
          id, 
          title: meta.title, 
          description: meta.description, 
          hasPassword: !!meta.password 
        };
      }));
      io.emit('rooms-list', roomData);
    });

    socket.on('disconnect', async () => {
      if (currentRoom) {
        await redis.hdel(`room:${currentRoom}:participants`, socket.id);
        const participants = await redis.hgetall(`room:${currentRoom}:participants`);
        
        // Filter to unique nicknames for display
        const uniqueNames = Array.from(new Set(Object.values(participants)));
        const uniqueParticipants = uniqueNames.map(name => ({
          id: Object.keys(participants).find(key => participants[key] === name),
          nickname: name
        }));

        io.to(currentRoom).emit('participants-update', uniqueParticipants);
      }
    });
  });

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> Server ready on http://0.0.0.0:${PORT}`);
  });
});
