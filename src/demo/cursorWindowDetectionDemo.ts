/**
 * Cursor Window Detection Demo
 * 
 * Task: GUI-TRIAL-002b - Demonstrate Cursor window detection functionality
 * Requirements: Show practical usage of findWindowByTitle method
 */

import { WindowDetectionService } from '../services/WindowDetectionService';

/**
 * Demo class for Cursor window detection
 */
export class CursorWindowDetectionDemo {
  private windowService: WindowDetectionService;

  constructor() {
    this.windowService = new WindowDetectionService();
  }

  /**
   * Run the complete demo
   */
  async runDemo(): Promise<void> {
    console.log('🚀 Starting Cursor Window Detection Demo...\n');

    try {
      // Step 1: Get all running windows
      console.log('📋 Step 1: Detecting all running windows...');
      const allWindows = await this.windowService.getRunningWindows();
      console.log(`   Found ${allWindows.length} windows\n`);

      // Step 2: Try to find Cursor windows
      console.log('🔍 Step 2: Searching for Cursor windows...');
      
      const cursorWindow = await this.windowService.findWindowByTitle('cursor');
      if (cursorWindow) {
        console.log('   ✅ Cursor window found!');
        console.log(`   Title: ${cursorWindow.title}`);
        console.log(`   Process: ${cursorWindow.processName}`);
      } else {
        console.log('   ❌ No Cursor windows found');
        console.log('   💡 Try launching Cursor and running this demo again\n');
      }

      // Step 3: Show different search patterns
      console.log('🎯 Step 3: Testing different search patterns...');
      
      const patterns = ['cursor', 'cursor -', 'cursor ', 'Cursor'];
      for (const pattern of patterns) {
        const result = await this.windowService.findWindowByTitle(pattern);
        const status = result ? '✅ Found' : '❌ Not found';
        console.log(`   Pattern "${pattern}": ${status}`);
        if (result) {
          console.log(`      -> ${result.title}`);
        }
      }

      console.log('\n🎉 Demo completed successfully!');

    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }

  /**
   * Interactive demo for testing with user input
   */
  async interactiveDemo(): Promise<void> {
    console.log('🎮 Interactive Cursor Window Detection Demo\n');
    console.log('Available commands:');
    console.log('  - "search <pattern>" - Search for windows with pattern');
    console.log('  - "list" - List all detected windows');
    console.log('  - "quit" - Exit demo\n');

    // This would be implemented with actual user input in a real scenario
    console.log('💡 In a real implementation, this would accept user input');
    console.log('   For now, showing example searches:\n');

    // Example searches
    const exampleSearches = [
      'cursor',
      'Cursor -',
      'cursor ',
      'notepad',
      'chrome'
    ];

    for (const search of exampleSearches) {
      console.log(`🔍 Searching for: "${search}"`);
      const result = await this.windowService.findWindowByTitle(search);
      
      if (result) {
        console.log(`   ✅ Found: ${result.title} (${result.processName})`);
      } else {
        console.log(`   ❌ Not found`);
      }
      console.log('');
    }
  }
}

/**
 * Export demo instance for easy access
 */
export const cursorWindowDetectionDemo = new CursorWindowDetectionDemo();

// Example usage:
// import { cursorWindowDetectionDemo } from './cursorWindowDetectionDemo';
// await cursorWindowDetectionDemo.runDemo();
