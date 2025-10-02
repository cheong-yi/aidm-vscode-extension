/**
 * Webview JavaScript for TaskHTMLGenerator
 * Extracted from inline JavaScript to improve maintainability
 * REF-040: External JavaScript file
 */

// Global state
let expandedTaskId = null;

/**
 * Accordion functionality
 */
function toggleTask(taskElement) {
  const taskId = taskElement.dataset.taskId;
  if (!taskId) return;
  
  const isCurrentlyExpanded = expandedTaskId === taskId;
  
  // Collapse all tasks first (accordion behavior)
  document.querySelectorAll('.task-item.expanded').forEach(item => {
    item.classList.remove('expanded');
  });
  
  if (!isCurrentlyExpanded) {
    // Expand clicked task
    taskElement.classList.add('expanded');
    expandedTaskId = taskId;
    
    // Notify extension of expansion (extension handles persistence)
    sendMessage('toggleAccordion', { taskId: taskId, expanded: true });
  } else {
    // Collapse clicked task
    expandedTaskId = null;
    sendMessage('toggleAccordion', { taskId: taskId, expanded: false });
  }
}

function toggleFailures(failuresSection) {
  failuresSection.classList.toggle('expanded');
}

function restoreExpandedTask(taskId) {
  if (!taskId) return;
  
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.classList.add('expanded');
    expandedTaskId = taskId;
  }
}

/**
 * Message sending functionality
 */
function sendMessage(type, payload) {
  if (typeof acquireVsCodeApi !== 'undefined') {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
      type: type,
      ...payload
    });
  }
}

/**
 * Task data handling via postMessage
 */
window.addEventListener('message', function(event) {
  const message = event.data;
  if (message.type === 'updateTaskData') {
    updateTaskContent(message.tasks);
  }
});

function updateTaskContent(tasks) {
  tasks.forEach(task => {
    const taskElement = document.querySelector('[data-task-id="' + task.id + '"]');
    if (taskElement) {
      // Update title
      const titleElement = taskElement.querySelector('[data-task-field="title"]');
      if (titleElement) titleElement.textContent = task.title || '';
      
      // Update description
      const descElement = taskElement.querySelector('[data-task-field="description"]');
      if (descElement) descElement.textContent = task.description || 'No description available';
      
      // Update test strategy
      const testStrategyElement = taskElement.querySelector('[data-task-field="testStrategy"]');
      if (testStrategyElement) {
        testStrategyElement.textContent = (task.testStrategy && task.testStrategy.trim()) 
          ? task.testStrategy : 'No test strategy specified';
      }
      
      // Update dependencies
      const depsElement = taskElement.querySelector('[data-task-field="dependencies"]');
      if (depsElement) {
        if (task.dependencies && task.dependencies.length > 0) {
          depsElement.innerHTML = task.dependencies.map(dep => 
            '<span class="dependency-tag"></span>'
          ).join('');
          // Set textContent for each dependency tag
          const depTags = depsElement.querySelectorAll('.dependency-tag');
          task.dependencies.forEach((dep, index) => {
            if (depTags[index]) depTags[index].textContent = dep;
          });
        } else {
          depsElement.innerHTML = '<span class="dependency-tag">None</span>';
        }
      }
      
      // Update subtasks
      const subtaskElements = taskElement.querySelectorAll('[data-subtask-field="title"]');
      if (task.subtasks && subtaskElements.length > 0) {
        task.subtasks.forEach((subtask, index) => {
          if (subtaskElements[index]) {
            subtaskElements[index].textContent = subtask.title || subtask.description || 'Untitled';
          }
        });
      }
    }
  });
}