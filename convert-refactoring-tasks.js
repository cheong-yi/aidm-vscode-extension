#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the refactoring tasks
const refactoringTasks = JSON.parse(fs.readFileSync('refactoring_tasks.json', 'utf8'));

// Priority mapping
const priorityMap = {
  'P0': 'critical',
  'P1': 'high', 
  'P2': 'medium',
  'P3': 'low'
};

// Generate TDD-style test strategy based on task details
function generateTestStrategy(task) {
  const strategies = {
    'LOW': {
      prefix: 'Unit test',
      suffix: 'Verify compilation succeeds. Test basic functionality remains intact.'
    },
    'MEDIUM': {
      prefix: 'Unit and integration test',
      suffix: 'Test affected components still interact correctly. Verify no regression in dependent modules.'
    },
    'HIGH': {
      prefix: 'Comprehensive test',
      suffix: 'Integration test complete workflow. Verify critical paths remain functional. Test rollback procedure if needed.'
    }
  };
  
  const risk = strategies[task.riskLevel] || strategies['MEDIUM'];
  
  // Build specific test strategy based on task
  let testPoints = [];
  
  // Add file-specific tests
  if (task.filesAffected && task.filesAffected.length > 0) {
    const mainFile = task.filesAffected[0].split('/').pop();
    testPoints.push(`${risk.prefix} changes in ${mainFile}`);
  }
  
  // Add functionality tests based on task type
  if (task.id.includes('REF-001') || task.title.includes('Remove')) {
    testPoints.push('Verify removed code has no remaining references');
    testPoints.push('Test compilation without removed components');
  } else if (task.title.includes('Extract')) {
    testPoints.push('Test extracted component works independently');
    testPoints.push('Verify original component delegates correctly');
  } else if (task.title.includes('Simplify') || task.title.includes('Consolidate')) {
    testPoints.push('Test simplified implementation maintains functionality');
    testPoints.push('Verify performance is not degraded');
  } else if (task.title.includes('Fix')) {
    testPoints.push('Test the specific issue is resolved');
    testPoints.push('Verify fix does not break existing functionality');
  }
  
  // Add risk-specific suffix
  testPoints.push(risk.suffix);
  
  return testPoints.join('. ');
}

// Convert a single task
function convertTask(refTask) {
  // Generate details from description + extra context
  const details = refTask.description + 
    (refTask.filesAffected ? `. Files: ${refTask.filesAffected.join(', ')}` : '') +
    (refTask.estimatedMinutes ? `. Estimated: ${refTask.estimatedMinutes} minutes` : '');
  
  const convertedTask = {
    id: refTask.id,
    title: refTask.title,
    description: refTask.description,
    details: details,
    testStrategy: generateTestStrategy(refTask),
    priority: priorityMap[refTask.priority] || 'medium',
    assignee: 'unassigned',
    dependencies: refTask.dependencies || [],
    status: 'not_started',
    
    // Refactoring-specific fields
    phase: refTask.phase,
    riskLevel: refTask.riskLevel,
    estimatedMinutes: refTask.estimatedMinutes,
    rollbackStrategy: refTask.rollbackStrategy,
    successCriteria: refTask.successMetric,
    
    // Empty arrays/nulls for incomplete work
    subtasks: [],
    testStatus: {
      lastRunDate: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      executionTime: 0,
      failingTestsList: []
    },
    implementation: null,
    testResults: null
  };
  
  // Add filesAffected as a top-level field for reference
  if (refTask.filesAffected) {
    convertedTask.filesAffected = refTask.filesAffected;
  }
  
  return convertedTask;
}

// Convert all tasks
const convertedStructure = {
  refactoring: {
    tasks: refactoringTasks.tasks.map(convertTask),
    metadata: {
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      description: "Refactoring tasks for AiDM VSCode Extension - converted from flat structure",
      projectName: "AiDM VSCode Extension Refactoring",
      totalTasks: refactoringTasks.tasks.length,
      completedTasks: 0,
      remainingTasks: refactoringTasks.tasks.length,
      phases: ["Phase 1", "Phase 2", "Phase 3", "Phase 4"],
      originalMetadata: refactoringTasks.metadata
    }
  }
};

// Write the converted file
const outputPath = 'refactoring_tasks_converted.json';
fs.writeFileSync(outputPath, JSON.stringify(convertedStructure, null, 2));

console.log(`✅ Successfully converted ${refactoringTasks.tasks.length} tasks`);
console.log(`📄 Output saved to: ${outputPath}`);

// Summary statistics
const byPhase = {};
const byPriority = {};
const byRisk = {};

convertedStructure.refactoring.tasks.forEach(task => {
  byPhase[task.phase] = (byPhase[task.phase] || 0) + 1;
  byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
  byRisk[task.riskLevel] = (byRisk[task.riskLevel] || 0) + 1;
});

console.log('\n📊 Task Distribution:');
console.log('By Phase:', byPhase);
console.log('By Priority:', byPriority);
console.log('By Risk:', byRisk);