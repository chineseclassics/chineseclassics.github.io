/**
 * AudioManager - 處理遊戲音效
 */
export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    play(type) {
        if (!this.enabled) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        switch (type) {
            case 'wake':
                this.playTone(220, 440, 0.2);
                break;
            case 'grab':
                this.playTone(440, 660, 0.1);
                break;
            case 'throw':
                this.playNoise(0.1, 0.5);
                break;
            case 'hit_correct':
                this.playTone(880, 1320, 0.3);
                break;
            case 'hit_wrong':
                this.playTone(220, 110, 0.3);
                break;
            case 'success':
                this.playMelody([523, 659, 783, 1046], 0.1);
                break;
            case 'fail':
                this.playMelody([330, 261, 196], 0.2);
                break;
            case 'click':
                this.playTone(600, 600, 0.05);
                break;
        }
    }

    /**
     * 播放簡單的滑音
     */
    playTone(startFreq, endFreq, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    /**
     * 播放簡單的旋律
     */
    playMelody(notes, noteDuration) {
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, freq, noteDuration);
            }, i * noteDuration * 1000);
        });
    }

    /**
     * 播放白噪音 (模擬投擲風聲)
     */
    playNoise(duration, volume) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start();
    }
}

