import fs from 'fs';
import path from 'path';

/**
 * IOEF Enterprise Concurrency, Queue, Cache & Resilience Manager
 * Built to handle heavy bursts of concurrent registrations and AI analysis safely.
 */

// ==========================================
// 1. IN-MEMORY HIGH-SPEED CACHE
// ==========================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  public set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public invalidate(prefixOrKey: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefixOrKey) || key === prefixOrKey) {
        this.cache.delete(key);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const appCache = new CacheManager();

// ==========================================
// 2. TOKEN-BUCKET RATE LIMITER
// ==========================================
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();

  public checkLimit(
    identifier: string, 
    maxTokens: number = 60, 
    refillRatePerSec: number = 1
  ): { allowed: boolean; remaining: number } {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this.buckets.set(identifier, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    if (elapsedSeconds > 0) {
      bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsedSeconds * refillRatePerSec);
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: Math.floor(bucket.tokens) };
    }

    return { allowed: false, remaining: 0 };
  }

  // Periodic cleanup of stale client buckets every 10 minutes
  public cleanupStale(maxAgeMs: number = 600000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.lastRefill < cutoff) {
        this.buckets.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// ==========================================
// 3. ASYNC TASK QUEUE FOR HEAVY AI / OCR JOBS
// ==========================================
type TaskHandler<T> = () => Promise<T>;

interface QueuedTask<T> {
  id: string;
  name: string;
  execute: TaskHandler<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  priority: number; // Higher number = higher priority
  addedAt: number;
}

export class ConcurrencyTaskQueue {
  private queue: QueuedTask<any>[] = [];
  private activeCount: number = 0;
  private readonly maxConcurrent: number;
  private totalExecuted: number = 0;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  public enqueue<T>(execute: TaskHandler<T>, name: string = 'HeavyTask', priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        execute,
        resolve,
        reject,
        priority,
        addedAt: Date.now()
      };

      // Insert sorted by priority descending
      const insertIndex = this.queue.findIndex(t => t.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(task);
      } else {
        this.queue.splice(insertIndex, 0, task);
      }

      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeCount++;
    try {
      const result = await task.execute();
      this.totalExecuted++;
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  public getStats() {
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      totalExecuted: this.totalExecuted,
      maxConcurrent: this.maxConcurrent
    };
  }
}

export const aiTaskQueue = new ConcurrencyTaskQueue(3);

// ==========================================
// 4. PERFORMANCE & RESOURCE MONITOR
// ==========================================
interface RequestMetrics {
  totalRequests: number;
  totalErrors: number;
  latencies: number[];
  activeConnections: number;
  startTime: number;
}

class PerformanceMonitor {
  private metrics: RequestMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    latencies: [],
    activeConnections: 0,
    startTime: Date.now()
  };

  public recordRequest(latencyMs: number, isError: boolean = false): void {
    this.metrics.totalRequests++;
    if (isError) this.metrics.totalErrors++;
    this.metrics.latencies.push(latencyMs);
    if (this.metrics.latencies.length > 500) {
      this.metrics.latencies.shift(); // keep last 500
    }
  }

  public trackConnectionChange(delta: number): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections + delta);
  }

  public getHealthSummary() {
    const memory = process.memoryUsage();
    const avgLatency = this.metrics.latencies.length > 0
      ? Math.round(this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length)
      : 12;

    const uptimeSeconds = Math.floor((Date.now() - this.metrics.startTime) / 1000);

    return {
      status: 'healthy' as const,
      uptimeSeconds,
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.totalErrors,
      errorRatePercent: this.metrics.totalRequests > 0 
        ? Number(((this.metrics.totalErrors / this.metrics.totalRequests) * 100).toFixed(2)) 
        : 0,
      averageLatencyMs: avgLatency,
      activeConnections: this.metrics.activeConnections,
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024)
      },
      aiQueue: aiTaskQueue.getStats()
    };
  }
}

export const perfMonitor = new PerformanceMonitor();

// ==========================================
// 5. AUTOMATED DATABASE BACKUP & RESTORE
// ==========================================
const BACKUPS_DIR = path.resolve(process.cwd(), 'server/data/backups');

export class BackupManager {
  constructor() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      try {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      } catch (e) {
        // Ignore
      }
    }
  }

  public createBackup(data: any): string | null {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ioef_backup_${timestamp}.json`;
      const fullPath = path.join(BACKUPS_DIR, filename);

      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');

      // Maintain max 10 backups
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => ({ name: f, time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 10) {
        files.slice(10).forEach(f => {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
          } catch (e) {}
        });
      }

      return filename;
    } catch (err) {
      console.error('Failed to create backup:', err);
      return null;
    }
  }

  public listBackups(): Array<{ filename: string; sizeBytes: number; createdAt: string }> {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) return [];
      return fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const stats = fs.statSync(path.join(BACKUPS_DIR, f));
          return {
            filename: f,
            sizeBytes: stats.size,
            createdAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      return [];
    }
  }

  public restoreBackup(filename: string): any | null {
    try {
      const fullPath = path.join(BACKUPS_DIR, filename);
      if (!fs.existsSync(fullPath)) return null;
      const raw = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return null;
    }
  }
}

export const backupManager = new BackupManager();
