/**
 * Test Port Management Utility
 * Provides unique ports for test isolation
 */

import * as net from 'net';

let currentPort = 3100; // Start from 3100 to avoid common conflicts

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get the next available port, checking for conflicts
 */
export async function getNextAvailablePort(): Promise<number> {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const port = currentPort++;
    if (await isPortAvailable(port)) {
      return port;
    }
    attempts++;
  }
  
  throw new Error('Could not find available port after 100 attempts');
}

/**
 * Get a range of available ports
 */
export async function getPortRange(count: number): Promise<number[]> {
  const ports: number[] = [];
  for (let i = 0; i < count; i++) {
    ports.push(await getNextAvailablePort());
  }
  return ports;
}

/**
 * Get a single available port (synchronous version for backward compatibility)
 */
export function getNextAvailablePortSync(): number {
  return currentPort++;
}
