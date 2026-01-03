export class Complex {
  constructor(public re: number, public im: number = 0) {}

  static zero(): Complex {
    return new Complex(0, 0);
  }

  static one(): Complex {
    return new Complex(1, 0);
  }

  static i(): Complex {
    return new Complex(0, 1);
  }

  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(other: Complex): Complex {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other: Complex): Complex {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  mul(other: Complex): Complex {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  scale(s: number): Complex {
    return new Complex(this.re * s, this.im * s);
  }

  div(other: Complex): Complex {
    const denom = other.re * other.re + other.im * other.im;
    return new Complex(
      (this.re * other.re + this.im * other.im) / denom,
      (this.im * other.re - this.re * other.im) / denom
    );
  }

  conjugate(): Complex {
    return new Complex(this.re, -this.im);
  }

  abs(): number {
    return Math.sqrt(this.re * this.re + this.im * this.im);
  }

  absSquared(): number {
    return this.re * this.re + this.im * this.im;
  }

  phase(): number {
    return Math.atan2(this.im, this.re);
  }

  equals(other: Complex, epsilon: number = 1e-10): boolean {
    return Math.abs(this.re - other.re) < epsilon && 
           Math.abs(this.im - other.im) < epsilon;
  }

  toString(): string {
    if (Math.abs(this.im) < 1e-10) {
      return this.re.toFixed(4);
    }
    if (Math.abs(this.re) < 1e-10) {
      return `${this.im.toFixed(4)}i`;
    }
    const sign = this.im >= 0 ? '+' : '-';
    return `${this.re.toFixed(4)}${sign}${Math.abs(this.im).toFixed(4)}i`;
  }

  clone(): Complex {
    return new Complex(this.re, this.im);
  }
}

export class StateVector {
  public amplitudes: Complex[];

  constructor(numQubits: number) {
    const size = 1 << numQubits;
    this.amplitudes = new Array(size).fill(null).map(() => Complex.zero());
    this.amplitudes[0] = Complex.one(); 
  }

  static fromAmplitudes(amplitudes: Complex[]): StateVector {
    const numQubits = Math.log2(amplitudes.length);
    if (!Number.isInteger(numQubits)) {
      throw new Error('Amplitudes length must be a power of 2');
    }
    const sv = new StateVector(numQubits);
    sv.amplitudes = amplitudes.map(a => a.clone());
    return sv;
  }

  get numQubits(): number {
    return Math.log2(this.amplitudes.length);
  }

  get dimension(): number {
    return this.amplitudes.length;
  }

  normalize(): void {
    let norm = 0;
    for (const amp of this.amplitudes) {
      norm += amp.absSquared();
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-10) {
      for (let i = 0; i < this.amplitudes.length; i++) {
        this.amplitudes[i] = this.amplitudes[i].scale(1 / norm);
      }
    }
  }
  
  probability(index: number): number {
    return this.amplitudes[index].absSquared();
  }
  
  qubitProbability(qubitIndex: number): number {
    let prob = 0;
    const mask = 1 << qubitIndex;
    for (let i = 0; i < this.amplitudes.length; i++) {
      if (i & mask) {
        prob += this.amplitudes[i].absSquared();
      }
    }
    return prob;
  }
  
  measureQubit(qubitIndex: number): number {
    const prob1 = this.qubitProbability(qubitIndex);
    const result = Math.random() < prob1 ? 1 : 0;
    
    const mask = 1 << qubitIndex;
    const newAmplitudes = this.amplitudes.map((amp, i) => {
      const qubitValue = (i & mask) ? 1 : 0;
      return qubitValue === result ? amp : Complex.zero();
    });
    
    this.amplitudes = newAmplitudes;
    this.normalize();
    
    return result;
  }
  
  getBlochCoordinates(qubitIndex: number): [number, number, number] {
    
    const n = this.numQubits;
    const mask = 1 << qubitIndex;
    
    let rho00 = Complex.zero();
    let rho01 = Complex.zero();
    let rho11 = Complex.zero();
    
    for (let i = 0; i < this.dimension; i++) {
      const qubitVal = (i & mask) ? 1 : 0;
      const amp_i = this.amplitudes[i];
      
      for (let j = 0; j < this.dimension; j++) {
        
        const jQubitVal = (j & mask) ? 1 : 0;
        if ((i ^ j) === (qubitVal ^ jQubitVal) * mask) {
          const amp_j = this.amplitudes[j];
          const contrib = amp_i.mul(amp_j.conjugate());
          
          if (qubitVal === 0 && jQubitVal === 0) {
            rho00 = rho00.add(contrib);
          } else if (qubitVal === 0 && jQubitVal === 1) {
            rho01 = rho01.add(contrib);
          } else if (qubitVal === 1 && jQubitVal === 1) {
            rho11 = rho11.add(contrib);
          }
        }
      }
    }
    
    const x = 2 * rho01.re;
    const y = -2 * rho01.im; 
    const z = rho00.re - rho11.re;
    
    return [x, y, z];
  }

  clone(): StateVector {
    return StateVector.fromAmplitudes(this.amplitudes);
  }
  
  inner(other: StateVector): Complex {
    if (this.dimension !== other.dimension) {
      return Complex.zero();
    }
    let result = Complex.zero();
    for (let i = 0; i < this.amplitudes.length; i++) {
      const a = this.amplitudes[i];
      const b = other.amplitudes[i];
      if (a && b) {
        result = result.add(a.conjugate().mul(b));
      }
    }
    return result;
  }
  
  fidelity(other: StateVector): number {
    if (this.dimension !== other.dimension) {
      return 0;
    }
    return this.inner(other).absSquared();
  }
  
  static basisStateLabel(index: number, numQubits: number): string {
    return '|' + index.toString(2).padStart(numQubits, '0') + '⟩';
  }
  
  toString(threshold: number = 0.01): string {
    const terms: string[] = [];
    const n = this.numQubits;
    
    for (let i = 0; i < this.amplitudes.length; i++) {
      const amp = this.amplitudes[i];
      if (amp.absSquared() > threshold) {
        const label = StateVector.basisStateLabel(i, n);
        terms.push(`(${amp.toString()})${label}`);
      }
    }
    
    return terms.length > 0 ? terms.join(' + ') : '0';
  }
}
