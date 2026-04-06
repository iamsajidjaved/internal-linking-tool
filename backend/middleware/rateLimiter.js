/**
 * Simple rate limiter for Gemini API calls.
 * Limits to `maxConcurrent` simultaneous calls with a delay between each.
 */
class RateLimiter {
  constructor(maxConcurrent = 2, delayMs = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.running = 0;
    this.queue = [];
  }

  async execute(fn) {
    return new Promise((resolve, reject) => {
      const run = async () => {
        this.running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          await this._delay();
          this._next();
        }
      };

      if (this.running < this.maxConcurrent) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }

  _next() {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      next();
    }
  }

  _delay() {
    return new Promise((r) => setTimeout(r, this.delayMs));
  }
}

// Shared instance for Gemini calls
const geminiLimiter = new RateLimiter(2, 1500);

module.exports = { RateLimiter, geminiLimiter };
