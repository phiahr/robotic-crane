'use client';

// pages/index.tsx
import { useEffect,  useState } from 'react';
import Crane from '../components/Crane';
import ControlPanel from '../components/ControlPanel';
import { connectWebSocket, sendWebSocketMessage, closeWebSocket } from './websocketService';


const Home = () => {
  return (
    <div>
      <Crane />
      <ControlPanel />
    </div>
  );
};

export default Home;
