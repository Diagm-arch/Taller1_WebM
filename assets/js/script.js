// Efecto interactivo: El brillo de fondo sigue ligeramente el cursor en el showcase del producto
document.addEventListener('DOMContentLoaded', () => {
  const card = document.querySelector('.product-card');
  const glow = document.querySelector('.glow-effect');

  if (card && glow) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Movimiento suave y acotado del halo de luz
      glow.style.transform = `translate(${x * 0.4}px, ${y * 0.4}px)`;
    });

    card.addEventListener('mouseleave', () => {
      glow.style.transform = 'translate(0px, 0px)';
      glow.style.transition = 'transform 0.5s ease-out';
    });

    card.addEventListener('mouseenter', () => {
      glow.style.transition = 'none';
    });
  }

  // Animación de entrada suave con IntersectionObserver para las tarjetas
  const cards = document.querySelectorAll('.feature-card, .stat-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(c => {
    c.style.opacity = '0';
    c.style.transform = 'translateY(15px)';
    c.style.transition = 'opacity 0.6s ease-out, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(c);
  });
  
body::before, body::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  filter: blur(100px); 
  z-index: -1;
  pointer-events: none; 
}

body::before {
  top: -20vh;
  left: -10vw;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, rgba(120, 119, 198, 0.08) 0%, transparent 60%);
  animation: floatAmbient 20s infinite alternate ease-in-out;
}
body::after {
  bottom: -20vh;
  right: -10vw;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 60%);
  animation: floatAmbient 25s infinite alternate-reverse ease-in-out;
}

@keyframes floatAmbient {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(10vw, 5vh) scale(1.1); }
}
});
