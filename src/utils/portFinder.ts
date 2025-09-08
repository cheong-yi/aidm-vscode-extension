import * as net from 'net';

/**
 * Utility for finding available ports automatically
 */
export class PortFinder {
  /**
   * Find an available port starting from the preferred port
   * Falls back to alternative ports if the preferred is busy
   */
  static async findAvailablePort(preferredPort: number = 3000): Promise<number> {
    const alternativePorts = [3001, 3002, 3003, 3004, 3005, 8080, 8081, 8082];
    
    // Try preferred port first
    if (await this.isPortAvailable(preferredPort)) {
      return preferredPort;
    }
    
    // Try alternative ports
    for (const port of alternativePorts) {
      if (await this.isPortAvailable(port)) {
        console.log(`⚠️  Port ${preferredPort} is busy, using alternative port ${port}`);
        return port;
      }
    }
    
    // If all ports are busy, find any available port
    const randomPort = await this.findRandomAvailablePort();
    console.log(`⚠️  All preferred ports are busy, using random port ${randomPort}`);
    return randomPort;
  }
  
  /**
   * Check if a specific port is available
   */
  private static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }
  
  /**
   * Find any available port in the dynamic range
   */
  private static async findRandomAvailablePort(): Promise<number> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(0, () => {
        const address = server.address();
        const port = typeof address === 'string' ? parseInt(address) : address?.port;
        server.close(() => {
          resolve(port || 0);
        });
      });
    });
  }
  
  /**
   * Get port configuration with fallback logic
   */
  static async getPortConfig(
    preferredPort: number,
    configPort?: number
  ): Promise<number> {
    // Priority: 1) Config port, 2) Preferred port, 3) Auto-find
    if (configPort && await this.isPortAvailable(configPort)) {
      return configPort;
    }
    
    return await this.findAvailablePort(preferredPort);
  }
}
