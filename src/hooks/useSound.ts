import { useCallback } from 'react';

// Sound frequencies for different types of notifications
const SOUND_FREQUENCIES = {
  customerCreated: [523.25, 659.25, 783.99], // C5, E5, G5 - major chord
  quotationCreated: [440, 554.37, 659.25], // A4, C#5, E5 - A major chord
  quotationClosed: [392, 523.25, 659.25, 783.99], // G4, C5, E5, G5 - success progression
};

const SOUND_DURATIONS = {
  customerCreated: 300,
  quotationCreated: 350,
  quotationClosed: 500,
};

export const useSound = () => {
  const playChime = useCallback((type: keyof typeof SOUND_FREQUENCIES) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const frequencies = SOUND_FREQUENCIES[type];
      const duration = SOUND_DURATIONS[type];
      
      // Create a gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      // Play each frequency in sequence for harmony
      frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.connect(gainNode);
        
        const startTime = audioContext.currentTime + (index * 0.1);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration / 1000);
      });
      
      // Clean up audio context after sound finishes
      setTimeout(() => {
        audioContext.close();
      }, duration + 100);
    } catch (error) {
      console.warn('Audio playback not supported:', error);
    }
  }, []);

  return { playChime };
};