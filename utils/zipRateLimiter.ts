interface RateLimitState {
  downloads: number;
  lastReset: number;
  blocked: boolean;
  blockUntil?: number;
}

interface RateLimitConfig {
  maxDownloads: number;
  windowMs: number;
  blockDurationMs: number;
}

class ZipRateLimiter {
  private static instance: ZipRateLimiter;
  private storage: Storage;
  private config: RateLimitConfig;

  private constructor() {
    this.storage = localStorage;
    this.config = {
      maxDownloads: 3, // 3 descargas por ventana de tiempo
      windowMs: 60 * 60 * 1000, // 1 hora
      blockDurationMs: 60 * 60 * 1000 // Bloqueo por 1 hora
    };
  }

  static getInstance(): ZipRateLimiter {
    if (!ZipRateLimiter.instance) {
      ZipRateLimiter.instance = new ZipRateLimiter();
    }
    return ZipRateLimiter.instance;
  }

  private getStorageKey(identifier: string): string {
    return `epk_zip_rate_limit_${identifier}`;
  }

  private getCurrentState(identifier: string): RateLimitState {
    const key = this.getStorageKey(identifier);
    const stored = this.storage.getItem(key);
    
    if (!stored) {
      return {
        downloads: 0,
        lastReset: Date.now(),
        blocked: false
      };
    }

    try {
      const state: RateLimitState = JSON.parse(stored);
      const now = Date.now();

      // Reset si ha pasado la ventana de tiempo
      if (now - state.lastReset > this.config.windowMs) {
        return {
          downloads: 0,
          lastReset: now,
          blocked: false
        };
      }

      // Revisar si el bloqueo ha expirado
      if (state.blocked && state.blockUntil && now > state.blockUntil) {
        return {
          downloads: 0,
          lastReset: now,
          blocked: false
        };
      }

      return state;
    } catch {
      return {
        downloads: 0,
        lastReset: Date.now(),
        blocked: false
      };
    }
  }

  private saveState(identifier: string, state: RateLimitState): void {
    const key = this.getStorageKey(identifier);
    this.storage.setItem(key, JSON.stringify(state));
  }

  canDownload(identifier: string): { allowed: boolean; reason?: string; timeLeft?: number } {
    const state = this.getCurrentState(identifier);
    const now = Date.now();

    if (state.blocked) {
      const timeLeft = state.blockUntil ? Math.max(0, state.blockUntil - now) : 0;
      return {
        allowed: false,
        reason: 'BLOCKED',
        timeLeft
      };
    }

    if (state.downloads >= this.config.maxDownloads) {
      const timeLeft = Math.max(0, (state.lastReset + this.config.windowMs) - now);
      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        timeLeft
      };
    }

    return { allowed: true };
  }

  recordDownload(identifier: string): boolean {
    const check = this.canDownload(identifier);
    if (!check.allowed) {
      return false;
    }

    const state = this.getCurrentState(identifier);
    state.downloads += 1;

    // Si alcanza el límite, bloquear
    if (state.downloads >= this.config.maxDownloads) {
      state.blocked = true;
      state.blockUntil = Date.now() + this.config.blockDurationMs;
    }

    this.saveState(identifier, state);
    return true;
  }

  getRemainingDownloads(identifier: string): number {
    const state = this.getCurrentState(identifier);
    return Math.max(0, this.config.maxDownloads - state.downloads);
  }

  getTimeUntilReset(identifier: string): number {
    const state = this.getCurrentState(identifier);
    const now = Date.now();
    
    if (state.blocked && state.blockUntil) {
      return Math.max(0, state.blockUntil - now);
    }
    
    return Math.max(0, (state.lastReset + this.config.windowMs) - now);
  }

  getStatus(identifier: string): {
    downloads: number;
    maxDownloads: number;
    blocked: boolean;
    timeLeft: number;
    canDownload: boolean;
  } {
    const state = this.getCurrentState(identifier);
    const check = this.canDownload(identifier);
    
    return {
      downloads: state.downloads,
      maxDownloads: this.config.maxDownloads,
      blocked: state.blocked,
      timeLeft: check.timeLeft || 0,
      canDownload: check.allowed
    };
  }

  // Método para administradores para resetear límites
  resetLimits(identifier: string): void {
    const key = this.getStorageKey(identifier);
    this.storage.removeItem(key);
  }
}

export default ZipRateLimiter;