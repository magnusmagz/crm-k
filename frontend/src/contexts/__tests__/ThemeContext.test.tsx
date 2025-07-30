import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { AuthContext } from '../AuthContext';

// Mock auth context
const mockAuthContext = {
  user: null,
  profile: null,
  token: null,
  isLoading: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
};

// Test component to access theme values
const TestComponent = () => {
  const { primaryColor, crmName } = useTheme();
  return (
    <div>
      <span data-testid="primary-color">{primaryColor}</span>
      <span data-testid="crm-name">{crmName}</span>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Reset document properties
    document.documentElement.style.cssText = '';
    document.title = '';
  });

  it('provides default theme values when no profile exists', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#1f2937');
    expect(screen.getByTestId('crm-name')).toHaveTextContent('CRM Killer');
  });

  it('uses profile theme values when available', () => {
    const contextWithProfile = {
      ...mockAuthContext,
      profile: {
        id: '1',
        userId: '1',
        firstName: 'Test',
        lastName: 'User',
        primaryColor: '#ff5733',
        crmName: 'My Custom CRM',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    render(
      <AuthContext.Provider value={contextWithProfile}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('primary-color')).toHaveTextContent('#ff5733');
    expect(screen.getByTestId('crm-name')).toHaveTextContent('My Custom CRM');
  });

  it('updates CSS variables when theme changes', async () => {
    const contextWithProfile = {
      ...mockAuthContext,
      profile: {
        id: '1',
        userId: '1',
        firstName: 'Test',
        lastName: 'User',
        primaryColor: '#3b82f6',
        crmName: 'Blue CRM',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    render(
      <AuthContext.Provider value={contextWithProfile}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary')).toBe('59 130 246');
      expect(root.style.getPropertyValue('--color-primary-hex')).toBe('#3b82f6');
      expect(root.style.getPropertyValue('--color-primary-dark')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-primary-dark-hex')).toBeTruthy();
    });
  });

  it('updates document title with CRM name', async () => {
    const contextWithProfile = {
      ...mockAuthContext,
      profile: {
        id: '1',
        userId: '1',
        firstName: 'Test',
        lastName: 'User',
        primaryColor: '#1f2937',
        crmName: 'Awesome CRM',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    render(
      <AuthContext.Provider value={contextWithProfile}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(document.title).toBe('Awesome CRM');
    });
  });

  it('generates darker color variant for hover states', async () => {
    const contextWithProfile = {
      ...mockAuthContext,
      profile: {
        id: '1',
        userId: '1',
        firstName: 'Test',
        lastName: 'User',
        primaryColor: '#ff0000', // Pure red
        crmName: 'Red CRM',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    render(
      <AuthContext.Provider value={contextWithProfile}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      const root = document.documentElement;
      const darkHex = root.style.getPropertyValue('--color-primary-dark-hex');
      
      // Darker variant should be a darker shade of red
      expect(darkHex).toBeTruthy();
      expect(darkHex).not.toBe('#ff0000');
      
      // Parse RGB values to verify it's darker
      const darkRgb = root.style.getPropertyValue('--color-primary-dark');
      const [r, g, b] = darkRgb.split(' ').map(Number);
      expect(r).toBeLessThan(255); // Should be darker than original
    });
  });
});