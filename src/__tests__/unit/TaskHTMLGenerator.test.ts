import { TaskHTMLGenerator } from '../../tasks/providers/TaskHTMLGenerator';
import { Task, TaskStatus, TaskPriority, TaskComplexity } from '../../types/tasks';
import * as vscode from 'vscode';

// Mock VSCode Uri
const mockUri: vscode.Uri = {
  scheme: 'file',
  authority: '',
  path: '/test/extension',
  query: '',
  fragment: '',
  fsPath: '/test/extension',
  with: jest.fn(),
  toString: () => 'file:///test/extension',
  toJSON: () => ({ scheme: 'file', authority: '', path: '/test/extension' })
};

describe('TaskHTMLGenerator', () => {
  let generator: TaskHTMLGenerator;
  let mockTask: Task;

  beforeEach(() => {
    generator = new TaskHTMLGenerator(mockUri);
    mockTask = {
      id: 'TEST-001',
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.NOT_STARTED,
      complexity: TaskComplexity.MEDIUM,
      priority: TaskPriority.HIGH,
      assignee: 'test-user',
      dependencies: [],
      requirements: [],
      createdDate: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      tags: []
    };
  });

  describe('generateLoadingHTML', () => {
    it('should generate valid HTML5 document structure', () => {
      const html = generator.generateLoadingHTML();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('should include proper meta tags for VSCode webview', () => {
      const html = generator.generateLoadingHTML();
      
      expect(html).toContain('charset="UTF-8"');
      expect(html).toContain('viewport');
      expect(html).toContain('Content-Security-Policy');
    });

    it('should display loading message', () => {
      const html = generator.generateLoadingHTML();
      
      expect(html).toContain('Loading Tasks...');
      expect(html).toContain('Please wait while workspace initializes...');
    });
  });

  describe('generateFullHTML', () => {
    it('should generate complete HTML document', () => {
      const tasks: Task[] = [mockTask];
      const html = generator.generateFullHTML(tasks);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Taskmaster Dashboard');
      expect(html).toContain('</html>');
    });

    it('should include task data when tasks provided', () => {
      const tasks: Task[] = [mockTask];
      const html = generator.generateFullHTML(tasks);
      
      expect(html).toContain('Test Task');
      expect(html).toContain('Test Description');
    });

    it('should show no tasks message when empty array', () => {
      const tasks: Task[] = [];
      const html = generator.generateFullHTML(tasks);
      
      expect(html).toContain('No tasks available');
    });

    it('should include CSS and JavaScript', () => {
      const tasks: Task[] = [mockTask];
      const html = generator.generateFullHTML(tasks);
      
      expect(html).toContain('<style>');
      expect(html).toContain('<script>');
    });
  });

  describe('setLogoDataUri', () => {
    it('should update logo data URI', () => {
      const logoUri = 'data:image/png;base64,test123';
      generator.setLogoDataUri(logoUri);
      
      const html = generator.generateFullHTML([]);
      expect(html).toContain(logoUri);
    });

    it('should handle empty logo URI', () => {
      generator.setLogoDataUri('');
      
      const html = generator.generateFullHTML([]);
      expect(html).toContain('src=""');
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML characters in task titles', () => {
      const maliciousTask: Task = {
        ...mockTask,
        title: '<script>alert("XSS")</script>',
        description: 'Safe & sound > description'
      };
      
      const html = generator.generateFullHTML([maliciousTask]);
      
      expect(html).not.toContain('<script>alert("XSS")</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&gt;');
    });

    it('should handle null and undefined task properties', () => {
      const incompleteTask: Task = {
        ...mockTask,
        description: undefined as any,
        assignee: null as any
      };
      
      const html = generator.generateFullHTML([incompleteTask]);
      
      expect(html).toContain('Test Task'); // Title should still show
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('null');
    });
  });

  describe('task status rendering', () => {
    it('should render different task statuses correctly', () => {
      const tasks: Task[] = [
        { ...mockTask, id: '1', status: TaskStatus.NOT_STARTED },
        { ...mockTask, id: '2', status: TaskStatus.IN_PROGRESS },
        { ...mockTask, id: '3', status: TaskStatus.COMPLETED }
      ];
      
      const html = generator.generateFullHTML(tasks);
      
      expect(html).toContain('status-not-started');
      expect(html).toContain('status-in-progress');
      expect(html).toContain('status-completed');
    });
  });

  describe('data attributes', () => {
    it('should include task ID in data attributes', () => {
      const html = generator.generateFullHTML([mockTask]);
      
      expect(html).toContain('data-task-id="TEST-001"');
    });

    it('should include assignee in data attributes', () => {
      const html = generator.generateFullHTML([mockTask]);
      
      expect(html).toContain('data-assignee="test-user"');
    });

    it('should use default assignee when none provided', () => {
      const taskWithoutAssignee: Task = {
        ...mockTask,
        assignee: undefined
      };
      
      const html = generator.generateFullHTML([taskWithoutAssignee]);
      
      expect(html).toContain('data-assignee="dev-team"');
    });
  });
});