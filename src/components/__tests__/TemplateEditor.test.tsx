import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '../TemplateEditor';
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

const mockTemplate: ContentTemplate = {
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
};

const mockInitialState = {
  channels: mockChannels,
  templates: [],
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

describe('TemplateEditor', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderWithProvider(
      <TemplateEditor
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Create New Template')).not.toBeInTheDocument();
  });

  it('renders create template form when isOpen is true', () => {
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Create New Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Template Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Type *')).toBeInTheDocument();
    expect(screen.getByText('Time Estimates (hours) *')).toBeInTheDocument();
    expect(screen.getByText('Workflow Steps *')).toBeInTheDocument();
  });

  it('renders edit template form with existing data', () => {
    renderWithProvider(
      <TemplateEditor
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Edit Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gaming Video Template')).toBeInTheDocument();
    expect(screen.getByDisplayValue('video')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // planning hours
    expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // production hours
    expect(screen.getByDisplayValue('Research topic')).toBeInTheDocument();
  });

  it('calculates total hours correctly', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const planningInput = screen.getByLabelText('Planning');
    const productionInput = screen.getByLabelText('Production');
    const editingInput = screen.getByLabelText('Editing');
    const publishingInput = screen.getByLabelText('Publishing');

    await user.clear(planningInput);
    await user.type(planningInput, '2');
    await user.clear(productionInput);
    await user.type(productionInput, '4');
    await user.clear(editingInput);
    await user.type(editingInput, '3');
    await user.clear(publishingInput);
    await user.type(publishingInput, '1');

    expect(screen.getByText('Total: 10 hours')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const submitButton = screen.getByText('Create Template');
    await user.click(submitButton);

    expect(screen.getByText('Template name is required')).toBeInTheDocument();
    expect(screen.getByText('At least one workflow step is required')).toBeInTheDocument();
    expect(screen.getByText('Total estimated hours must be greater than 0')).toBeInTheDocument();
  });

  it('adds and removes workflow steps', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Initially has one empty step
    expect(screen.getAllByPlaceholderText(/Step \d+/)).toHaveLength(1);

    // Add a step
    const addStepButton = screen.getByText('Add Step');
    await user.click(addStepButton);

    expect(screen.getAllByPlaceholderText(/Step \d+/)).toHaveLength(2);

    // Fill in steps
    const stepInputs = screen.getAllByPlaceholderText(/Step \d+/);
    await user.type(stepInputs[0], 'First step');
    await user.type(stepInputs[1], 'Second step');

    // Remove a step
    const removeButtons = screen.getAllByText('Remove');
    await user.click(removeButtons[0]);

    expect(screen.getAllByPlaceholderText(/Step \d+/)).toHaveLength(1);
    expect(screen.getByDisplayValue('Second step')).toBeInTheDocument();
  });

  it('handles channel selection', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const gamingChannelCheckbox = screen.getByLabelText(/Gaming Channel/);
    const educationalChannelCheckbox = screen.getByLabelText(/Educational Channel/);

    expect(gamingChannelCheckbox).not.toBeChecked();
    expect(educationalChannelCheckbox).not.toBeChecked();

    await user.click(gamingChannelCheckbox);
    expect(gamingChannelCheckbox).toBeChecked();

    await user.click(educationalChannelCheckbox);
    expect(educationalChannelCheckbox).toBeChecked();

    await user.click(gamingChannelCheckbox);
    expect(gamingChannelCheckbox).not.toBeChecked();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText('Template Name *'), 'Test Template');
    await user.type(screen.getByLabelText('Planning'), '1');
    await user.type(screen.getByLabelText('Production'), '2');
    await user.type(screen.getByPlaceholderText('Step 1'), 'Test step');

    const submitButton = screen.getByText('Create Template');
    await user.click(submitButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const closeButton = screen.getByText('×');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when overlay is clicked', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Click on the overlay (not the modal content)
    const overlay = screen.getByText('Create New Template').closest('.modalOverlay');
    if (overlay) {
      await user.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('shows no channels message when no channels exist', () => {
    const stateWithNoChannels = {
      ...mockInitialState,
      channels: [],
    };

    render(
      <AppProvider initialState={stateWithNoChannels}>
        <TemplateEditor
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </AppProvider>
    );

    expect(screen.getByText('No channels available. Create channels first.')).toBeInTheDocument();
  });

  it('updates template when editing existing template', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <TemplateEditor
        template={mockTemplate}
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByDisplayValue('Gaming Video Template');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Template Name');

    const submitButton = screen.getByText('Update Template');
    await user.click(submitButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});