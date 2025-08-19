/**
 * Test Port Management Utility
 * Provides unique ports for test isolation
 */

let currentPort = 3100; // Start from 3100 to avoid common conflicts

export function getNextAvailablePort(): number {
  return currentPort++;
}

export function getPortRange(count: number): number[] {
  const ports: number[] = [];
  for (let i = 0; i < count; i++) {
    ports.push(getNextAvailablePort());
  }
  return ports;
}
