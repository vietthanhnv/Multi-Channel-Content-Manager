import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplateLibrary } from '../TemplateLibrary';
import { AppProvider } from '../../context/AppContext';
import { ContentTemplate, Channel } from '../../types';

// Mock data
const mockChannels: Channel[] = [
  {
    id: 'channel-1',
    name: 'Gaming Channel',
    contentType: 'gaming',
    postingSchedule: {
      frequency: 'weekly',
      preferredDays: ['Monday'],
      preferredTimes: ['18:00'],
    },
    color: '#ff0000',
    createdAt: new Date(),
    isActive: true,
  },
  {
    id: 'channel-2',
    name: 'Educational Channel',
    contentType: 'educational',
    postingSchedule: {
      frequency: 'biweekly',
      preferredDays: ['Wednesday'],
      preferredTimes: ['12:00'],
    },
    color: '#00ff00',
    createdAt: new Date(),
    isActive: true,
  },
];

const mockTemplates: ContentTemplate[] = [
  {
    id: 'template-1',
    name: 'Gaming Video Template',
    contentType: 'video',
    estimatedHours: {
      planning: 1,
      production: 3,
      editing: 2,
      publishing: 0.5,
    },
    workflowSteps: ['Research topic', 'Record gameplay', 'Edit video', 'Create thumbnail', 'Upload'],
    channelIds: ['channel-1'],
  },
  {
    id: 'template-2',
    name: 'Educational Short Template',
    contentType: 'short',
    estimatedHours: {
      planning: 0.5,
      production: 1,
      editing: 1,
      publishing: 0.25,
    },
    workflowSteps: ['Plan content', 'Record', 'Edit', 'Upload'],
    channelIds: ['channel-2'],
  },
];

const mockInitialState = {
  channels: mockChannels,
  templates: mockTemplates,
  currentWeek: {
    weekStartDate: new Date(),
    tasks: [],
    totalScheduledHours: 0,
    userCapacityHours: 40,
    isOverloaded: false,
  },
  selectedChannelId: undefined,
  userSettings: {
    weeklyCapacityHours: 40,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: { start: '09:00', end: '17:00' },
  },
  ui: {
    activeView: 'templates' as const,
    isLoading: false,
    errors: [],
  },
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AppProvider initialState={mockInitialState}>
      {component}
    </AppProvider>
  );
};

describe('TemplateLibrary', () => {
  const mockOnEditTemplate = jest.fn();
  const mockOnCreateTemplate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template library with templates', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    expect(screen.getByText('Content Templates')).toBeInTheDocument();
    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByText('Educational Short Template')).toBeInTheDocument();
  });

  it('displays template details correctly', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    // Check first template details
    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByText('Total Time: 6.5h')).toBeInTheDocument();
    expect(screen.getByText('Planning: 1h')).toBeInTheDocument();
    expect(screen.getByText('Production: 3h')).toBeInTheDocument();
    expect(screen.getByText('Editing: 2h')).toBeInTheDocument();
    expect(screen.getByText('Publishing: 0.5h')).toBeInTheDocument();
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
  });

  it('filters templates by content type', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    // Initially shows all templates
    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByText('Educational Short Template')).toBeInTheDocument();

    // Filter by video
    const filterSelect = screen.getByLabelText('Filter by content type:');
    fireEvent.change(filterSelect, { target: { value: 'video' } });

    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.queryByText('Educational Short Template')).not.toBeInTheDocument();

    // Filter by short
    fireEvent.change(filterSelect, { target: { value: 'short' } });

    expect(screen.queryByText('Gaming Video Template')).not.toBeInTheDocument();
    expect(screen.getByText('Educational Short Template')).toBeInTheDocument();
  });

  it('calls onCreateTemplate when create button is clicked', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    const createButton = screen.getByText('Create Template');
    fireEvent.click(createButton);

    expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1);
  });

  it('calls onEditTemplate when edit button is clicked', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnEditTemplate).toHaveBeenCalledTimes(1);
    expect(mockOnEditTemplate).toHaveBeenCalledWith(mockTemplates[0]);
  });

  it('shows delete confirmation and deletes template', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = jest.fn(() => true);

    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this template?');

    // Restore original confirm
    window.confirm = originalConfirm;
  });

  it('shows empty state when no templates exist', () => {
    const emptyState = {
      ...mockInitialState,
      templates: [],
    };

    render(
      <AppProvider initialState={emptyState}>
        <TemplateLibrary
          onEditTemplate={mockOnEditTemplate}
          onCreateTemplate={mockOnCreateTemplate}
        />
      </AppProvider>
    );

    expect(screen.getByText('No templates found.')).toBeInTheDocument();
    expect(screen.getByText('Create your first template')).toBeInTheDocument();
  });

  it('displays workflow steps correctly', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    expect(screen.getByText('Research topic')).toBeInTheDocument();
    expect(screen.getByText('Record gameplay')).toBeInTheDocument();
    expect(screen.getByText('Edit video')).toBeInTheDocument();
    expect(screen.getByText('Create thumbnail')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('shows correct content type badges', () => {
    renderWithProvider(
      <TemplateLibrary
        onEditTemplate={mockOnEditTemplate}
        onCreateTemplate={mockOnCreateTemplate}
      />
    );

    const videoBadge = screen.getByText('video');
    const shortBadge = screen.getByText('short');

    expect(videoBadge).toBeInTheDocument();
    expect(shortBadge).toBeInTheDocument();
  });

  it('handles templates with no assigned channels', () => {
    const templateWithNoChannels = {
      ...mockTemplates[0],
      channelIds: [],
    };

    const stateWithNoChannelTemplate = {
      ...mockInitialState,
      templates: [templateWithNoChannels],
    };

    render(
      <AppProvider initialState={stateWithNoChannelTemplate}>
        <TemplateLibrary
          onEditTemplate={mockOnEditTemplate}
          onCreateTemplate={mockOnCreateTemplate}
        />
      </AppProvider>
    );

    expect(screen.getByText('No channels assigned')).toBeInTheDocument();
  });
});