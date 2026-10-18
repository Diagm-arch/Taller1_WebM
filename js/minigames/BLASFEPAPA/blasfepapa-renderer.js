// js/minigames/BLASFEPAPA/blasfepapa-renderer.js

export class BlasfepapaRenderer {
  render(game) {
    const ctx = game.ctx;

    ctx.fillStyle = game.zone === 1 ? '#120a07' : '#0b0914';
    ctx.fillRect(0, 0, game.width, game.height);

    this.drawGothicBackground(ctx, game);
    this.drawPlatformsAndLadders(ctx, game);

    if (game.section === 1) {
      this.drawShrine(ctx, game);
      if (game.zone === 1) {
        this.drawZone1TutorialTablets(ctx);
      }
    }

    this.drawPlayer(ctx, game);
    this.drawEnemies(ctx, game);
    this.drawBoss(ctx, game);

    for (const proj of game.projectiles) {
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const pt of game.particles) {
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, 4, 4);
    }

    this.drawHUD(ctx, game);
  }

  drawGothicBackground(ctx, game) {
    ctx.strokeStyle = game.zone === 1 ? '#291811' : '#1e1b2e';
    ctx.lineWidth = 4;
    for (let x = 80; x < game.width; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x - 50, game.groundY);
      ctx.lineTo(x - 50, 140);
      ctx.quadraticCurveTo(x, 60, x + 50, 140);
      ctx.lineTo(x + 50, game.groundY);
      ctx.stroke();
    }

    ctx.fillStyle = game.zone === 1 ? '#27170e' : '#181326';
    ctx.fillRect(0, game.groundY, game.width, game.height - game.groundY);
    ctx.fillStyle = game.zone === 1 ? '#78350f' : '#4c1d95';
    ctx.fillRect(0, game.groundY, game.width, 4);

    const roomCombatActive = game.enemies.length > 0 || game.boss !== null;
    if (!roomCombatActive && !(game.zone === 2 && game.section === 3)) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = '18px VT323, monospace';
      ctx.fillText('AVANZAR ➔', game.width - 95, game.groundY - 15);
    }
  }

  drawPlatformsAndLadders(ctx, game) {
    ctx.strokeStyle = '#57534e';
    ctx.lineWidth = 3;
    for (const l of game.ladders) {
      for (let y = l.y; y < l.y + l.h; y += 12) {
        ctx.strokeRect(l.x + 8, y, 10, 8);
      }
    }

    for (const plat of game.platforms) {
      ctx.fillStyle = '#44403c';
      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeStyle = '#a8a29e';
      ctx.lineWidth = 1;
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }
  }

  drawShrine(ctx, game) {
    if (!game.shrine) return;
    const s = game.shrine;
    const near = game.isNearAltar();

    if (near) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + 38, 48, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#78350f';
    ctx.fillRect(s.x + 10, s.y + 28, 28, 50);
    ctx.fillStyle = near ? '#fbbf24' : '#d97706';
    ctx.fillRect(s.x + 4, s.y + 24, 40, 6);
    ctx.fillRect(s.x + 20, s.y, 8, 38);
    ctx.fillRect(s.x + 12, s.y + 10, 24, 6);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(s.x + 6, s.y + 16, 5, 8);
    ctx.fillRect(s.x + 37, s.y + 16, 5, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(s.x + 7, s.y + 11, 3, 5);
    ctx.fillRect(s.x + 38, s.y + 11, 3, 5);

    ctx.fillStyle = near ? '#facc15' : '#fde68a';
    ctx.font = '16px VT323, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      near ? '▶ [E / BOTÓN VIAL] RECARGAR 3 VIALES Y VIDA ◀' : '[E / VIAL] ALTAR: RECARGAR VIALES',
      s.x + s.w / 2,
      s.y - 12
    );
    ctx.textAlign = 'left';
  }

  drawZone1TutorialTablets(ctx) {
    const cards = [
      {
        x: 45,
        title: 'I. MOVIMIENTO (4 DIRECCIONES)',
        line1: '[A / D] o Cruceta: Moverse',
        line2: '[W / ▲] Saltar y Subir cadenas',
        line3: '[S / ▼] Agacharse y Bajar'
      },
      {
        x: 285,
        title: 'II. ESQUIVA Y ESPADA',
        line1: '[SPACE / ESQUIVA] Paso sombrío',
        line2: '[Z / ESPADA] Atacar con acero',
        line3: '(Combina con ▲ o ▼ en el aire)'
      },
      {
        x: 525,
        title: 'III. 3 VIALES Y ALTAR',
        line1: '[Q / VIAL] Beber Vial (+45% HP)',
        line2: '[E / VIAL] En el Altar: Recarga',
        line3: 'los 3 Viales y restaura salud'
      }
    ];

    cards.forEach(c => {
      ctx.fillStyle = 'rgba(24, 15, 10, 0.88)';
      ctx.fillRect(c.x, 68, 225, 88);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, 68, 225, 88);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px VT323, monospace';
      ctx.fillText(c.title, c.x + 10, 88);

      ctx.fillStyle = '#e7e5e4';
      ctx.font = '15px VT323, monospace';
      ctx.fillText(c.line1, c.x + 10, 108);
      ctx.fillText(c.line2, c.x + 10, 126);
      ctx.fillText(c.line3, c.x + 10, 144);
    });
  }

  drawPlayer(ctx, game) {
    const p = game.player;

    for (const img of p.afterimages) {
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.5;
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(img.x, img.y, p.w, p.h);
      ctx.restore();
    }

    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0 && !p.isDodging) {
      return;
    }

    ctx.save();
    const cx = p.x + p.w / 2;
    const cy = p.y + (p.crouching ? 8 : 0);

    if (p.healEffectTimer > 0) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + 18, 24 + Math.sin(performance.now() * 0.03) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 1. Capa Victoriana Carmesí Oscura
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.moveTo(cx - p.facing * 4, cy + 10);
    ctx.lineTo(cx - p.facing * 20, cy + 36);
    ctx.lineTo(cx - p.facing * 6, cy + 36);
    ctx.closePath();
    ctx.fill();

    // 2. Cuerpo de Papa
    ctx.fillStyle = '#b48343';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 20, 14, p.crouching ? 14 : 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a18';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#784f24';
    ctx.fillRect(cx - 6, cy + 24, 3, 2);
    ctx.fillRect(cx + 4, cy + 16, 2, 2);

    // 3. Armadura Victoriana
    ctx.fillStyle = '#52525b';
    ctx.fillRect(cx - 11, cy + 14, 22, 12);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 11, cy + 14, 22, 12);

    ctx.fillStyle = '#71717a';
    ctx.beginPath();
    ctx.arc(cx - p.facing * 6, cy + 15, 7, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.stroke();

    // Yelmo / Capirote Victoriano
    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy + 8);
    ctx.lineTo(cx, cy - 12);
    ctx.lineTo(cx + 11, cy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4d4d8';
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(cx + (p.facing === 1 ? 1 : -7), cy + 5, 6, 3);

    // 4. Espada Victoriana
    if (p.isAttacking) {
      const hb = game.getSwordHitbox();
      ctx.fillStyle = 'rgba(251, 191, 36, 0.35)';
      ctx.fillRect(hb.x, hb.y, hb.w, hb.h);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(hb.x + 2, hb.y + 2, hb.w - 4, hb.h - 4);

      ctx.fillStyle = '#e4e4e7';
      if (p.attackDir === 'up') {
        ctx.fillRect(cx - 3, p.y - 38, 6, 38);
      } else if (p.attackDir === 'down') {
        ctx.fillRect(cx - 3, p.y + p.h, 6, 38);
      } else {
        ctx.fillRect(p.facing === 1 ? cx + 8 : cx - 50, cy + 16, 42, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(p.facing === 1 ? cx + 8 : cx - 12, cy + 10, 4, 18);
      }
    } else {
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(cx + p.facing * 10, cy + 4, 4, 24);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + p.facing * 6, cy + 20, 12, 3);
    }

    ctx.restore();
  }

  drawEnemies(ctx, game) {
    for (const e of game.enemies) {
      if (e.type === 'worm') {
        if (e.state === 'burrow') continue;
        ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#d6d3d1';
        for (let s = 0; s < 4; s++) {
          const sx = e.x + s * 9;
          const sy = e.y + Math.sin(performance.now() * 0.01 + s) * 3;
          ctx.beginPath();
          ctx.arc(sx + 6, sy + 11, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(e.vx > 0 ? e.x + e.w - 4 : e.x, e.y + 8, 5, 8);
      } else if (e.type === 'moth') {
        const cx = e.x + e.w / 2;
        const cy = e.y + e.h / 2;
        const wingY = Math.sin(e.wingPhase) * 12;

        ctx.fillStyle = e.hurtTimer > 0 ? '#ffffff' : '#78716c';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 18, cy - wingY);
        ctx.lineTo(cx - 12, cy + 10);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 18, cy - wingY);
        ctx.lineTo(cx + 12, cy + 10);
        ctx.fill();

        ctx.fillStyle = '#44403c';
        ctx.fillRect(cx - 4, cy - 8, 8, 16);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cx - 3, cy - 6, 2, 2);
        ctx.fillRect(cx + 1, cy - 6, 2, 2);
      }
    }
  }

  drawBoss(ctx, game) {
    if (!game.boss) return;
    const b = game.boss;

    if (b.type === 'entwined_worms') {
      for (let i = 0; i < b.segmentsCount; i++) {
        const sA = b.wormA[i];
        const sB = b.wormB[i];
        if (!sA || !sB) continue;

        ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#e7e5e4';
        ctx.beginPath();
        ctx.arc(sA.x + 14, sA.y + 14, i === 0 ? 16 : 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#57534e';
        ctx.stroke();

        ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#991b1b';
        ctx.beginPath();
        ctx.arc(sB.x + 14, sB.y + 14, i === 0 ? 16 : 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.stroke();
      }
    } else if (b.type === 'final_moth') {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const flap = Math.sin(b.wingAngle) * 26;

      ctx.fillStyle = b.hurtTimer > 0 ? '#ffffff' : '#57534e';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 48, cy - 18 + flap);
      ctx.lineTo(cx - 38, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 48, cy - 18 + flap);
      ctx.lineTo(cx + 38, cy + 24);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 12, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 6, cy - 16, 4, 4);
      ctx.fillRect(cx + 2, cy - 16, 4, 4);
    }
  }

  drawHUD(ctx, game) {
    const p = game.player;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(14, 10, 256, 38);
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 10, 256, 38);

    ctx.fillStyle = '#450a0a';
    ctx.fillRect(22, 17, 155, 12);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(22, 17, (p.hp / p.maxHp) * 155, 12);
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.strokeRect(22, 17, 155, 12);

    ctx.fillStyle = '#1c1917';
    ctx.fillRect(22, 34, 125, 6);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(22, 34, (p.stamina / p.maxStamina) * 125, 6);

    for (let i = 0; i < p.maxVials; i++) {
      const vx = 188 + i * 24;
      const vy = 16;
      const isFull = i < p.vials;

      ctx.fillStyle = isFull ? '#facc15' : '#57534e';
      ctx.fillRect(vx + 5, vy, 6, 4);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(vx + 4, vy + 4, 8, 4);

      ctx.fillStyle = isFull ? '#dc2626' : '#1c1917';
      ctx.fillRect(vx + 1, vy + 8, 14, 18);

      if (isFull) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(vx + 3, vy + 10, 3, 6);
      }

      ctx.strokeStyle = isFull ? '#fde047' : '#57534e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(vx + 1, vy + 8, 14, 18);
    }

    ctx.fillStyle = '#fbbf24';
    ctx.font = '18px VT323, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ZONA ${game.zone} - SECCIÓN ${game.section}/3`, game.width - 18, 30);
    ctx.textAlign = 'left';

    if (game.boss) {
      const b = game.boss;
      const barW = 460;
      const barX = (game.width - barW) / 2;
      const barY = game.height - 42;

      ctx.fillStyle = '#fde68a';
      ctx.font = '18px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, game.width / 2, barY - 6);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(barX, barY, barW, 14);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(barX, barY, Math.max(0, (b.hp / b.maxHp) * barW), 14);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, 14);
    }

    if (game.bannerTimer > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(0, 175, game.width, 54);
      ctx.strokeStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(0, 175); ctx.lineTo(game.width, 175);
      ctx.moveTo(0, 229); ctx.lineTo(game.width, 229);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.font = '26px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.bannerText, game.width / 2, 209);
      ctx.textAlign = 'left';
    }

    if (game.isGameOver) {
      ctx.fillStyle = 'rgba(15, 5, 5, 0.88)';
      ctx.fillRect(0, 0, game.width, game.height);
      ctx.fillStyle = '#dc2626';
      ctx.font = '48px VT323, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TUBÉRCULO MARCHITO', game.width / 2, game.height / 2 - 10);
      ctx.fillStyle = '#e7e5e4';
      ctx.font = '22px VT323, monospace';
      ctx.fillText('Presiona [ R / ESPACIO ] o TOCA LA PANTALLA para renacer en el Altar', game.width / 2, game.height / 2 + 30);
      ctx.textAlign = 'left';
    }
  }
}
