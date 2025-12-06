/**
 * Complex number implementation for quantum computations
 */
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

/**
 * State vector for multi-qubit system
 */
export class StateVector {
  public amplitudes: Complex[];

  constructor(numQubits: number) {
    const size = 1 << numQubits;
    this.amplitudes = new Array(size).fill(null).map(() => Complex.zero());
    this.amplitudes[0] = Complex.one(); // Initialize to |0...0⟩
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

  /**
   * Get probability of measuring a specific basis state
   */
  probability(index: number): number {
    return this.amplitudes[index].absSquared();
  }

  /**
   * Get probability of specific qubit being |1⟩
   */
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

  /**
   * Measure specific qubit, collapsing the state
   * Returns measurement result (0 or 1)
   */
  measureQubit(qubitIndex: number): number {
    const prob1 = this.qubitProbability(qubitIndex);
    const result = Math.random() < prob1 ? 1 : 0;
    
    // Collapse the state
    const mask = 1 << qubitIndex;
    const newAmplitudes = this.amplitudes.map((amp, i) => {
      const qubitValue = (i & mask) ? 1 : 0;
      return qubitValue === result ? amp : Complex.zero();
    });
    
    this.amplitudes = newAmplitudes;
    this.normalize();
    
    return result;
  }

  /**
   * Get Bloch sphere coordinates for a single qubit (if isolated) or reduced density matrix
   * Returns [x, y, z] coordinates on Bloch sphere
   */
  getBlochCoordinates(qubitIndex: number): [number, number, number] {
    // Compute reduced density matrix for single qubit
    const n = this.numQubits;
    const mask = 1 << qubitIndex;
    
    // ρ_00, ρ_01, ρ_10, ρ_11 for the reduced density matrix
    let rho00 = Complex.zero();
    let rho01 = Complex.zero();
    let rho11 = Complex.zero();
    
    for (let i = 0; i < this.dimension; i++) {
      const qubitVal = (i & mask) ? 1 : 0;
      const amp_i = this.amplitudes[i];
      
      for (let j = 0; j < this.dimension; j++) {
        // Check if i and j differ only in the target qubit
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
    
    // Bloch coordinates from density matrix
    // ρ = (I + x*X + y*Y + z*Z) / 2
    // x = Tr(ρX) = ρ_01 + ρ_10 = 2*Re(ρ_01)
    // y = Tr(ρY) = i(ρ_01 - ρ_10) = 2*Im(ρ_01)  (note: with proper sign)
    // z = Tr(ρZ) = ρ_00 - ρ_11
    
    const x = 2 * rho01.re;
    const y = -2 * rho01.im; // Negative because Y = [[0,-i],[i,0]]
    const z = rho00.re - rho11.re;
    
    return [x, y, z];
  }

  clone(): StateVector {
    return StateVector.fromAmplitudes(this.amplitudes);
  }

  /**
   * Inner product ⟨this|other⟩
   */
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

  /**
   * Fidelity with another state
   */
  fidelity(other: StateVector): number {
    if (this.dimension !== other.dimension) {
      return 0;
    }
    return this.inner(other).absSquared();
  }

  /**
   * Get basis state representation (e.g., "|000⟩", "|101⟩")
   */
  static basisStateLabel(index: number, numQubits: number): string {
    return '|' + index.toString(2).padStart(numQubits, '0') + '⟩';
  }

  /**
   * Get human-readable state representation
   */
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

