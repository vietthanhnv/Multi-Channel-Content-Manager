import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentCreationForm } from '../ContentCreationForm';
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
    workflowSteps: ['Research topic', 'Record gameplay', 'Edit video'],
    channelIds: ['channel-1'],
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

describe('ContentCreationForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.alert
    window.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders content creation form', () => {
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create Content')).toBeInTheDocument();
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Title *')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated Hours')).toBeInTheDocument();
  });

  it('shows no template selected initially', () => {
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('No template selected. You can create content from scratch or select a template to pre-populate fields.')).toBeInTheDocument();
    expect(screen.getByText('Select Template')).toBeInTheDocument();
  });

  it('opens template picker when select template button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const selectTemplateButton = screen.getByText('Select Template');
    await user.click(selectTemplateButton);

    expect(screen.getByText('Select Template')).toBeInTheDocument(); // Modal title
  });

  it('applies template data when template is selected', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Open template picker
    const selectTemplateButton = screen.getByText('Select Template');
    await user.click(selectTemplateButton);

    // Select the template
    const templateRadio = screen.getByDisplayValue('template-1');
    await user.click(templateRadio);

    const useTemplateButton = screen.getByText('Use Template');
    await user.click(useTemplateButton);

    // Check that template data is applied
    expect(screen.getByText('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByText('Estimated Time: 6.5h')).toBeInTheDocument();
    expect(screen.getByDisplayValue('video')).toBeInTheDocument();
    expect(screen.getByDisplayValue('6.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Research topic')).toBeInTheDocument();
  });

  it('allows adding and removing workflow steps', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Initially no workflow steps
    expect(screen.getByText('No workflow steps defined.')).toBeInTheDocument();

    // Add first step
    const addFirstStepButton = screen.getByText('Add First Step');
    await user.click(addFirstStepButton);

    const stepInput = screen.getByPlaceholderText('Step 1');
    await user.type(stepInput, 'First step');

    // Add another step
    const addStepButton = screen.getByText('Add Step');
    await user.click(addStepButton);

    const stepInputs = screen.getAllByPlaceholderText(/Step \d+/);
    expect(stepInputs).toHaveLength(2);

    await user.type(stepInputs[1], 'Second step');

    // Remove first step
    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[0]);

    expect(screen.getAllByPlaceholderText(/Step \d+/)).toHaveLength(1);
    expect(screen.getByDisplayValue('Second step')).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByText('Create Content');
    await user.click(submitButton);

    expect(window.alert).toHaveBeenCalledWith('Please enter a title for the content');
  });

  it('validates schedule fields on submit', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in title but not schedule
    const titleInput = screen.getByLabelText('Content Title *');
    await user.type(titleInput, 'Test Content');

    const submitButton = screen.getByText('Create Content');
    await user.click(submitButton);

    expect(window.alert).toHaveBeenCalledWith('Please set start and end times');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Content Title *'), 'Test Content');
    await user.type(screen.getByLabelText('Start Time *'), '2024-12-01T10:00');
    await user.type(screen.getByLabelText('End Time *'), '2024-12-01T12:00');

    const submitButton = screen.getByText('Create Content');
    await user.click(submitButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Content',
        channelId: 'channel-1',
        contentType: 'video',
        status: 'planned',
      })
    );
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('updates content type and other form fields', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Change content type
    const contentTypeSelect = screen.getByLabelText('Content Type *');
    await user.selectOptions(contentTypeSelect, 'short');
    expect(screen.getByDisplayValue('short')).toBeInTheDocument();

    // Change estimated hours
    const hoursInput = screen.getByLabelText('Estimated Hours');
    await user.clear(hoursInput);
    await user.type(hoursInput, '5');
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();

    // Add notes
    const notesTextarea = screen.getByLabelText('Notes');
    await user.type(notesTextarea, 'Test notes');
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
  });

  it('shows change template button when template is selected', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Open template picker and select template
    await user.click(screen.getByText('Select Template'));
    await user.click(screen.getByDisplayValue('template-1'));
    await user.click(screen.getByText('Use Template'));

    // Should show change template button
    expect(screen.getByText('Change Template')).toBeInTheDocument();
  });

  it('includes template ID in task when template is used', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <ContentCreationForm
        channelId="channel-1"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Select template
    await user.click(screen.getByText('Select Template'));
    await user.click(screen.getByDisplayValue('template-1'));
    await user.click(screen.getByText('Use Template'));

    // Fill in required fields
    await user.type(screen.getByLabelText('Content Title *'), 'Test Content');
    await user.type(screen.getByLabelText('Start Time *'), '2024-12-01T10:00');
    await user.type(screen.getByLabelText('End Time *'), '2024-12-01T12:00');

    await user.click(screen.getByText('Create Content'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'template-1',
      })
    );
  });
});