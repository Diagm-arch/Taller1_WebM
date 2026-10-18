// js/minigames/tbop/tbop-renderer.js

import { ROOM_W, ROOM_H, WALL_THICKNESS } from './tbop-entities.js';

export function getTbopLayoutHTML() {
  return `
    <style>
      #papa-root {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: #120d0a !important;
        overflow: hidden !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        touch-action: none !important;
        font-family: 'Inter', sans-serif !important;
        text-shadow: none !important;
        z-index: 10;
      }
      #papa-root * {
        text-shadow: none !important;
        box-sizing: border-box;
      }
      #papa-canvas {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        display: block !important;
      }
      #papa-root .font-pixel {
        font-family: 'VT323', monospace !important;
        letter-spacing: 0.05em;
      }
      #papa-root .isaac-panel {
        background: rgba(20, 14, 10, 0.92) !important;
        border: 2px solid #5c4033 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.75) !important;
        border-radius: 8px !important;
      }
      #papa-root .action-btn {
        background: radial-gradient(circle at 30% 30%, #f59e0b, #b45309) !important;
        border: 2px solid #fde68a !important;
        box-shadow: 0 4px 0 #78350f, 0 6px 12px rgba(0,0,0,0.6) !important;
        transition: transform 0.08s;
      }
      #papa-root .action-btn:active {
        transform: translateY(3px) scale(0.96);
        box-shadow: 0 1px 0 #78350f !important;
      }
      @keyframes boss-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #papa-root .boss-alert-box {
        animation: boss-pulse 0.8s infinite ease-in-out;
      }
    </style>

    <div id="papa-root">
      <canvas id="papa-canvas"></canvas>

      <div class="absolute top-2 left-3 right-3 z-20 flex justify-between items-start pointer-events-none gap-2">
        <div class="isaac-panel px-3 py-1.5 mt-11 pointer-events-auto flex flex-col gap-1">
          <span id="papa-floor-title" class="font-pixel text-yellow-400 text-xs sm:text-sm leading-none">PISO 1: LA DESPENSA</span>
          <div id="papa-hearts" class="text-sm sm:text-base leading-none">❤️❤️❤️</div>
          <div class="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-amber-200/90">
            <span>💧 DAÑO: <b id="papa-stat-dmg" class="text-white">10</b></span>
            <span>⚡ VEL: <b id="papa-stat-spd" class="text-white">4.2</b></span>
            <span>🔥 CAD: <b id="papa-stat-rate" class="text-white">Normal</b></span>
          </div>
        </div>

        <div class="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div class="isaac-panel px-2.5 py-1.5 flex items-center gap-2">
            <div class="flex flex-col items-end mr-1">
              <span class="text-[9px] font-bold uppercase tracking-wider text-amber-300/80 leading-none">Mapa</span>
              <span id="papa-room-indicator" class="text-[11px] font-extrabold text-white leading-tight">Sala 1 / 5</span>
            </div>
            <div id="papa-minimap-rooms" class="flex items-center gap-1"></div>
          </div>

          <div class="flex gap-1.5">
            <button id="papa-btn-sound" class="isaac-panel px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-950/60 font-bold active:scale-95 transition" title="Silenciar música y efectos">
              🔊
            </button>
            <button id="papa-btn-restart" class="isaac-panel px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-950/60 font-bold active:scale-95 transition" title="Reiniciar partida">
              🔄
            </button>
          </div>
        </div>
      </div>

      <div id="papa-boss-hud" class="hidden absolute top-16 left-1/2 -translate-x-1/2 z-20 w-4/5 max-w-xs pointer-events-none text-center">
        <div class="boss-alert-box font-pixel text-rose-300 text-xs bg-red-950/90 border border-red-500 rounded px-2 py-0.5 mb-1">
          ⚠️ ¡EL PROFESOR RABÍ INTENTA PEGARTE! ⚠️
        </div>
        <div class="w-full h-3 bg-black rounded-full border border-red-700 overflow-hidden">
          <div id="papa-boss-hp-bar" class="h-full bg-gradient-to-r from-red-600 to-amber-400" style="width: 100%;"></div>
        </div>
      </div>

      <div id="papa-toast" class="opacity-0 transition-opacity duration-300 pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 z-20 bg-black/90 border border-amber-500 px-4 py-2 rounded text-center">
        <div id="papa-toast-title" class="font-pixel text-yellow-400 text-xs"></div>
        <div id="papa-toast-sub" class="text-white text-xs"></div>
      </div>

      <div class="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end pointer-events-none">
        <div id="papa-joy-zone" class="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-amber-950/40 border-2 border-amber-500/50 relative pointer-events-auto flex items-center justify-center">
          <div class="text-[9px] text-amber-200/40 font-bold uppercase tracking-widest pointer-events-none">MOVER</div>
          <div id="papa-joy-knob" class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-amber-400 to-amber-700 border border-yellow-200 absolute flex items-center justify-center text-lg">🥔</div>
        </div>

        <div class="hidden sm:flex flex-col items-center bg-black/75 px-3 py-1.5 rounded-lg border border-amber-900/60 text-[11px] text-amber-200/90 text-center">
          <span><b>Auto-Disparo Activo</b> (Apunta al enemigo más cercano)</span>
          <span>PC: <b>WASD / Flechas</b> mover • <b>Espacio</b> Rodar</span>
        </div>

        <button id="papa-btn-dash" class="action-btn w-20 h-20 rounded-full flex flex-col items-center justify-center pointer-events-auto cursor-pointer">
          <span class="text-xl leading-none">💨</span>
          <span class="font-pixel text-xs text-white leading-none mt-1">RODAR</span>
          <span class="text-[8px] text-amber-200">ESQUIVAR</span>
        </button>
      </div>

      <div id="papa-end-modal" class="hidden absolute inset-0 z-40 bg-black/85 flex items-center justify-center p-4">
        <div class="isaac-panel p-5 max-w-sm w-full text-center border-2 border-amber-500">
          <div id="papa-end-icon" class="text-5xl mb-2">🥣</div>
          <h2 id="papa-end-title" class="font-pixel text-yellow-400 text-lg mb-2"></h2>
          <p id="papa-end-desc" class="text-sm text-gray-200 mb-4"></p>
          <button id="papa-btn-retry" class="action-btn w-full py-2 rounded font-pixel text-xs text-white cursor-pointer">
            🥔 REINTENTAR
          </button>
        </div>
      </div>
    </div>
  `;
}

export function showToast(title, sub) {
  const b = document.getElementById('papa-toast');
  if (!b) return;
  document.getElementById('papa-toast-title').textContent = title;
  document.getElementById('papa-toast-sub').textContent = sub;
  b.classList.remove('opacity-0');
  setTimeout(() => b.classList.add('opacity-0'), 2200);
}

export function updateHUD(game) {
  const p = game.potato;
  if (!p) return;

  const hBox = document.getElementById('papa-hearts');
  if (hBox) {
    let txt = '';
    for (let i = 0; i < Math.ceil(p.maxHp / 2); i++) {
      const rem = p.hp - i * 2;
      txt += rem >= 2 ? '❤️' : (rem === 1 ? '💔' : '🖤');
    }
    hBox.innerHTML = txt;
  }

  const dmgEl = document.getElementById('papa-stat-dmg');
  const spdEl = document.getElementById('papa-stat-spd');
  const rateEl = document.getElementById('papa-stat-rate');
  if (dmgEl) dmgEl.textContent = p.damage;
  if (spdEl) spdEl.textContent = p.speed.toFixed(1);
  if (rateEl) rateEl.textContent = p.fireDelay <= 14 ? 'Muy Alta' : (p.fireDelay <= 18 ? 'Alta' : 'Normal');

  const roomInd = document.getElementById('papa-room-indicator');
  if (roomInd) roomInd.textContent = `Sala ${game.currentRoomIdx + 1} / 5`;

  const mapEl = document.getElementById('papa-minimap-rooms');
  if (mapEl) {
    mapEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const r = game.rooms[i];
      const isCurrent = (i === game.currentRoomIdx);
      const cell = document.createElement('div');

      let bg = 'bg-stone-800 border-stone-600 text-stone-400';
      if (isCurrent) bg = 'bg-amber-500 border-yellow-200 text-black scale-110 shadow-md';
      else if (r && r.cleared) bg = 'bg-emerald-800/80 border-emerald-400 text-white';

      cell.className = `w-5 h-5 sm:w-6 sm:h-6 rounded border flex items-center justify-center text-[10px] font-bold transition-all ${bg}`;
      if (game.floor === 2 && i === 4) {
        cell.textContent = '🧑';
      } else if (game.floor === 1 && i === 4) {
        cell.textContent = '🪜';
      } else {
        cell.textContent = i + 1;
      }
      mapEl.appendChild(cell);
    }
  }
}

export function drawDoor(ctx, x, y, open, isBoss) {
  ctx.fillStyle = isBoss ? '#7f1d1d' : '#451a03';
  ctx.fillRect(x, y - 42, WALL_THICKNESS, 84);
  if (open) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 6, y - 32, WALL_THICKNESS - 12, 64);
  }
}

export function drawHand(ctx, h) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.fillStyle = '#fdba74';
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, h.radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBoss(ctx, boss) {
  ctx.save();
  if (boss.state === 'aiming_hand') {
    ctx.fillStyle = 'rgba(225, 29, 72, 0.3)';
    ctx.beginPath();
    ctx.arc(boss.shadowX, boss.shadowY, 46, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, -4, 52, 60, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#fdba74';
  ctx.fillRect(-65, -70, 130, 140);
  ctx.fillStyle = '#271c19';
  ctx.beginPath();
  ctx.arc(0, -40, 50, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillRect(-20, -10, 8, 8);
  ctx.fillRect(12, -10, 8, 8);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(-15, 20, 30, 10);
  ctx.restore();

  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, -4, 52, 60, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.fillRect(60, -45, 140, 30);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(boss.shoutText, 130, -26);
  ctx.restore();

  drawHand(ctx, boss.leftHand);
  drawHand(ctx, boss.rightHand);
  ctx.restore();
}

export function drawHero(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer / 4) % 2 === 0) ctx.globalAlpha = 0.45;
  if (p.dashTimer > 0) ctx.rotate(performance.now() * 0.035);

  const grad = ctx.createRadialGradient(-6, -8, 4, 0, 0, p.radius + 4);
  grad.addColorStop(0, '#e6b87d');
  grad.addColorStop(0.7, '#b88346');
  grad.addColorStop(1, '#7c5327');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#4a2e12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.radius * 0.95, p.radius * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  [-7, 7].forEach(ox => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ox + p.faceDirX * 1.5, -3 + p.faceDirY * 1.5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(ox + p.faceDirX * 3, -3 + p.faceDirY * 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

export function drawGame(ctx, canvas, game) {
  const targetW = canvas.clientWidth || window.innerWidth;
  const targetH = canvas.clientHeight || window.innerHeight;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.fillStyle = '#120d0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / ROOM_W, canvas.height / ROOM_H);
  const ox = (canvas.width - ROOM_W * scale) / 2;
  const oy = (canvas.height - ROOM_H * scale) / 2;

  ctx.save();
  let sx = 0, sy = 0;
  if (game.shakeTimer > 0) {
    game.shakeTimer--;
    sx = (Math.random() - 0.5) * game.shakeIntensity;
    sy = (Math.random() - 0.5) * game.shakeIntensity;
  }
  ctx.translate(ox + sx, oy + sy);
  ctx.scale(scale, scale);

  const room = game.rooms[game.currentRoomIdx];
  if (!room) { ctx.restore(); return; }

  if (game.floor === 1) {
    ctx.fillStyle = '#3b281e';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    ctx.fillStyle = '#4e3629';
    ctx.fillRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, ROOM_W, ROOM_H);
    const tileS = 44;
    for (let y = WALL_THICKNESS; y < ROOM_H - WALL_THICKNESS; y += tileS) {
      for (let x = WALL_THICKNESS; x < ROOM_W - WALL_THICKNESS; x += tileS) {
        ctx.fillStyle = ((Math.floor(x / tileS) + Math.floor(y / tileS)) % 2 === 0) ? '#475569' : '#3e4c5e';
        ctx.fillRect(x, y, Math.min(tileS, ROOM_W - WALL_THICKNESS - x), Math.min(tileS, ROOM_H - WALL_THICKNESS - y));
      }
    }
  }

  ctx.strokeStyle = '#1f140e';
  ctx.lineWidth = 6;
  ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);

  if (game.currentRoomIdx > 0) drawDoor(ctx, 0, ROOM_H / 2, room.cleared, false);
  if (game.currentRoomIdx < 4) drawDoor(ctx, ROOM_W - WALL_THICKNESS, ROOM_H / 2, room.cleared, (game.floor === 2 && game.currentRoomIdx === 3));

  if (room.trapdoor) {
    const tx = ROOM_W - 140, ty = ROOM_H / 2;
    ctx.fillStyle = room.cleared ? '#090706' : '#291d16';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    ctx.fillRect(tx - 32, ty - 32, 64, 64);
    ctx.strokeRect(tx - 32, ty - 32, 64, 64);
    if (room.cleared) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BAJAR PISO 2', tx, ty - 42);
    }
  }

  for (const rock of room.rocks) {
    ctx.fillStyle = game.floor === 1 ? '#645348' : '#64748b';
    ctx.beginPath();
    ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#27201c';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  for (const it of room.items) {
    const by = it.y + Math.sin(it.bob) * 5;
    ctx.font = '30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.icon, it.x, by);
  }

  for (const en of room.enemies) {
    const emojis = { worm: '🪱', fly: '🪰', fork: '🍴', tomato: '🍅' };
    ctx.font = `${en.radius * 1.75}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojis[en.type] || '👾', en.x, en.y + Math.sin(en.phase) * 3);
  }

  if (room.boss && room.boss.hp > 0) drawBoss(ctx, room.boss);

  drawHero(ctx, game.potato);

  for (const t of game.tears) {
    if (t.isSlipper) {
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(performance.now() * 0.02);
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🩴', 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const pt = game.particles[i];
    pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.05;
    if (pt.life <= 0) { game.particles.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = pt.life;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
