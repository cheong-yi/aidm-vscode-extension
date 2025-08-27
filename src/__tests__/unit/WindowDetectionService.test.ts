/**
 * WindowDetectionService Tests
 * 
 * Task: GUI-TRIAL-002b - Test Cursor window detection logic
 * Requirements: Verify pattern matching works for Cursor windows
 */

import { WindowDetectionService, WindowInfo } from '../../services/WindowDetectionService';

describe('WindowDetectionService', () => {
  let service: WindowDetectionService;

  beforeEach(() => {
    service = new WindowDetectionService();
  });

  describe('findWindowByTitle', () => {
    it('should return WindowInfo when Cursor is running', async () => {
      // Mock getRunningWindows to return a Cursor window
      const mockWindows: WindowInfo[] = [
        {
          title: 'Cursor - test.ts',
          processName: 'Cursor',
          windowHandle: {}
        }
      ];

      // Mock the getRunningWindows method
      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(mockWindows);

      const result = await service.findWindowByTitle('cursor');
      
      expect(result).toBeDefined();
      expect(result?.title).toBe('Cursor - test.ts');
      expect(result?.processName).toBe('Cursor');
    });

    it('should return null when Cursor is not running', async () => {
      // Mock getRunningWindows to return non-Cursor windows
      const mockWindows: WindowInfo[] = [
        {
          title: 'Visual Studio Code',
          processName: 'Code',
          windowHandle: {}
        },
        {
          title: 'Chrome',
          processName: 'Chrome',
          windowHandle: {}
        }
      ];

      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(mockWindows);

      const result = await service.findWindowByTitle('cursor');
      
      expect(result).toBeNull();
    });

    it('should handle pattern matching for different Cursor window titles', async () => {
      // Test exact match
      const exactMatchWindows: WindowInfo[] = [
        {
          title: 'Cursor',
          processName: 'Cursor',
          windowHandle: {}
        }
      ];
      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(exactMatchWindows);
      const exactMatch = await service.findWindowByTitle('cursor');
      expect(exactMatch?.title).toBe('Cursor');

      // Test pattern with dash
      const dashMatchWindows: WindowInfo[] = [
        {
          title: 'Cursor - project.ts',
          processName: 'Cursor',
          windowHandle: {}
        }
      ];
      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(dashMatchWindows);
      const dashMatch = await service.findWindowByTitle('cursor -');
      expect(dashMatch?.title).toBe('Cursor - project.ts');

      // Test pattern with space
      const spaceMatchWindows: WindowInfo[] = [
        {
          title: 'Cursor New Chat',
          processName: 'Cursor',
          windowHandle: {}
        }
      ];
      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(spaceMatchWindows);
      const spaceMatch = await service.findWindowByTitle('cursor ');
      expect(spaceMatch?.title).toBe('Cursor New Chat');
    });

    it('should handle case-insensitive matching', async () => {
      const mockWindows: WindowInfo[] = [
        {
          title: 'CURSOR - test.ts',
          processName: 'Cursor',
          windowHandle: {}
        }
      ];

      jest.spyOn(service as any, 'getRunningWindows').mockResolvedValue(mockWindows);

      const result = await service.findWindowByTitle('cursor');
      
      expect(result).toBeDefined();
      expect(result?.title).toBe('CURSOR - test.ts');
    });

    it('should return null on detection failure', async () => {
      jest.spyOn(service as any, 'getRunningWindows').mockRejectedValue(new Error('Detection failed'));

      const result = await service.findWindowByTitle('cursor');
      
      expect(result).toBeNull();
    });
  });

  describe('getRunningWindows', () => {
    it('should return array of WindowInfo objects', async () => {
      // This test would require actual nut-tree integration
      // For now, we'll test the interface structure
      const result = await service.getRunningWindows();
      
      expect(Array.isArray(result)).toBe(true);
      // Note: In actual testing environment, this might return empty array
      // if no windows are detected or if nut-tree is not properly configured
    });
  });

  describe('extractProcessName', () => {
    it('should extract process name from various title patterns', () => {
      const service = new WindowDetectionService() as any;

      expect(service.extractProcessName('Cursor - test.ts')).toBe('Cursor');
      expect(service.extractProcessName('Cursor: project')).toBe('Cursor');
      expect(service.extractProcessName('Cursor (workspace)')).toBe('Cursor');
      expect(service.extractProcessName('Unknown')).toBe('Unknown');
      expect(service.extractProcessName('')).toBe('Unknown');
    });
  });
});
