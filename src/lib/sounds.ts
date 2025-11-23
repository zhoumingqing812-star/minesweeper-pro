// 使用 Web Audio API 生成简单音效
class SoundEffects {
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private enabled: boolean = true

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
      this.gainNode.gain.value = 0.3
    }
    return this.audioContext
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  isEnabled() {
    return this.enabled
  }

  // 点击音效 - 短促的点击声
  playClick() {
    if (!this.enabled) return
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(this.gainNode!)

    oscillator.frequency.value = 600
    oscillator.type = 'sine'

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  }

  // 插旗音效 - 清脆的插入声
  playFlag() {
    if (!this.enabled) return
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(this.gainNode!)

    oscillator.frequency.setValueAtTime(800, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)
    oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)
    oscillator.type = 'square'

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  }

  // 爆炸音效 - 低沉的爆炸声
  playExplosion() {
    if (!this.enabled) return
    const ctx = this.getContext()

    // 噪音生成器
    const bufferSize = ctx.sampleRate * 0.5
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1))
    }

    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    // 低通滤波器让声音更低沉
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1000, ctx.currentTime)
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.gainNode!)

    noise.start(ctx.currentTime)
    noise.stop(ctx.currentTime + 0.5)

    // 低频震动
    const oscillator = ctx.createOscillator()
    const oscGain = ctx.createGain()

    oscillator.frequency.setValueAtTime(150, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3)
    oscillator.type = 'sine'

    oscGain.gain.setValueAtTime(0.4, ctx.currentTime)
    oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.connect(oscGain)
    oscGain.connect(this.gainNode!)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }

  // 胜利音效 - 欢快的上升音阶
  playVictory() {
    if (!this.enabled) return
    const ctx = this.getContext()

    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    const duration = 0.15

    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.connect(gain)
      gain.connect(this.gainNode!)

      oscillator.frequency.value = freq
      oscillator.type = 'sine'

      const startTime = ctx.currentTime + i * duration
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)

      oscillator.start(startTime)
      oscillator.stop(startTime + duration)
    })
  }

  // 翻开空白格音效 - 柔和的展开声
  playReveal() {
    if (!this.enabled) return
    const ctx = this.getContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.connect(gain)
    gain.connect(this.gainNode!)

    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08)
    oscillator.type = 'sine'

    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.08)
  }
}

export const soundEffects = new SoundEffects()
