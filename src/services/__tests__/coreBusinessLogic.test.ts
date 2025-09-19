import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageService } from '../localStorage';
import { WorkloadCalculationEngine } from '../workloadCalculation';
import { RebalancingSuggestionEngine } from '../rebalancingSuggestions';
import { ConflictDetectionEngine } from './conflictDetection.test';
import { Channel, ContentTemplate, Task, WeeklySchedule } from '../../types';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

/**
 * Core Business Logic Integration Tests
 * Tests the interaction between different services and business rules
 */
describe('Core Business Logic Integration', () => {
  let service: LocalStorageService;

  const mockChannels: Channel[] = [
    {
      id: 'gaming-channel',
      name: 'Gaming Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday', 'Wednesday', 'Friday'],
        preferredTimes: ['10:00', '14:00'],
      },
      color: '#ff0000',
      createdAt: new Date('2024-01-01'),
      isActive: true,
    },
    {
      id: 'educational-channel',
      name: 'Educational Channel',
      contentType: 'educational',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Tuesday', 'Thursday'],
        preferredTimes: ['09:00', '15:00'],
      },
      color: '#00ff00',
      createdAt: new Date('2024-01-01'),
      isActive: true,
    },
  ];

  const mockTemplates: ContentTemplate[] = [
    {
      id: 'gaming-video-template',
      name: 'Gaming Video Template',
      contentType: 'video',
      estimatedHours: {
        planning: 1,
        production: 6,
        editing: 4,
        publishing: 1,
      },
      workflowSteps: ['Research game', 'Record gameplay', 'Edit video', 'Create thumbnail', 'Upload'],
      channelIds: ['gaming-channel'],
    },
    {
      id: 'educational-video-template',
      name: 'Educational Video Template',
      contentType: 'video',
      estimatedHours: {
        planning: 2,
        production: 4,
        editing: 3,
        publishing: 1,
      },
      workflowSteps: ['Research topic', 'Create script', 'Record video', 'Edit', 'Upload'],
      channelIds: ['educational-channel'],
    },
    {
      id: 'short-template',
      name: 'Short Video Template',
      contentType: 'short',
      estimatedHours: {
        planning: 0.5,
        production: 1,
        editing: 1,
        publishing: 0.5,
      },
      workflowSteps: ['Plan content', 'Record', 'Quick edit', 'Upload'],
      channelIds: ['gaming-channel', 'educational-channel'],
    },
  ];

  beforeEach(() => {
    mockLocalStorage.clear();
    service = LocalStorageService.getInstance();
    
    // Set up test data
    mockChannels.forEach(channel => service.addChannel(channel));
    mockTemplates.forEach(template => service.addTemplate(template));
  });

  describe('End-to-End Workflow Management', () => {
    it('should handle complete content creation workflow', () => {
      // 1. Create tasks from templates
      const gamingTask: Task = {
        id: 'gaming-task-1',
        channelId: 'gaming-channel',
        templateId: 'gaming-video-template',
        title: 'New Gaming Video',
        contentType: 'video',
        estimatedHours: 12, // Sum of template hours
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'),
        scheduledEnd: new Date('2024-01-01T21:00:00'),
      };

      const educationalTask: Task = {
        id: 'educational-task-1',
        channelId: 'educational-channel',
        templateId: 'educational-video-template',
        title: 'Educational Content',
        contentType: 'video',
        estimatedHours: 10,
        status: 'planned',
        scheduledStart: new Date('2024-01-02T09:00:00'),
        scheduledEnd: new Date('2024-01-02T19:00:00'),
      };

      const shortTask: Task = {
        id: 'short-task-1',
        channelId: 'gaming-channel',
        templateId: 'short-template',
        title: 'Gaming Short',
        contentType: 'short',
        estimatedHours: 3,
        status: 'planned',
        scheduledStart: new Date('2024-01-03T10:00:00'),
        scheduledEnd: new Date('2024-01-03T13:00:00'),
      };

      const tasks = [gamingTask, educationalTask, shortTask];

      // 2. Create weekly schedule
      const weeklySchedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks,
        totalScheduledHours: 25,
        userCapacityHours: 40,
        isOverloaded: false,
      };

      service.setSchedule('2024-01-01', weeklySchedule);

      // 3. Calculate workload metrics
      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        weeklySchedule,
        mockChannels,
        8 // 8 hours per day
      );

      expect(workloadMetrics.totalScheduledHours).toBe(25);
      expect(workloadMetrics.utilizationPercentage).toBe(62.5);
      expect(workloadMetrics.channelBreakdown).toHaveLength(2);

      // 4. Verify channel workload distribution
      const gamingChannelWorkload = workloadMetrics.channelBreakdown.find(
        c => c.channelId === 'gaming-channel'
      );
      const educationalChannelWorkload = workloadMetrics.channelBreakdown.find(
        c => c.channelId === 'educational-channel'
      );

      expect(gamingChannelWorkload?.scheduledHours).toBe(15); // 12 + 3
      expect(educationalChannelWorkload?.scheduledHours).toBe(10);

      // 5. Check for conflicts
      const conflicts = ConflictDetectionEngine.findSchedulingConflicts(tasks);
      expect(conflicts).toHaveLength(0); // No conflicts in this schedule
    });

    it('should detect and resolve scheduling conflicts', () => {
      // Create conflicting tasks
      const task1: Task = {
        id: 'task-1',
        channelId: 'gaming-channel',
        title: 'Gaming Video 1',
        contentType: 'video',
        estimatedHours: 8,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'),
        scheduledEnd: new Date('2024-01-01T17:00:00'),
      };

      const task2: Task = {
        id: 'task-2',
        channelId: 'educational-channel',
        title: 'Educational Video 1',
        contentType: 'video',
        estimatedHours: 6,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T14:00:00'), // Overlaps with task1
        scheduledEnd: new Date('2024-01-01T20:00:00'),
      };

      const tasks = [task1, task2];

      // 1. Detect conflicts
      const conflicts = ConflictDetectionEngine.findSchedulingConflicts(tasks);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].overlapMinutes).toBe(180); // 3 hours overlap

      // 2. Get alternative suggestions
      const alternatives = ConflictDetectionEngine.suggestAlternativeSlots(
        task2,
        [task1],
        { start: '09:00', end: '17:00' }
      );

      expect(alternatives.length).toBeGreaterThan(0);

      // 3. Apply alternative scheduling
      const alternativeSlot = alternatives[0];
      const resolvedTask2: Task = {
        ...task2,
        scheduledStart: alternativeSlot.start,
        scheduledEnd: alternativeSlot.end,
      };

      // 4. Verify conflict resolution
      const resolvedConflicts = ConflictDetectionEngine.findSchedulingConflicts([
        task1,
        resolvedTask2,
      ]);
      expect(resolvedConflicts).toHaveLength(0);
    });

    it('should handle capacity overload with rebalancing suggestions', () => {
      // Create overloaded schedule
      const heavyTasks: Task[] = [
        {
          id: 'heavy-1',
          channelId: 'gaming-channel',
          title: 'Heavy Gaming Project',
          contentType: 'video',
          estimatedHours: 20,
          status: 'planned',
          scheduledStart: new Date('2024-01-01T09:00:00'),
          scheduledEnd: new Date('2024-01-02T17:00:00'),
        },
        {
          id: 'heavy-2',
          channelId: 'educational-channel',
          title: 'Heavy Educational Project',
          contentType: 'video',
          estimatedHours: 18,
          status: 'planned',
          scheduledStart: new Date('2024-01-03T09:00:00'),
          scheduledEnd: new Date('2024-01-04T15:00:00'),
        },
        {
          id: 'heavy-3',
          channelId: 'gaming-channel',
          title: 'Another Heavy Project',
          contentType: 'video',
          estimatedHours: 15,
          status: 'planned',
          scheduledStart: new Date('2024-01-05T09:00:00'),
          scheduledEnd: new Date('2024-01-06T12:00:00'),
        },
      ];

      const overloadedSchedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: heavyTasks,
        totalScheduledHours: 53,
        userCapacityHours: 40,
        isOverloaded: true,
      };

      // 1. Calculate workload metrics
      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        overloadedSchedule,
        mockChannels,
        8
      );

      expect(workloadMetrics.isOverloaded).toBe(true);
      expect(workloadMetrics.overloadHours).toBe(13);

      // 2. Generate rebalancing suggestions
      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        overloadedSchedule,
        mockChannels,
        workloadMetrics,
        {
          maxDailyHours: 8,
          allowTaskSplitting: false,
          allowCrossChannelRebalancing: true,
          preserveDeadlines: false,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        }
      );

      expect(suggestions.length).toBeGreaterThan(0);

      // 3. Apply a suggestion
      const bestSuggestion = suggestions[0];
      const { updatedTasks } = RebalancingSuggestionEngine.applySuggestion(
        bestSuggestion,
        overloadedSchedule
      );

      expect(updatedTasks).toHaveLength(3);

      // 4. Verify improvement
      const newTotalHours = updatedTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
      expect(newTotalHours).toBeLessThanOrEqual(53); // Should be same or less
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain referential integrity between channels, templates, and tasks', () => {
      // 1. Create task with valid references
      const validTask: Task = {
        id: 'valid-task',
        channelId: 'gaming-channel',
        templateId: 'gaming-video-template',
        title: 'Valid Task',
        contentType: 'video',
        estimatedHours: 12,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'),
        scheduledEnd: new Date('2024-01-01T21:00:00'),
      };

      // 2. Verify channel exists
      const channel = service.getChannel(validTask.channelId);
      expect(channel).toBeDefined();
      expect(channel?.id).toBe('gaming-channel');

      // 3. Verify template exists and is associated with channel
      const template = service.getTemplate(validTask.templateId!);
      expect(template).toBeDefined();
      expect(template?.channelIds).toContain('gaming-channel');

      // 4. Verify task content type matches template
      expect(validTask.contentType).toBe(template?.contentType);

      // 5. Test cascade deletion
      service.deleteChannel('gaming-channel');
      const deletedChannel = service.getChannel('gaming-channel');
      expect(deletedChannel).toBeNull();

      // Template should still exist but channel reference should be handled
      const remainingTemplate = service.getTemplate('gaming-video-template');
      expect(remainingTemplate).toBeDefined();
    });

    it('should validate business rules across services', () => {
      // 1. Test capacity limits
      const tasks: Task[] = [];
      let totalHours = 0;

      // Create tasks until we exceed capacity
      for (let i = 0; i < 6; i++) {
        const task: Task = {
          id: `task-${i}`,
          channelId: i % 2 === 0 ? 'gaming-channel' : 'educational-channel',
          title: `Task ${i}`,
          contentType: 'video',
          estimatedHours: 8,
          status: 'planned',
          scheduledStart: new Date(`2024-01-0${i + 1}T09:00:00`),
          scheduledEnd: new Date(`2024-01-0${i + 1}T17:00:00`),
        };
        tasks.push(task);
        totalHours += 8;
      }

      const schedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks,
        totalScheduledHours: totalHours,
        userCapacityHours: 40,
        isOverloaded: totalHours > 40,
      };

      // 2. Validate workload calculation
      const metrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      expect(metrics.isOverloaded).toBe(true);
      expect(metrics.overloadHours).toBe(8); // 48 - 40

      // 3. Validate warning generation
      const warnings = WorkloadCalculationEngine.detectOverloadWarnings(metrics);
      expect(warnings.length).toBeGreaterThan(0);

      const weeklyWarning = warnings.find(w => w.type === 'weekly');
      expect(weeklyWarning).toBeDefined();
      expect(weeklyWarning?.severity).toBe('medium');
    });

    it('should handle template-based task creation with proper hour estimation', () => {
      // 1. Get template
      const template = service.getTemplate('gaming-video-template');
      expect(template).toBeDefined();

      // 2. Calculate total estimated hours from template
      const totalTemplateHours = Object.values(template!.estimatedHours).reduce(
        (sum, hours) => sum + hours,
        0
      );
      expect(totalTemplateHours).toBe(12); // 1 + 6 + 4 + 1

      // 3. Create task based on template
      const templateBasedTask: Task = {
        id: 'template-task',
        channelId: template!.channelIds[0],
        templateId: template!.id,
        title: 'Template-based Task',
        contentType: template!.contentType,
        estimatedHours: totalTemplateHours,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'),
        scheduledEnd: new Date('2024-01-01T21:00:00'),
      };

      // 4. Verify task duration matches template estimation
      const taskDurationHours = 
        (templateBasedTask.scheduledEnd.getTime() - templateBasedTask.scheduledStart.getTime()) / 
        (1000 * 60 * 60);
      
      expect(taskDurationHours).toBe(templateBasedTask.estimatedHours);

      // 5. Verify workflow steps are available
      expect(template!.workflowSteps).toHaveLength(5);
      expect(template!.workflowSteps).toContain('Research game');
      expect(template!.workflowSteps).toContain('Record gameplay');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', () => {
      // 1. Create large number of channels
      const largeChannelSet: Channel[] = [];
      for (let i = 0; i < 50; i++) {
        largeChannelSet.push({
          id: `channel-${i}`,
          name: `Channel ${i}`,
          contentType: i % 2 === 0 ? 'gaming' : 'educational',
          postingSchedule: {
            frequency: 'weekly',
            preferredDays: ['Monday'],
            preferredTimes: ['10:00'],
          },
          color: `#${i.toString(16).padStart(6, '0')}`,
          createdAt: new Date('2024-01-01'),
          isActive: true,
        });
      }

      // 2. Add channels to storage
      const startTime = performance.now();
      largeChannelSet.forEach(channel => service.addChannel(channel));
      const addTime = performance.now() - startTime;

      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second

      // 3. Retrieve all channels
      const retrieveStartTime = performance.now();
      const retrievedChannels = service.getChannels();
      const retrieveTime = performance.now() - retrieveStartTime;

      expect(retrieveTime).toBeLessThan(100); // Should complete in under 100ms
      expect(retrievedChannels).toHaveLength(52); // 50 + 2 original

      // 4. Create large task set
      const largeTasks: Task[] = [];
      for (let i = 0; i < 100; i++) {
        largeTasks.push({
          id: `task-${i}`,
          channelId: `channel-${i % 50}`,
          title: `Task ${i}`,
          contentType: 'video',
          estimatedHours: 4,
          status: 'planned',
          scheduledStart: new Date(`2024-01-01T${9 + (i % 8)}:00:00`),
          scheduledEnd: new Date(`2024-01-01T${13 + (i % 8)}:00:00`),
        });
      }

      // 5. Test workload calculation performance
      const schedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: largeTasks,
        totalScheduledHours: 400,
        userCapacityHours: 40,
        isOverloaded: true,
      };

      const calcStartTime = performance.now();
      const metrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        retrievedChannels,
        8
      );
      const calcTime = performance.now() - calcStartTime;

      expect(calcTime).toBeLessThan(500); // Should complete in under 500ms
      expect(metrics.channelBreakdown).toHaveLength(52);
    });

    it('should handle concurrent operations safely', () => {
      // Simulate concurrent channel additions
      const concurrentChannels: Channel[] = [];
      for (let i = 0; i < 10; i++) {
        concurrentChannels.push({
          id: `concurrent-channel-${i}`,
          name: `Concurrent Channel ${i}`,
          contentType: 'gaming',
          postingSchedule: {
            frequency: 'weekly',
            preferredDays: ['Monday'],
            preferredTimes: ['10:00'],
          },
          color: '#ff0000',
          createdAt: new Date('2024-01-01'),
          isActive: true,
        });
      }

      // Add channels concurrently (simulated)
      concurrentChannels.forEach(channel => {
        service.addChannel(channel);
      });

      // Verify all channels were added
      const allChannels = service.getChannels();
      const concurrentChannelCount = allChannels.filter(c => 
        c.id.startsWith('concurrent-channel-')
      ).length;

      expect(concurrentChannelCount).toBe(10);

      // Test concurrent updates
      concurrentChannels.forEach((channel, index) => {
        service.updateChannel(channel.id, { 
          name: `Updated Concurrent Channel ${index}` 
        });
      });

      // Verify updates
      const updatedChannels = service.getChannels();
      const updatedConcurrentChannels = updatedChannels.filter(c => 
        c.id.startsWith('concurrent-channel-')
      );

      updatedConcurrentChannels.forEach((channel, index) => {
        expect(channel.name).toBe(`Updated Concurrent Channel ${index}`);
      });
    });
  });
});