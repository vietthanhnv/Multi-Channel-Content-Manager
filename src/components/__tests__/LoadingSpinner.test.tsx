import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LoadingSpinner, { 
  LoadingState, 
  ProgressIndicator, 
  ButtonLoading 
} from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('medium', 'primary');
  });

  it('renders with custom size and color', () => {
    render(<LoadingSpinner size="large" color="secondary" />);
    
    const spinner = document.querySelector('.spinner');
    expect(spinner).toHaveClass('large', 'secondary');
  });

  it('renders with text', () => {
    render(<LoadingSpinner text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with overlay', () => {
    render(<LoadingSpinner overlay />);
    
    expect(document.querySelector('.overlay')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = document.querySelector('.spinner');
    expect(spinner).toHaveClass('custom-class');
  });
});

describe('LoadingState', () => {
  it('shows loading spinner when isLoading is true', () => {
    render(
      <LoadingState isLoading={true}>
        <div>Content</div>
      </LoadingState>
    );

    expect(document.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows children when isLoading is false', () => {
    render(
      <LoadingState isLoading={false}>
        <div>Content</div>
      </LoadingState>
    );

    expect(document.querySelector('.spinner')).not.toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows custom loading component', () => {
    const customLoading = <div>Custom Loading</div>;
    
    render(
      <LoadingState isLoading={true} loadingComponent={customLoading}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    expect(document.querySelector('.spinner')).not.toBeInTheDocument();
  });

  it('shows overlay loading when specified', () => {
    render(
      <LoadingState isLoading={true} overlay>
        <div>Content</div>
      </LoadingState>
    );

    expect(document.querySelector('.overlay')).toBeInTheDocument();
  });
});

describe('ProgressIndicator', () => {
  it('renders with progress value', () => {
    render(<ProgressIndicator progress={75} />);
    
    const progressFill = document.querySelector('.progressFill');
    expect(progressFill).toHaveStyle({ width: '75%' });
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps progress value between 0 and 100', () => {
    const { rerender } = render(<ProgressIndicator progress={-10} />);
    
    let progressFill = document.querySelector('.progressFill');
    expect(progressFill).toHaveStyle({ width: '0%' });
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<ProgressIndicator progress={150} />);
    
    progressFill = document.querySelector('.progressFill');
    expect(progressFill).toHaveStyle({ width: '100%' });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders with text', () => {
    render(<ProgressIndicator progress={50} text="Uploading..." />);
    
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressIndicator progress={50} showPercentage={false} />);
    
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies different colors', () => {
    render(<ProgressIndicator progress={50} color="success" />);
    
    const progressFill = document.querySelector('.progressFill');
    expect(progressFill).toHaveClass('success');
  });

  it('applies different sizes', () => {
    render(<ProgressIndicator progress={50} size="large" />);
    
    const container = document.querySelector('.progressContainer');
    expect(container).toHaveClass('large');
  });
});

describe('ButtonLoading', () => {
  it('renders button with children', () => {
    render(
      <ButtonLoading isLoading={false}>
        Click me
      </ButtonLoading>
    );

    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows loading spinner when isLoading is true', () => {
    render(
      <ButtonLoading isLoading={true}>
        Click me
      </ButtonLoading>
    );

    expect(document.querySelector('.buttonSpinner')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(
      <ButtonLoading isLoading={false} disabled={true}>
        Click me
      </ButtonLoading>
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked and not loading', () => {
    const handleClick = vi.fn();
    
    render(
      <ButtonLoading isLoading={false} onClick={handleClick}>
        Click me
      </ButtonLoading>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    
    render(
      <ButtonLoading isLoading={true} onClick={handleClick}>
        Click me
      </ButtonLoading>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(
      <ButtonLoading isLoading={false} className="custom-button">
        Click me
      </ButtonLoading>
    );

    expect(screen.getByRole('button')).toHaveClass('custom-button');
  });

  it('sets correct button type', () => {
    render(
      <ButtonLoading isLoading={false} type="submit">
        Submit
      </ButtonLoading>
    );

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('applies loading text styling when loading', () => {
    render(
      <ButtonLoading isLoading={true}>
        Click me
      </ButtonLoading>
    );

    const textSpan = document.querySelector('.buttonTextLoading');
    expect(textSpan).toBeInTheDocument();
  });
});