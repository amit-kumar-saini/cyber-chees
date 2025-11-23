// Stockfish.js wrapper for Web Worker
// Load official Stockfish build from CDN
try {
  importScripts('https://cdn.jsdelivr.net/npm/stockfish@16.0.0/stockfish.js');
  // Notify loaded
  // @ts-ignore
  self.postMessage('stockfish:loaded');
} catch (error) {
  // @ts-ignore
  self.postMessage('error: Failed to load Stockfish engine');
  console.error('Failed to load Stockfish:', error);
}
