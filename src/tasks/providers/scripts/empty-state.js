// Acquire VSCode API for webview communication
const vscode = acquireVsCodeApi();

// Handle quick action button clicks
function handleQuickAction(action) {
  vscode.postMessage({
    command: 'quick-action',
    data: { action }
  });
}

// Initialize empty state webview
document.addEventListener('DOMContentLoaded', function() {
  console.log('TaskDetailCardProvider empty state initialized');

  // Add hover effects for action buttons
  const actionButtons = document.querySelectorAll('.action-btn');
  actionButtons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });
});
