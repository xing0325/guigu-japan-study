import React, { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Character from './Character';
import './style.css';

const moods = [
  { name: 'Idle', label: '静静陪你', description: '慢慢呼吸，偶尔眨眼。小龟已经准备好，陪你探索下一站。', icon: '○' },
  { name: 'Thinking', label: '认真想一想', description: '歪歪脑袋，让想法冒个泡。给小龟一点时间，整理眼前的线索。', icon: '⋯' },
  { name: 'Speaking', label: '有话对你说', description: '张嘴说话，轻轻挥手。把复杂的事情，一点一点讲清楚。', icon: '≋' },
];
function App() {
  const [mode, setMode] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [actual, setActual] = useState('Loading');
  const onReady = useCallback(() => setReady(true), []);
  const onStateChange = useCallback(data => {
    const names = Array.isArray(data) ? data : [data];
    const state = names.find(name => moods.some(m => m.name === name));
    if (state) setActual(state);
  }, []);
  return <main>
    <header><a className="brand" href="../">龟谷 <span>GUIGU</span></a><span className="edition">CHARACTER STUDY / 001</span></header>
    <section className="intro"><p className="eyebrow">一个有回应的小伙伴</p><h1>小龟，<br/>今天是什么心情？</h1><p className="lede">从一呼一吸，到认真思考。<br/>点选一种状态，和小龟打个招呼。</p></section>
    <section className="stage" aria-label="角色动画"><span className="stage-label">龟谷的小小向导</span><div className="character"><Character mode={mode} onReady={onReady} onStateChange={onStateChange} onError={() => setFailed(true)}/></div><span className="live"><i/>{failed ? '加载失败' : ready ? '小龟在线' : '正在唤醒小龟…'}</span></section>
    <section className="controls" aria-label="角色状态控制"><div className="choices">{moods.map((m, i) => <button key={m.name} disabled={!ready || failed} aria-pressed={mode === i} onClick={() => setMode(i)}><span className="icon">{m.icon}</span><span>{m.name}<small>{m.label}</small></span><span className="number">0{i+1}</span></button>)}</div><p className="description" aria-live="polite">{moods[mode].description}</p></section>
    <footer><span>小小的动作，也有温度。</span><output data-testid="runtime-state">Rive · {actual}</output></footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
