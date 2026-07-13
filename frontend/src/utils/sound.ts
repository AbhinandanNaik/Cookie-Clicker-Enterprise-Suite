class SoundManager {
  private ctx: AudioContext | null = null;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playClick() {
    try {
      const context = this.initContext();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, context.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.05); // A5

      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + 0.08);
    } catch (e) {
      console.warn("Web Audio not supported yet or context suspended:", e);
    }
  }

  playUpgrade() {
    try {
      const context = this.initContext();
      const now = context.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Arpeggio)

      notes.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(time);
        osc.stop(time + 0.15);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  playAchievement() {
    try {
      const context = this.initContext();
      const now = context.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Chord)

      notes.forEach((freq) => {
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.3);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start();
        osc.stop(now + 0.5);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  playGoldenCookie() {
    try {
      const context = this.initContext();
      const now = context.currentTime;
      
      // Twinkle effect: multiple random high frequencies
      for (let i = 0; i < 6; i++) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const start = now + i * 0.06;
        const freq = 1200 + Math.random() * 800;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.05, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);

        osc.connect(gain);
        gain.connect(context.destination);

        osc.start(start);
        osc.stop(start + 0.2);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  playError() {
    try {
      const context = this.initContext();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, context.currentTime);

      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(context.destination);

      osc.start();
      osc.stop(context.currentTime + 0.2);
    } catch (e) {
      console.warn(e);
    }
  }
}

export const sound = new SoundManager();
