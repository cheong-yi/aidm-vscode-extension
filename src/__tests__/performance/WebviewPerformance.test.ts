// src/__tests__/performance/WebviewPerformance.test.ts
import { TaskHTMLGenerator } from '../../tasks/providers/TaskHTMLGenerator';
import { Task, TaskStatus, TaskComplexity } from '../../types/tasks';
import * as vscode from 'vscode';

describe('Webview Performance Benchmarks', () => {
  let generator: TaskHTMLGenerator;
  let mockTasks: Task[];
  
  beforeEach(() => {
    generator = new TaskHTMLGenerator(vscode.Uri.file('/mock'));
    mockTasks = createMockTasks(10); // Helper function
  });
  
  it('should generate HTML in under 100ms', async () => {
    const start = performance.now();
    
    const html = await generator.generateFullHTML(mockTasks);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(100);
    expect(html).toContain('task-item');
  });
  
  it('should use bundled CSS and avoid file system access', async () => {
    const fsSpy = jest.spyOn(require('fs'), 'readFileSync');
    
    // Multiple generations should not read files at all
    const html1 = await generator.generateFullHTML(mockTasks);
    const html2 = await generator.generateFullHTML(mockTasks);
    const html3 = await generator.generateFullHTML(mockTasks);
    
    // No file system reads should occur with bundled CSS
    expect(fsSpy).not.toHaveBeenCalled();
    
    // All HTML should contain proper styling
    [html1, html2, html3].forEach(html => {
      expect(html).toContain('.task-expand-icon');
      expect(html).toContain('width: 12px');
    });
    fsSpy.mockRestore();
  });
  
  it('should load templates with proper CSP compliance', async () => {
    const generator = new TaskHTMLGenerator(vscode.Uri.file('/mock'));
    const mockWebview = {
      asWebviewUri: jest.fn((uri) => uri),
      options: { localResourceRoots: [vscode.Uri.file('/mock')] }
    };
    
    generator.setWebview(mockWebview as any);
    const html = await generator.generateFullHTML(mockTasks);
    
    expect(html).not.toContain('file://');
    expect(html).toContain('task-item');
  });
});

function createMockTasks(count: number): Task[] {
  return Array(count).fill(null).map((_, i) => ({
    id: `TASK-${i.toString().padStart(3, '0')}`,
    title: `Sample Task ${i}`,
    description: 'Sample task description',
    details: 'test details',
    testStrategy: 'test strategy',
    status: TaskStatus.NOT_STARTED,
    complexity: TaskComplexity.MEDIUM,
    dependencies: [],
    requirements: [],
    createdDate: '2025-01-14T10:00:00Z',
    lastModified: '2025-01-14T10:00:00Z',
    assignee: 'dev-team',
    subtasks: []
  }));
}