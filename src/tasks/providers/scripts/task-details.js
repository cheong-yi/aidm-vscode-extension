// Acquire VSCode API for webview communication
const vscode = acquireVsCodeApi();

// Handle failures section expansion with smooth animations
function toggleFailures(failuresElement, event) {
  event.stopPropagation();

  const failuresList = failuresElement.querySelector('.failures-list');
  const expandIcon = failuresElement.querySelector('.task-expand-icon');

  if (failuresElement.classList.contains('expanded')) {
    // Collapse
    failuresElement.classList.remove('expanded');
    if (failuresList) {
      failuresList.style.display = 'none';
    }
    if (expandIcon) {
      expandIcon.style.transform = 'rotate(0deg)';
    }
  } else {
    // Expand
    failuresElement.classList.add('expanded');
    if (failuresList) {
      failuresList.style.display = 'block';
    }
    if (expandIcon) {
      expandIcon.style.transform = 'rotate(90deg)';
    }
  }
}

// Enhanced message handling functions
function handleStatusChange(taskId, newStatus) {
  vscode.postMessage({
    command: 'status-change',
    data: { taskId, newStatus }
  });
}

function handleCursorExecute(taskId) {
  vscode.postMessage({
    command: 'cursor-execute',
    data: { taskId }
  });
}

function handleActionButton(action, taskId) {
  vscode.postMessage({
    command: 'action-button',
    data: { action, taskId }
  });
}

// Legacy action button click handler for backward compatibility
function handleActionClick(action, taskId) {
  // Use new structured message format
  handleActionButton(action, taskId);
}

// Add event delegation for action buttons with enhanced message handling
document.addEventListener('click', function(event) {
  const button = event.target.closest('.action-btn');
  if (button) {
    const action = button.getAttribute('data-action');
    const taskId = button.getAttribute('data-task-id');
    if (action && taskId) {
      // Use new structured message format
      handleActionButton(action, taskId);
    }
  }
});

// Initialize failures sections on page load
document.addEventListener('DOMContentLoaded', function() {
  const failuresSections = document.querySelectorAll('.failures-section');
  failuresSections.forEach(section => {
    // Ensure all sections start collapsed
    section.classList.remove('expanded');
    const failuresList = section.querySelector('.failures-list');
    if (failuresList) {
      failuresList.style.display = 'none';
    }
    const expandIcon = section.querySelector('.task-expand-icon');
    if (expandIcon) {
      expandIcon.style.transform = 'rotate(0deg)';
    }
  });

  // Set up any additional initialization needed for message handling
  console.log('TaskDetailCardProvider webview initialized with message handling');
});
