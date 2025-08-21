/**
 * Markdown Task Parser
 * Parses tasks.md files and manages task data serialization
 * Requirements: 2.1, 3.1-3.6, 4.1-4.4, 7.1-7.6
 */

import * as fs from 'fs';
import * as path from 'path';
import { Task, TaskStatus, TaskComplexity, TaskPriority, ValidationResult, TestStatus } from '../types/tasks';

export interface ParsedTaskSection {
  heading: string;
  level: number;
  tasks: Task[];
}

export interface MarkdownParseResult {
  sections: ParsedTaskSection[];
  tasks: Task[];
  metadata: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    parseTime: number;
    fileSize: number;
  };
}

export class MarkdownTaskParser {
  private readonly checkboxPattern = /^- \[([ x])\] (.+)$/;
  private readonly headingPattern = /^(#{1,6})\s+(.+)$/;
  private readonly requirementPattern = /_Requirements:\s*([\d.,\s]+)_/;
  private readonly taskIdPattern = /^(\d+\.\d+)\s+(.+)$/;

  /**
   * Parse tasks from a markdown file
   */
  async parseTasksFromFile(filePath: string): Promise<MarkdownParseResult> {
    const startTime = performance.now();
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const fileSize = content.length;
      
      const lines = content.split('\n');
      const sections: ParsedTaskSection[] = [];
      const allTasks: Task[] = [];
      
      let currentSection: ParsedTaskSection | null = null;
      let currentTask: Partial<Task> | null = null;
      let taskDescription: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for headings
        const headingMatch = line.match(this.headingPattern);
        if (headingMatch) {
          // Save previous section if exists
          if (currentSection && currentTask) {
            this.finalizeTask(currentTask, taskDescription, allTasks);
            currentSection.tasks.push(currentTask as Task);
            currentTask = null;
            taskDescription = [];
          }
          
          if (currentSection) {
            sections.push(currentSection);
          }
          
          const level = headingMatch[1].length;
          const heading = headingMatch[2];
          
          currentSection = {
            heading,
            level,
            tasks: []
          };
          
          continue;
        }
        
        // Check for task checkboxes
        const checkboxMatch = line.match(this.checkboxPattern);
        if (checkboxMatch) {
          // Save previous task if exists
          if (currentTask) {
            this.finalizeTask(currentTask, taskDescription, allTasks);
            if (currentSection) {
              currentSection.tasks.push(currentTask as Task);
            }
          }
          
          const isCompleted = checkboxMatch[1] === 'x';
          const taskText = checkboxMatch[2];
          
          // Parse task ID and title
          const taskIdMatch = taskText.match(this.taskIdPattern);
          if (taskIdMatch) {
            currentTask = {
              id: taskIdMatch[1],
              title: taskIdMatch[2],
              status: isCompleted ? TaskStatus.COMPLETED : TaskStatus.NOT_STARTED,
              complexity: TaskComplexity.MEDIUM,
              dependencies: [],
              requirements: [],
              createdDate: new Date(),
              lastModified: new Date(),
              tags: []
            };
            taskDescription = [];
          }
          
          continue;
        }
        
        // Check for requirements line
        if (currentTask && line.match(this.requirementPattern)) {
          const reqMatch = line.match(this.requirementPattern);
          if (reqMatch) {
            const requirements = reqMatch[1].split(',').map(r => r.trim());
            currentTask.requirements = requirements;
          }
          continue;
        }
        
        // Collect task description lines
        if (currentTask && line.startsWith('-') && !line.match(this.checkboxPattern)) {
          taskDescription.push(line);
        }
      }
      
      // Finalize last task and section
      if (currentTask) {
        this.finalizeTask(currentTask, taskDescription, allTasks);
        if (currentSection) {
          currentSection.tasks.push(currentTask as Task);
        }
      }
      
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const parseTime = performance.now() - startTime;
      
      return {
        sections,
        tasks: allTasks,
        metadata: {
          totalTasks: allTasks.length,
          completedTasks: allTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
          inProgressTasks: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
          blockedTasks: allTasks.filter(t => t.status === TaskStatus.BLOCKED).length,
          parseTime,
          fileSize
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to parse tasks from file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate parsed task data
   */
  validateTaskData(tasks: Task[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const task of tasks) {
      // Required fields validation
      if (!task.id) {
        errors.push(`Task missing ID: ${task.title || 'Unknown'}`);
      }
      
      if (!task.title) {
        errors.push(`Task missing title: ${task.id}`);
      }
      
      if (!task.description) {
        warnings.push(`Task ${task.id} has no description`);
      }
      
      // ID format validation
      if (task.id && !/^\d+\.\d+$/.test(task.id)) {
        warnings.push(`Task ID format may be invalid: ${task.id}`);
      }
      
      // Status validation
      if (task.status === TaskStatus.COMPLETED && !task.testStatus) {
        warnings.push(`Completed task ${task.id} has no test status`);
      }
      
      // Dependency validation
      if (task.dependencies.length > 0) {
        const validDependencies = task.dependencies.filter(depId => 
          tasks.some(t => t.id === depId)
        );
        
        if (validDependencies.length !== task.dependencies.length) {
          errors.push(`Task ${task.id} has invalid dependencies: ${task.dependencies.filter(d => !validDependencies.includes(d)).join(', ')}`);
        }
      }
    }
    
    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(tasks);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(' -> ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Serialize tasks back to markdown format
   */
  async serializeTasksToFile(filePath: string, sections: ParsedTaskSection[]): Promise<void> {
    try {
      const content = this.generateMarkdownContent(sections);
      await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to serialize tasks to file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update task status in markdown content
   */
  async updateTaskStatus(filePath: string, taskId: string, newStatus: TaskStatus): Promise<boolean> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const checkboxMatch = line.match(this.checkboxPattern);
        
        if (checkboxMatch) {
          const taskText = checkboxMatch[2];
          const taskIdMatch = taskText.match(this.taskIdPattern);
          
          if (taskIdMatch && taskIdMatch[1] === taskId) {
            const checkbox = newStatus === TaskStatus.COMPLETED ? 'x' : ' ';
            lines[i] = line.replace(/^- \[([ x])\]/, `- [${checkbox}]`);
            
            await fs.promises.writeFile(filePath, lines.join('\n'), 'utf-8');
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finalize task with description and metadata
   */
  private finalizeTask(task: Partial<Task>, description: string[], allTasks: Task[]): void {
    if (task.id && task.title) {
      task.description = description.join('\n').trim();
      
      // Set default values
      if (!task.complexity) {
        task.complexity = TaskComplexity.MEDIUM;
      }
      
      if (!task.priority) {
        task.priority = TaskPriority.MEDIUM;
      }
      
      if (!task.tags) {
        task.tags = [];
      }
      
      // Add to all tasks
      allTasks.push(task as Task);
    }
  }

  /**
   * Detect circular dependencies in tasks
   */
  private detectCircularDependencies(tasks: Task[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularPaths: string[][] = [];
    
    const dfs = (taskId: string, path: string[]): void => {
      if (recursionStack.has(taskId)) {
        const cycleStart = path.indexOf(taskId);
        circularPaths.push(path.slice(cycleStart));
        return;
      }
      
      if (visited.has(taskId)) {
        return;
      }
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          dfs(depId, [...path, taskId]);
        }
      }
      
      recursionStack.delete(taskId);
    };
    
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, []);
      }
    }
    
    return circularPaths.map(path => [...path, path[0]].join(' -> '));
  }

  /**
   * Generate markdown content from sections
   */
  private generateMarkdownContent(sections: ParsedTaskSection[]): string {
    const lines: string[] = [];
    
    for (const section of sections) {
      // Add heading
      const headingPrefix = '#'.repeat(section.level);
      lines.push(`${headingPrefix} ${section.heading}`);
      lines.push('');
      
      // Add tasks
      for (const task of section.tasks) {
        const checkbox = task.status === TaskStatus.COMPLETED ? 'x' : ' ';
        lines.push(`- [${checkbox}] ${task.id} ${task.title}`);
        
        if (task.description) {
          const descriptionLines = task.description.split('\n');
          for (const descLine of descriptionLines) {
            if (descLine.trim()) {
              lines.push(`  ${descLine}`);
            }
          }
        }
        
        if (task.requirements && task.requirements.length > 0) {
          lines.push(`  _Requirements: ${task.requirements.join(', ')}_`);
        }
        
        lines.push('');
      }
    }
    
    return lines.join('\n').trim();
  }
}
