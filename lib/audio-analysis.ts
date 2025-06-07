export interface AudioFeatures {
  tempo: number
  key: string
  timeSignature: string
  duration: number
  harmonicComplexity: number
  rhythmicComplexity: number
  energy: number
  loudness: number
  spectralCentroid: number
  spectralBandwidth: number
  mfcc: number[]
  chroma: number[]
  createdAt: Date
}

export interface MusicalCompatibility {
  userId: string
  features: AudioFeatures
  compatibilityFactors: {
    tempoRange: [number, number]
    harmonicStyle: string[]
    rhythmicPreference: string[]
    energyLevel: string
    instrumentalFocus: string[]
  }
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  async analyzeAudioFile(file: File): Promise<AudioFeatures> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio context not available')
      }

      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      // Extract basic audio features
      const duration = audioBuffer.duration
      const sampleRate = audioBuffer.sampleRate
      const channelData = audioBuffer.getChannelData(0)

      // Calculate tempo using beat detection
      const tempo = await this.estimateTempo(channelData, sampleRate)
      
      // Estimate key using chroma analysis
      const chromaVector = this.calculateChroma(channelData, sampleRate)
      const key = this.estimateKey(chromaVector)
      
      // Calculate spectral features
      const spectralFeatures = this.calculateSpectralFeatures(channelData, sampleRate)
      
      // Calculate MFCC features
      const mfcc = this.calculateMFCC(channelData, sampleRate)
      
      // Calculate complexity measures
      const harmonicComplexity = this.calculateHarmonicComplexity(chromaVector)
      const rhythmicComplexity = this.calculateRhythmicComplexity(channelData, sampleRate)
      
      // Calculate energy and loudness
      const energy = this.calculateEnergy(channelData)
      const loudness = this.calculateLoudness(channelData)

      return {
        tempo,
        key,
        timeSignature: this.estimateTimeSignature(channelData, sampleRate, tempo),
        duration,
        harmonicComplexity,
        rhythmicComplexity,
        energy,
        loudness,
        spectralCentroid: spectralFeatures.centroid,
        spectralBandwidth: spectralFeatures.bandwidth,
        mfcc,
        chroma: chromaVector,
        createdAt: new Date()
      }
    } catch (error) {
      console.error('Audio analysis error:', error)
      throw new Error('Failed to analyze audio file')
    }
  }

  private async estimateTempo(channelData: Float32Array, sampleRate: number): Promise<number> {
    // Simplified tempo estimation using onset detection
    const windowSize = 1024
    const hopSize = 512
    const onsets: number[] = []
    
    // Calculate spectral flux for onset detection
    let previousSpectrum: number[] = []
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize)
      const spectrum = this.calculateSpectrum(window)
      
      if (previousSpectrum.length > 0) {
        const flux = this.calculateSpectralFlux(spectrum, previousSpectrum)
        if (flux > 0.1) { // Threshold for onset detection
          onsets.push(i / sampleRate)
        }
      }
      previousSpectrum = spectrum
    }
    
    // Estimate tempo from onset intervals
    if (onsets.length < 2) return 120 // Default tempo
    
    const intervals: number[] = []
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i-1])
    }
    
    // Find most common interval (simplified)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const bpm = 60 / avgInterval
    
    // Constrain to reasonable BPM range
    return Math.max(60, Math.min(200, Math.round(bpm)))
  }

  private calculateChroma(channelData: Float32Array, sampleRate: number): number[] {
    // Simplified chroma calculation
    const windowSize = 4096
    const chroma = new Array(12).fill(0)
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      const window = channelData.slice(i, i + windowSize)
      const spectrum = this.calculateSpectrum(window)
      
      // Map frequencies to pitch classes
      for (let j = 0; j < spectrum.length; j++) {
        const frequency = (j * sampleRate) / windowSize
        if (frequency > 80 && frequency < 2000) { // Focus on musical range
          const pitchClass = this.frequencyToPitchClass(frequency)
          chroma[pitchClass] += spectrum[j]
        }
      }
    }
    
    // Normalize chroma vector
    const sum = chroma.reduce((a, b) => a + b, 0)
    return sum > 0 ? chroma.map(c => c / sum) : chroma
  }

  private estimateKey(chroma: number[]): string {
    const keyProfiles = {
      'C': [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
      'G': [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
      'D': [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
      'A': [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
      'E': [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
      'F': [0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1]
    }
    
    let bestKey = 'C'
    let bestCorrelation = -1
    
    for (const [key, profile] of Object.entries(keyProfiles)) {
      const correlation = this.calculateCorrelation(chroma, profile)
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestKey = key
      }
    }
    
    return bestKey
  }

  private calculateSpectralFeatures(channelData: Float32Array, sampleRate: number) {
    const windowSize = 2048
    let centroidSum = 0
    let bandwidthSum = 0
    let windowCount = 0
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize / 2) {
      const window = channelData.slice(i, i + windowSize)
      const spectrum = this.calculateSpectrum(window)
      
      const centroid = this.calculateSpectralCentroid(spectrum, sampleRate)
      const bandwidth = this.calculateSpectralBandwidth(spectrum, sampleRate, centroid)
      
      centroidSum += centroid
      bandwidthSum += bandwidth
      windowCount++
    }
    
    return {
      centroid: centroidSum / windowCount,
      bandwidth: bandwidthSum / windowCount
    }
  }

  private calculateMFCC(channelData: Float32Array, sampleRate: number): number[] {
    // Simplified MFCC calculation (first 13 coefficients)
    const windowSize = 2048
    const mfccCoeffs = new Array(13).fill(0)
    let windowCount = 0
    
    for (let i = 0; i < channelData.length - windowSize; i += windowSize / 2) {
      const window = channelData.slice(i, i + windowSize)
      const spectrum = this.calculateSpectrum(window)
      const melSpectrum = this.calculateMelSpectrum(spectrum, sampleRate)
      const mfcc = this.calculateDCT(melSpectrum.map(Math.log))
      
      for (let j = 0; j < 13; j++) {
        mfccCoeffs[j] += mfcc[j] || 0
      }
      windowCount++
    }
    
    return mfccCoeffs.map(coeff => coeff / windowCount)
  }

  private calculateHarmonicComplexity(chroma: number[]): number {
    // Calculate entropy of chroma vector as complexity measure
    const entropy = chroma.reduce((sum, value) => {
      if (value > 0) {
        sum -= value * Math.log2(value)
      }
      return sum
    }, 0)
    
    return Math.min(1, entropy / Math.log2(12)) // Normalize to 0-1
  }

  private calculateRhythmicComplexity(channelData: Float32Array, sampleRate: number): number {
    // Calculate onset density as rhythmic complexity measure
    const windowSize = 1024
    const hopSize = 512
    let onsetCount = 0
    let previousSpectrum: number[] = []
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const window = channelData.slice(i, i + windowSize)
      const spectrum = this.calculateSpectrum(window)
      
      if (previousSpectrum.length > 0) {
        const flux = this.calculateSpectralFlux(spectrum, previousSpectrum)
        if (flux > 0.1) {
          onsetCount++
        }
      }
      previousSpectrum = spectrum
    }
    
    const duration = channelData.length / sampleRate
    const onsetRate = onsetCount / duration
    
    return Math.min(1, onsetRate / 10) // Normalize to 0-1
  }

  private calculateEnergy(channelData: Float32Array): number {
    const rms = Math.sqrt(
      channelData.reduce((sum, sample) => sum + sample * sample, 0) / channelData.length
    )
    return Math.min(1, rms * 10) // Normalize to 0-1
  }

  private calculateLoudness(channelData: Float32Array): number {
    const rms = Math.sqrt(
      channelData.reduce((sum, sample) => sum + sample * sample, 0) / channelData.length
    )
    // Convert to dB and normalize
    const dB = 20 * Math.log10(rms + 1e-10)
    return Math.max(0, Math.min(1, (dB + 60) / 60)) // Normalize -60dB to 0dB to 0-1
  }

  private estimateTimeSignature(channelData: Float32Array, sampleRate: number, tempo: number): string {
    // Simplified time signature estimation
    // This would normally involve more complex beat tracking
    const beatInterval = 60 / tempo
    const windowSize = Math.floor(beatInterval * sampleRate * 4) // 4 beats
    
    if (windowSize > channelData.length) return '4/4'
    
    // Analyze beat patterns (simplified)
    // In practice, this would involve autocorrelation and pattern matching
    return '4/4' // Default for demo
  }

  // Helper methods
  private calculateSpectrum(window: Float32Array): number[] {
    // Simplified FFT (would use a proper FFT library in production)
    const spectrum: number[] = []
    const N = window.length
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0
      let imag = 0
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N
        real += window[n] * Math.cos(angle)
        imag += window[n] * Math.sin(angle)
      }
      
      spectrum.push(Math.sqrt(real * real + imag * imag))
    }
    
    return spectrum
  }

  private calculateSpectralFlux(current: number[], previous: number[]): number {
    let flux = 0
    for (let i = 0; i < Math.min(current.length, previous.length); i++) {
      const diff = current[i] - previous[i]
      if (diff > 0) flux += diff
    }
    return flux
  }

  private frequencyToPitchClass(frequency: number): number {
    const A4 = 440
    const semitones = 12 * Math.log2(frequency / A4)
    return ((Math.round(semitones) + 9) % 12 + 12) % 12 // C = 0
  }

  private calculateCorrelation(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    const meanA = a.reduce((sum, val) => sum + val, 0) / a.length
    const meanB = b.reduce((sum, val) => sum + val, 0) / b.length
    
    let numerator = 0
    let denomA = 0
    let denomB = 0
    
    for (let i = 0; i < a.length; i++) {
      const diffA = a[i] - meanA
      const diffB = b[i] - meanB
      numerator += diffA * diffB
      denomA += diffA * diffA
      denomB += diffB * diffB
    }
    
    const denominator = Math.sqrt(denomA * denomB)
    return denominator === 0 ? 0 : numerator / denominator
  }

  private calculateSpectralCentroid(spectrum: number[], sampleRate: number): number {
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / (2 * spectrum.length)
      weightedSum += frequency * spectrum[i]
      magnitudeSum += spectrum[i]
    }
    
    return magnitudeSum === 0 ? 0 : weightedSum / magnitudeSum
  }

  private calculateSpectralBandwidth(spectrum: number[], sampleRate: number, centroid: number): number {
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 0; i < spectrum.length; i++) {
      const frequency = (i * sampleRate) / (2 * spectrum.length)
      const diff = frequency - centroid
      weightedSum += diff * diff * spectrum[i]
      magnitudeSum += spectrum[i]
    }
    
    return magnitudeSum === 0 ? 0 : Math.sqrt(weightedSum / magnitudeSum)
  }

  private calculateMelSpectrum(spectrum: number[], sampleRate: number): number[] {
    // Simplified mel filter bank (would use proper mel filters in production)
    const numFilters = 26
    const melSpectrum: number[] = []
    
    for (let i = 0; i < numFilters; i++) {
      const startIdx = Math.floor((i * spectrum.length) / numFilters)
      const endIdx = Math.floor(((i + 1) * spectrum.length) / numFilters)
      
      let sum = 0
      for (let j = startIdx; j < endIdx; j++) {
        sum += spectrum[j]
      }
      melSpectrum.push(sum / (endIdx - startIdx))
    }
    
    return melSpectrum
  }

  private calculateDCT(input: number[]): number[] {
    // Simplified DCT
    const output: number[] = []
    const N = input.length
    
    for (let k = 0; k < N; k++) {
      let sum = 0
      for (let n = 0; n < N; n++) {
        sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N))
      }
      output.push(sum)
    }
    
    return output
  }
}

// Standalone function for API usage
export async function analyzeAudioFeatures(input: File | string): Promise<AudioFeatures> {
  const analyzer = new AudioAnalyzer()
  
  if (typeof input === 'string') {
    // For server-side usage with filepath
    // Return mock data for now since we can't analyze files on server
    return {
      tempo: Math.floor(Math.random() * 60) + 80, // 80-140 BPM
      key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
      timeSignature: ['4/4', '3/4', '6/8'][Math.floor(Math.random() * 3)],
      duration: Math.floor(Math.random() * 180) + 60, // 1-4 minutes
      harmonicComplexity: Math.random(),
      rhythmicComplexity: Math.random(),
      energy: Math.random(),
      loudness: Math.random() * -20 - 10, // -30 to -10 dB
      spectralCentroid: Math.random() * 2000 + 1000,
      spectralBandwidth: Math.random() * 1000 + 500,
      mfcc: Array.from({ length: 13 }, () => Math.random() * 2 - 1),
      chroma: Array.from({ length: 12 }, () => Math.random()),
      createdAt: new Date()
    }
  } else {
    // For client-side usage with File object
    return analyzer.analyzeAudioFile(input)
  }
}
