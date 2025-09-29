// Auto-generated template functions
// Generated from: task-details.html, task-header.html, task-item.html

export function taskDetailsTemplate(data: any): string {
  return `<div class="task-details">
  <div class="task-description" data-task-field="description"></div>
  ${data.testStrategy}
  ${data.taskMeta}
  ${data.dependencies}
  ${data.testResults}
  ${data.actions}
</div>`;
}

export function taskHeaderTemplate(data: any): string {
  return `<div class="task-header${data.executableClass}">
  <svg class="task-expand-icon" viewBox="0 0 16 16" fill="currentColor" onclick="toggleTask(this.closest('.task-item'))">
    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
  </svg>
  <span class="task-id">${data.id}</span>
  <span class="task-title" data-task-field="title"></span>
  <span class="task-status ${data.statusClass}">${data.statusDisplay}</span>
  ${data.executableIcon}
</div>`;
}

export function taskItemTemplate(data: any): string {
  return `<div class="task-item" data-task-id="${data.id}" data-assignee="${data.assignee}">
  ${data.header}
  ${data.details}
  ${data.subtasks}
</div>`;
}

