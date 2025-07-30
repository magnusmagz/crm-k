import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock AuthContext
const mockProfile = {
  id: '1',
  userId: '1',
  firstName: 'Test',
  lastName: 'User',
  primaryColor: '#3b82f6',
  crmName: 'My Custom CRM',
};

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    user: { id: '1', email: 'test@example.com' },
  }),
}));

// Simple component to test theme application
const TestComponent = () => {
  const { primaryColor, crmName } = require('../contexts/ThemeContext').useTheme();
  return (
    <div>
      <h1 data-testid="crm-name">{crmName}</h1>
      <div data-testid="primary-color" style={{ color: primaryColor }}>
        {primaryColor}
      </div>
    </div>
  );
};

describe('Theme Functionality', () => {
  beforeEach(() => {
    // Reset document properties
    document.documentElement.style.cssText = '';
    document.title = '';
  });

  it('applies theme color as CSS variables', async () => {
    const { ThemeProvider } = require('../contexts/ThemeContext');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      const root = document.documentElement;
      // Check that CSS variables are set
      expect(root.style.getPropertyValue('--color-primary')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-primary-hex')).toBe('#3b82f6');
    });
  });

  it('updates document title with CRM name', async () => {
    const { ThemeProvider } = require('../contexts/ThemeContext');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(document.title).toBe('My Custom CRM');
    });
  });

  it('displays theme values in components', () => {
    const { ThemeProvider } = require('../contexts/ThemeContext');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('crm-name')).toHaveTextContent('My Custom CRM');
    expect(screen.getByTestId('primary-color')).toHaveTextContent('#3b82f6');
  });

  it('handles empty theme values gracefully', async () => {
    // Update mock to return empty values
    mockProfile.primaryColor = '';
    mockProfile.crmName = '';

    const { ThemeProvider } = require('../contexts/ThemeContext');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      // Should use defaults when empty
      expect(document.title).toBe('CRM Killer');
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary-hex')).toBe('#1f2937');
    });
  });

  it('validates hex color format', () => {
    const isValidHex = (color: string) => /^#[0-9A-Fa-f]{6}$/i.test(color);
    
    expect(isValidHex('#3b82f6')).toBe(true);
    expect(isValidHex('#FF5733')).toBe(true);
    expect(isValidHex('invalid')).toBe(false);
    expect(isValidHex('#xyz')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });
});