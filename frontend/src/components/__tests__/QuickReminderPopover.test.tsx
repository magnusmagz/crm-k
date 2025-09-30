import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickReminderPopover } from '../QuickReminderPopover';
import { remindersAPI } from '../../services/api';

// Mock the API
jest.mock('../../services/api', () => ({
  remindersAPI: {
    create: jest.fn()
  }
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

describe('QuickReminderPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trigger button rendering', () => {
    it('renders link variant by default', () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('text-primary');
    });

    it('renders icon variant without text', () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
          variant="icon"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    it('renders button variant', () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
          variant="button"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('border-gray-300');
    });

    it('applies touch-manipulation class for mobile', () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      expect(button).toHaveClass('touch-manipulation');
    });
  });

  describe('Popover interaction', () => {
    it('opens popover when button is clicked', async () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });
    });

    it('stops event propagation on click', () => {
      const handleParentClick = jest.fn();

      render(
        <div onClick={handleParentClick}>
          <QuickReminderPopover
            entityType="contact"
            entityId="123"
            entityName="John Doe"
          />
        </div>
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      // Parent click should not be called due to stopPropagation
      expect(handleParentClick).not.toHaveBeenCalled();
    });

    it('displays entity name in popover', async () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('submits reminder with correct data', async () => {
      (remindersAPI.create as jest.Mock).mockResolvedValue({ id: 'reminder-1' });

      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      // Open popover
      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      // Fill form
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      const dateInput = screen.getByLabelText(/when/i);

      fireEvent.change(titleInput, { target: { value: 'Test reminder' } });
      fireEvent.change(dateInput, { target: { value: '2025-10-15T10:00' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /create$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(remindersAPI.create).toHaveBeenCalledWith({
          title: 'Test reminder',
          description: '',
          remindAt: '2025-10-15T10:00',
          entityType: 'contact',
          entityId: '123',
          entityName: 'John Doe'
        });
      });
    });

    it('shows success message after submission', async () => {
      (remindersAPI.create as jest.Mock).mockResolvedValue({ id: 'reminder-1' });

      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      // Open popover
      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      // Fill and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/when/i)).toBeInTheDocument();
      });

      const dateInput = screen.getByLabelText(/when/i);
      fireEvent.change(dateInput, { target: { value: '2025-10-15T10:00' } });

      const submitButton = screen.getByRole('button', { name: /create$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/created/i)).toBeInTheDocument();
      });
    });

    it('shows error message on submission failure', async () => {
      (remindersAPI.create as jest.Mock).mockRejectedValue({
        response: { data: { error: 'Failed to create reminder' } }
      });

      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      // Open popover
      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      // Fill and submit
      await waitFor(() => {
        expect(screen.getByLabelText(/when/i)).toBeInTheDocument();
      });

      const dateInput = screen.getByLabelText(/when/i);
      fireEvent.change(dateInput, { target: { value: '2025-10-15T10:00' } });

      const submitButton = screen.getByRole('button', { name: /create$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create reminder/i)).toBeInTheDocument();
      });
    });
  });

  describe('Quick time options', () => {
    it('displays quick time buttons', async () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /1 hour/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /tomorrow/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /1 week/i })).toBeInTheDocument();
      });
    });

    it('sets time when quick button clicked', async () => {
      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /1 hour/i })).toBeInTheDocument();
      });

      const quickButton = screen.getByRole('button', { name: /1 hour/i });
      fireEvent.click(quickButton);

      const dateInput = screen.getByLabelText(/when/i) as HTMLInputElement;
      expect(dateInput.value).toBeTruthy();
    });
  });

  describe('Mobile touch handling', () => {
    it('handles touch events without preventDefault error', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      render(
        <QuickReminderPopover
          entityType="contact"
          entityId="123"
          entityName="John Doe"
        />
      );

      const button = screen.getByRole('button', { name: /set reminder/i });

      // Simulate touch event
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);

      // Should not log passive event listener error
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('passive event listener')
      );

      consoleError.mockRestore();
    });
  });
});
