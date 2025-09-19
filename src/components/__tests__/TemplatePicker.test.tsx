import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatePicker } from '../TemplatePicker';
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
  {
    id: 'template-3',
    name: 'Universal Post Template',
    contentType: 'post',
    estimatedHours: {
      planning: 0.25,
      production: 0.5,
      editing: 0.25,
      publishing: 0.1,
    },
    workflowSteps: ['Write content', 'Create graphics', 'Schedule post'],
    channelIds: [], // Available for all channels
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

describe('TemplatePicker', () => {
  const mockOnSelectTemplate = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProvider(
      <TemplatePicker
        isOpen={false}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Select Template')).not.toBeInTheDocument();
  });

  it('renders template picker when isOpen is true', () => {
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Select Template')).toBeInTheDocument();
    expect(screen.getByText('No Template')).toBeInTheDocument();
    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByText('Educational Short Template')).toBeInTheDocument();
    expect(screen.getByText('Universal Post Template')).toBeInTheDocument();
  });

  it('filters templates by content type', () => {
    renderWithProvider(
      <TemplatePicker
        contentType="video"
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.queryByText('Educational Short Template')).not.toBeInTheDocument();
    expect(screen.queryByText('Universal Post Template')).not.toBeInTheDocument();
  });

  it('filters templates by channel assignment', () => {
    renderWithProvider(
      <TemplatePicker
        channelId="channel-1"
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.queryByText('Educational Short Template')).not.toBeInTheDocument();
    expect(screen.getByText('Universal Post Template')).toBeInTheDocument(); // Available for all channels
  });

  it('shows template details correctly', () => {
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Estimated Time: 6.5h')).toBeInTheDocument();
    expect(screen.getByText('Planning: 1h')).toBeInTheDocument();
    expect(screen.getByText('Production: 3h')).toBeInTheDocument();
    expect(screen.getByText('Research topic')).toBeInTheDocument();
    expect(screen.getByText('Record gameplay')).toBeInTheDocument();
  });

  it('shows truncated workflow steps for long lists', () => {
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    // Gaming template has 5 steps, should show first 3 + "more steps"
    expect(screen.getByText('Research topic')).toBeInTheDocument();
    expect(screen.getByText('Record gameplay')).toBeInTheDocument();
    expect(screen.getByText('Edit video')).toBeInTheDocument();
    expect(screen.getByText('+2 more steps')).toBeInTheDocument();
  });

  it('allows selecting no template', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    const noTemplateRadio = screen.getByDisplayValue('');
    await user.click(noTemplateRadio);

    const selectButton = screen.getByText('Continue without template');
    await user.click(selectButton);

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(null);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('allows selecting a template', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    const templateRadio = screen.getByDisplayValue('template-1');
    await user.click(templateRadio);

    const selectButton = screen.getByText('Use Template');
    await user.click(selectButton);

    expect(mockOnSelectTemplate).toHaveBeenCalledWith(mockTemplates[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByText('×');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows empty state when no templates match filters', () => {
    renderWithProvider(
      <TemplatePicker
        contentType="video"
        channelId="nonexistent-channel"
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No templates available for this content type.')).toBeInTheDocument();
    expect(screen.getByText('Continue without template')).toBeInTheDocument();
  });

  it('displays channel assignments correctly', () => {
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
    expect(screen.getByText('Educational Channel')).toBeInTheDocument();
    expect(screen.getByText('All channels')).toBeInTheDocument(); // For universal template
  });

  it('updates button text based on selection', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplatePicker
        isOpen={true}
        onSelectTemplate={mockOnSelectTemplate}
        onClose={mockOnClose}
      />
    );

    // Initially no template selected
    expect(screen.getByText('Continue without template')).toBeInTheDocument();

    // Select a template
    const templateRadio = screen.getByDisplayValue('template-1');
    await user.click(templateRadio);

    expect(screen.getByText('Use Template')).toBeInTheDocument();

    // Select no template again
    const noTemplateRadio = screen.getByDisplayValue('');
    await user.click(noTemplateRadio);

    expect(screen.getByText('Continue without template')).toBeInTheDocument();
  });
});