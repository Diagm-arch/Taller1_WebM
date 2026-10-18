// js/minigames/papahero/papahero-renderer.js

export class PapaheroRenderer {
  getTrackPoint(game, lanePos, zNorm) {
    const pZ = Math.pow(Math.max(0, zNorm), 1.45);
    const y = game.neckTopY + (game.neckBottomY - game.neckTopY) * pZ;
    const widthAtZ = game.neckTopWidth + (game.neckBottomWidth - game.neckTopWidth) * pZ;
    const leftX = (game.width - widthAtZ) / 2;
    const x = leftX + (lanePos / game.laneCount) * widthAtZ;
    const scale = 0.35 + 0.65 * pZ;
    return { x, y, scale, widthAtZ, leftX };
  }

  render(game) {
    const ctx = game.ctx;
    ctx.clearRect(0, 0, game.width, game.height);

    this.drawKitchenBackground(ctx, game);
    this.drawTiledCounterFretboard(ctx, game);
    this.drawStoveBurners(ctx, game);
    this.drawPotatoNotes(ctx, game);

    for (const p of game.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    this.drawPeelingPotatoMeter(ctx, game);
    this.drawRockMeterLeft(ctx, game);
    this.drawHUD(ctx, game);

    if (game.waitingForStart) {
      this.drawStartOverlay(ctx, game);
    } else if (game.isGameOver) {
      this.drawGameOverOverlay(ctx, game);
    }
  }

  drawKitchenBackground(ctx, game) {
    const stage = game.currentStageTime;

    let wallColor = '#cbd5e1';
    let cabinetColor = '#78350f';
    let skyTop = '#38bdf8';
    let skyBottom = '#bae6fd';
    let ambientOverlay = 'rgba(255, 255, 220, 0.04)';

    if (stage === 'afternoon') {
      wallColor = '#fed7aa';
      cabinetColor = '#5c2d0c';
      skyTop = '#ea580c';
      skyBottom = '#fde047';
      ambientOverlay = 'rgba(251, 146, 60, 0.16)';
    } else if (stage === 'night') {
      wallColor = '#1e1b4b';
      cabinetColor = '#27170e';
      skyTop = '#090d16';
      skyBottom = '#1e1b4b';
      ambientOverlay = 'rgba(15, 23, 42, 0.35)';
    }

    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.strokeStyle = stage === 'night' ? '#312e81' : (stage === 'afternoon' ? '#fdba74' : '#94a3b8');
    ctx.lineWidth = 1;
    for (let y = 70; y < 220; y += 18) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(game.width, y); ctx.stroke();
    }
    for (let x = 0; x < game.width; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 220); ctx.stroke();
    }

    const winX = 42, winY = 18, winW = 135, winH = 74;
    const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(winX, winY, winW, winH);

    if (stage === 'morning') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(winX + 38, winY + 26, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(winX, winY + winH);
      ctx.lineTo(winX + 45, winY + 52);
      ctx.lineTo(winX + 95, winY + 60);
      ctx.lineTo(winX + winW, winY + 46);
      ctx.lineTo(winX + winW, winY + winH);
      ctx.fill();
    } else if (stage === 'afternoon') {
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(winX + 88, winY + 46, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(winX + 88, winY + 46, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(winX, winY + winH);
      ctx.lineTo(winX + 50, winY + 48);
      ctx.lineTo(winX + 100, winY + 58);
      ctx.lineTo(winX + winW, winY + 44);
      ctx.lineTo(winX + winW, winY + winH);
      ctx.fill();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(winX + 20, winY + 14, 2, 2);
      ctx.fillRect(winX + 55, winY + 28, 2, 2);
      ctx.fillRect(winX + 110, winY + 18, 3, 3);
      ctx.fillRect(winX + 82, winY + 40, 2, 2);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(winX + 42, winY + 30, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = cabinetColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(winX, winY, winW, winH);
    ctx.beginPath();
    ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH);
    ctx.moveTo(winX, winY + winH / 2); ctx.lineTo(winX + winW, winY + winH / 2);
    ctx.stroke();

    ctx.fillStyle = stage === 'night' ? '#475569' : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(275, 0); ctx.lineTo(365, 0); ctx.lineTo(405, 68); ctx.lineTo(235, 68);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = stage === 'night' ? 'rgba(253, 224, 71, 0.32)' : 'rgba(253, 224, 71, 0.16)';
    ctx.beginPath();
    ctx.moveTo(250, 68); ctx.lineTo(390, 68); ctx.lineTo(470, 180); ctx.lineTo(170, 180);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cabinetColor;
    ctx.fillRect(445, 16, 155, 68);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2;
    ctx.strokeRect(445, 16, 76, 68);
    ctx.strokeRect(523, 16, 77, 68);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(510, 44, 4, 14);
    ctx.fillRect(530, 44, 4, 14);

    ctx.fillStyle = stage === 'night' ? '#334155' : (stage === 'afternoon' ? '#78350f' : '#64748b');
    ctx.fillRect(0, 92, game.width, 268);

    ctx.fillStyle = ambientOverlay;
    ctx.fillRect(0, 0, game.width, game.height);
  }

  drawTiledCounterFretboard(ctx, game) {
    const topL = this.getTrackPoint(game, 0, 0);
    const topR = this.getTrackPoint(game, game.laneCount, 0);
    const botL = this.getTrackPoint(game, 0, 1);
    const botR = this.getTrackPoint(game, game.laneCount, 1);

    ctx.fillStyle = game.isOverdrive ? '#ca8a04' : '#78350f';
    ctx.beginPath();
    ctx.moveTo(topL.x - 10, topL.y);
    ctx.lineTo(topR.x + 10, topR.y);
    ctx.lineTo(botR.x + 18, botR.y);
    ctx.lineTo(botL.x - 18, botL.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = game.isOverdrive ? '#fef9c3' : '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(topL.x, topL.y);
    ctx.lineTo(topR.x, topR.y);
    ctx.lineTo(botR.x, botR.y);
    ctx.lineTo(botL.x, botL.y);
    ctx.closePath();
    ctx.fill();

    const numRows = 12;
    const scrollOffset = ((game.currentSongTime / game.noteApproachTime) * numRows) % 1;

    for (let r = 0; r < numRows; r++) {
      const z1 = (r + scrollOffset) / numRows;
      const z2 = Math.min(1, (r + 1 + scrollOffset) / numRows);

      for (let c = 0; c < game.laneCount; c++) {
        const isAltTile = (Math.floor(r + game.currentSongTime * (numRows / game.noteApproachTime)) + c) % 2 === 0;
        const p1 = this.getTrackPoint(game, c, z1);
        const p2 = this.getTrackPoint(game, c + 1, z1);
        const p3 = this.getTrackPoint(game, c + 1, z2);
        const p4 = this.getTrackPoint(game, c, z2);

        ctx.fillStyle = game.isOverdrive
          ? (isAltTile ? '#fef08a' : '#fef9c3')
          : (isAltTile ? '#ffffff' : '#e2e8f0');

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    for (let lane = 0; lane <= game.laneCount; lane++) {
      const pTop = this.getTrackPoint(game, lane, 0);
      const pBot = this.getTrackPoint(game, lane, 1);
      ctx.strokeStyle = lane === 0 || lane === game.laneCount ? '#334155' : '#64748b';
      ctx.lineWidth = lane === 0 || lane === game.laneCount ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(pTop.x, pTop.y);
      ctx.lineTo(pBot.x, pBot.y);
      ctx.stroke();
    }
  }

  drawStoveBurners(ctx, game) {
    for (let lane = 0; lane < game.laneCount; lane++) {
      const center = this.getTrackPoint(game, lane + 0.5, game.hitLineZ);
      const isPressed = game.keysHeld[lane];
      const rx = 24 * center.scale;
      const ry = 13 * center.scale;

      ctx.save();
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isPressed ? game.laneColors[lane] : '#52525b';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const flameCount = 8;
      for (let i = 0; i < flameCount; i++) {
        const ang = (i / flameCount) * Math.PI * 2 + performance.now() * 0.008;
        const fx = center.x + Math.cos(ang) * (rx * 0.72);
        const fy = center.y + Math.sin(ang) * (ry * 0.72);

        if (isPressed) {
          ctx.fillStyle = game.isOverdrive ? '#fde047' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(fx, fy - 3, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = game.laneColors[lane];
          ctx.beginPath();
          ctx.arc(fx, fy - 6, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(fx - 1, fy - 1, 2, 2);
        }
      }

      ctx.strokeStyle = isPressed ? '#e4e4e7' : '#3f3f46';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center.x - rx * 0.85, center.y);
      ctx.lineTo(center.x + rx * 0.85, center.y);
      ctx.moveTo(center.x, center.y - ry * 0.85);
      ctx.lineTo(center.x, center.y + ry * 0.85);
      ctx.stroke();

      ctx.fillStyle = isPressed ? game.laneColors[lane] : '#27272a';
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, rx * 0.38, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isPressed ? '#000000' : '#ffffff';
      ctx.font = 'bold 15px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.laneLabels[lane], center.x, center.y + 5);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  drawPotatoNotes(ctx, game) {
    for (const note of game.notes) {
      if (note.missed) continue;
      if (note.hit && (!note.duration || note.holdCompleted)) continue;

      const timeUntilHit = note.time - game.currentSongTime;
      const headZ = game.hitLineZ * (1 - timeUntilHit / game.noteApproachTime);

      const endTime = note.time + (note.duration || 0);
      const tailTimeUntilHit = endTime - game.currentSongTime;
      const tailZ = game.hitLineZ * (1 - tailTimeUntilHit / game.noteApproachTime);

      if (headZ < 0 && tailZ < 0) continue;
      if (tailZ > 1.15) continue;

      if (note.duration > 0.12) {
        const clampedHeadZ = note.holding ? game.hitLineZ : Math.min(1.05, Math.max(0, headZ));
        const clampedTailZ = Math.min(1.05, Math.max(0, tailZ));

        if (clampedHeadZ > clampedTailZ) {
          const pHead = this.getTrackPoint(game, note.lane + 0.5, clampedHeadZ);
          const pTail = this.getTrackPoint(game, note.lane + 0.5, clampedTailZ);
          const headW = 14 * pHead.scale;
          const tailW = 14 * pTail.scale;

          ctx.fillStyle = note.holding ? '#facc15' : '#d97706';
          ctx.beginPath();
          ctx.moveTo(pTail.x - tailW / 2, pTail.y);
          ctx.lineTo(pTail.x + tailW / 2, pTail.y);
          ctx.lineTo(pHead.x + headW / 2, pHead.y);
          ctx.lineTo(pHead.x - headW / 2, pHead.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = note.holding ? '#ffffff' : game.laneColors[note.lane];
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      if (!note.hit || note.holding) {
        const drawZ = note.holding ? game.hitLineZ : headZ;
        if (drawZ >= 0 && drawZ <= 1.05) {
          const pos = this.getTrackPoint(game, note.lane + 0.5, drawZ);
          this.drawRawPotatoSprite(ctx, game, pos.x, pos.y, pos.scale, note.lane, note.seed, note.holding);
        }
      }
    }
  }

  drawRawPotatoSprite(ctx, game, x, y, scale, lane, seed, isCooking = false) {
    const rx = 20 * scale;
    const ry = 12 * scale;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = game.laneColors[lane];
    ctx.beginPath();
    ctx.ellipse(0, 2 * scale, rx * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isCooking ? '#eab308' : '#b48343';
    ctx.beginPath();
    const vertices = 8;
    for (let i = 0; i < vertices; i++) {
      const ang = (i / vertices) * Math.PI * 2;
      const wobble = 0.88 + (((seed + i * 19) % 25) / 100);
      const vx = Math.cos(ang) * rx * wobble;
      const vy = Math.sin(ang) * ry * wobble;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = Math.max(1.5, 2 * scale);
    ctx.stroke();

    ctx.fillStyle = isCooking ? '#fef08a' : '#d6a364';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.25, -ry * 0.25, rx * 0.4, ry * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawPeelingPotatoMeter(ctx, game) {
    const boxX = 528, boxY = 128, boxW = 98, boxH = 188;

    ctx.fillStyle = 'rgba(0, 0, 50, 0.86)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = game.peelCharge >= 50 || game.isOverdrive ? '#fde047' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fde047';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PELA-CARGA', boxX + boxW / 2, boxY + 16);

    const potX = boxX + boxW / 2;
    const potY = boxY + 95;
    const potRX = 30;
    const potRY = 52;
    const peelRatio = Math.max(0, Math.min(1, game.peelCharge / 100));

    const tracePotatoPath = () => {
      ctx.beginPath();
      const pts = [
        [0, -potRY],
        [potRX * 0.75, -potRY * 0.75],
        [potRX, -potRY * 0.15],
        [potRX * 0.9, potRY * 0.55],
        [potRX * 0.45, potRY * 0.95],
        [0, potRY],
        [-potRX * 0.55, potRY * 0.9],
        [-potRX * 0.95, potRY * 0.45],
        [-potRX, -potRY * 0.2],
        [-potRX * 0.7, -potRY * 0.8]
      ];
      pts.forEach(([px, py], idx) => {
        if (idx === 0) ctx.moveTo(potX + px, potY + py);
        else ctx.lineTo(potX + px, potY + py);
      });
      ctx.closePath();
    };

    ctx.save();
    tracePotatoPath();
    ctx.fillStyle = '#854d0e';
    ctx.fill();
    ctx.fillStyle = '#451a03';
    ctx.fillRect(potX - 12, potY - 25, 4, 3);
    ctx.fillRect(potX + 10, potY - 5, 4, 3);
    ctx.fillRect(potX - 8, potY + 18, 5, 3);
    ctx.fillRect(potX + 6, potY + 32, 4, 3);
    ctx.restore();

    if (peelRatio > 0) {
      ctx.save();
      tracePotatoPath();
      ctx.clip();

      const peelHeight = (potRY * 2) * peelRatio;
      ctx.fillStyle = game.isOverdrive ? '#ffffff' : '#fde047';
      ctx.fillRect(potX - potRX - 5, potY - potRY, (potRX + 5) * 2, peelHeight);

      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(potX - 14, potY - potRY + 8, 7, Math.max(0, peelHeight - 14));

      if (peelRatio < 0.98) {
        const cutY = potY - potRY + peelHeight;
        ctx.fillStyle = '#a16207';
        ctx.fillRect(potX - potRX, cutY - 3, potRX * 2, 6);
      }
      ctx.restore();
    }

    ctx.save();
    tracePotatoPath();
    ctx.strokeStyle = game.isOverdrive ? '#facc15' : '#27272a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    for (const f of game.peelFlakes) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-6, -3, 12, 5);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5, -1, 10, 2);
      ctx.restore();
    }

    ctx.fillStyle = game.isOverdrive ? '#4ade80' : (game.peelCharge >= 50 ? '#fde047' : '#cbd5e1');
    ctx.font = '14px VT323, monospace';
    if (game.isOverdrive) {
      ctx.fillText('¡SUPERCARGA!', boxX + boxW / 2, boxY + boxH - 20);
      ctx.fillText('ACTIVA (x2)', boxX + boxW / 2, boxY + boxH - 6);
    } else if (game.peelCharge >= 50) {
      ctx.fillText(`${Math.floor(game.peelCharge)}% PELADA`, boxX + boxW / 2, boxY + boxH - 20);
      ctx.fillText('[ESPACIO] USAR', boxX + boxW / 2, boxY + boxH - 6);
    } else {
      ctx.fillText(`${Math.floor(game.peelCharge)}% PELADA`, boxX + boxW / 2, boxY + boxH - 12);
    }
    ctx.textAlign = 'left';
  }

  drawRockMeterLeft(ctx, game) {
    const boxX = 14, boxY = 128, boxW = 92, boxH = 188;

    ctx.fillStyle = 'rgba(0, 0, 50, 0.86)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = game.health < 25 ? '#ef4444' : '#94a3b8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COCCIÓN', boxX + boxW / 2, boxY + 16);

    const barX = boxX + 32, barY = boxY + 26, barW = 28, barH = 132;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, Math.min(1, game.health / game.maxHealth));
    const fillH = barH * hpRatio;
    ctx.fillStyle = hpRatio > 0.6 ? '#22c55e' : (hpRatio > 0.3 ? '#eab308' : '#ef4444');
    ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px VT323, monospace';
    ctx.fillText(`${Math.ceil(game.health)}%`, boxX + boxW / 2, boxY + boxH - 8);
    ctx.textAlign = 'left';
  }

  drawHUD(ctx, game) {
    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(14, 10, 175, 54);
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 10, 175, 54);

    ctx.fillStyle = '#fde047';
    ctx.font = '22px VT323, monospace';
    ctx.fillText(`PTS: ${game.score.toString().padStart(6, '0')}`, 24, 32);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '18px VT323, monospace';
    ctx.fillText(`RACHA: ${game.combo} (MÁX: ${game.maxCombo})`, 24, 54);

    const stageLabels = {
      morning: '[C] COCINA: MAÑANA ☀',
      afternoon: '[C] COCINA: GOLDEN HOUR 🌇',
      night: '[C] COCINA: NOCHE 🌙'
    };
    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(215, 8, 210, 26);
    ctx.strokeStyle = '#facc15';
    ctx.strokeRect(215, 8, 210, 26);
    ctx.fillStyle = '#fef08a';
    ctx.font = '15px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stageLabels[game.currentStageTime], 320, 26);

    ctx.fillStyle = 'rgba(0, 0, 60, 0.9)';
    ctx.fillRect(455, 10, 171, 54);
    ctx.strokeStyle = game.isOverdrive ? '#fde047' : '#d4d4d8';
    ctx.strokeRect(455, 10, 171, 54);

    const mult = game.getTotalMultiplier();
    ctx.fillStyle = game.isOverdrive ? '#fde047' : '#4ade80';
    ctx.font = '30px VT323, monospace';
    ctx.fillText(`MULT: x${mult}`, 540, 44);
    ctx.textAlign = 'left';

    if (game.judgmentTimer > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(185, 42, 270, 44);
      ctx.strokeStyle = game.judgmentColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(185, 42, 270, 44);

      ctx.fillStyle = game.judgmentColor;
      ctx.font = '24px VT323, monospace';
      ctx.fillText(game.judgmentText, game.width / 2, 63);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px VT323, monospace';
      ctx.fillText(game.judgmentSubText, game.width / 2, 80);
      ctx.restore();
    }
  }

  drawStartOverlay(ctx, game) {
    ctx.fillStyle = 'rgba(0, 0, 20, 0.85)';
    ctx.fillRect(75, 90, 490, 185);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.strokeRect(75, 90, 490, 185);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = '30px VT323, monospace';
    ctx.fillText(`🎸 ${game.songConfig.name} 🥔`, game.width / 2, 128);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '18px VT323, monospace';
    ctx.fillText('Teclas [ A ] [ S ] [ D ] [ F ] [ G ] en los 5 quemadores', game.width / 2, 162);
    ctx.fillText('Pela la papa (50%+) y presiona [ ESPACIO ] para SUPERCARGA', game.width / 2, 186);
    ctx.fillText(`Notas de guitarra cargadas: ${game.notes.length} papas`, game.width / 2, 212);

    ctx.fillStyle = '#4ade80';
    ctx.font = '24px VT323, monospace';
    ctx.fillText(
      game.isLoadingChart ? 'CARGANDO CHART Y MULTIPISTA...' : '▶ PRESIONA ESPACIO O CLIC PARA EMPEZAR ◀',
      game.width / 2,
      252
    );
    ctx.textAlign = 'left';
  }

  drawGameOverOverlay(ctx, game) {
    ctx.fillStyle = 'rgba(20, 0, 0, 0.88)';
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = '44px VT323, monospace';
    ctx.fillText('¡SE QUEMARON LAS PAPAS!', game.width / 2, 150);

    ctx.fillStyle = '#fde047';
    ctx.font = '22px VT323, monospace';
    ctx.fillText(`Puntaje: ${game.score} | Racha Máxima: ${game.maxCombo}`, game.width / 2, 190);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px VT323, monospace';
    ctx.fillText('Presiona [ R ] o [ ESPACIO ] para reintentar', game.width / 2, 232);
    ctx.textAlign = 'left';
  }
}
