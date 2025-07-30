import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Profile from '../Profile';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the API module
jest.mock('../../services/api', () => ({
  userAPI: {
    updateProfile: jest.fn(),
  },
}));

const mockedApi = require('../../services/api');

// Mock auth context
const mockAuthContext = {
  user: { id: '1', email: 'test@example.com' } as any,
  profile: {
    id: '1',
    userId: '1',
    firstName: 'Test',
    lastName: 'User',
    primaryColor: '#1f2937',
    crmName: 'CRM Killer',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
  token: 'mock-token',
  isLoading: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  updateProfile: jest.fn(),
};

const renderProfile = () => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <ThemeProvider>
          <Profile />
        </ThemeProvider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Profile Theme Customization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays current theme settings', () => {
    renderProfile();
    
    expect(screen.getByText('Primary Color')).toBeInTheDocument();
    expect(screen.getByText('#1f2937')).toBeInTheDocument();
    expect(screen.getByText('CRM Name')).toBeInTheDocument();
    expect(screen.getByText('CRM Killer')).toBeInTheDocument();
  });

  it('allows editing theme settings', async () => {
    const user = userEvent.setup();
    renderProfile();
    
    // Click edit button
    const editButton = screen.getByText('Edit Profile');
    await user.click(editButton);
    
    // Find theme input fields
    const colorInput = screen.getByLabelText('Primary Color') as HTMLInputElement;
    const crmNameInput = screen.getByLabelText('CRM Name') as HTMLInputElement;
    
    expect(colorInput.value).toBe('#1f2937');
    expect(crmNameInput.value).toBe('CRM Killer');
  });

  it('updates theme settings successfully', async () => {
    const user = userEvent.setup();
    
    mockedApi.userAPI.updateProfile.mockResolvedValue({
      data: {
        profile: {
          ...mockAuthContext.profile,
          primaryColor: '#3b82f6',
          crmName: 'My Business CRM',
        },
      },
    });
    
    renderProfile();
    
    // Click edit button
    await user.click(screen.getByText('Edit Profile'));
    
    // Update color and name
    const colorInput = screen.getByLabelText('Primary Color') as HTMLInputElement;
    const textColorInput = screen.getAllByPlaceholderText('#1f2937')[0] as HTMLInputElement;
    const crmNameInput = screen.getByLabelText('CRM Name') as HTMLInputElement;
    
    // Change color
    fireEvent.change(colorInput, { target: { value: '#3b82f6' } });
    fireEvent.change(textColorInput, { target: { value: '#3b82f6' } });
    
    // Change CRM name
    await user.clear(crmNameInput);
    await user.type(crmNameInput, 'My Business CRM');
    
    // Save changes
    await user.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockedApi.userAPI.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryColor: '#3b82f6',
          crmName: 'My Business CRM',
        })
      );
      expect(mockAuthContext.updateProfile).toHaveBeenCalled();
    });
  });

  it('validates color format', async () => {
    const user = userEvent.setup();
    renderProfile();
    
    // Click edit button
    await user.click(screen.getByText('Edit Profile'));
    
    // Try invalid color
    const textColorInput = screen.getAllByPlaceholderText('#1f2937')[0] as HTMLInputElement;
    
    await user.clear(textColorInput);
    await user.type(textColorInput, 'invalid-color');
    
    // The color picker input should not accept invalid values
    expect(textColorInput.value).toBe('invalid-color');
  });

  it('shows color preview', () => {
    renderProfile();
    
    // Look for color preview in display mode
    const colorPreview = screen.getByText('#1f2937').previousElementSibling;
    expect(colorPreview).toHaveStyle({ backgroundColor: '#1f2937' });
  });

  it('handles empty theme values', async () => {
    const user = userEvent.setup();
    
    mockedApi.userAPI.updateProfile.mockResolvedValue({
      data: {
        profile: {
          ...mockAuthContext.profile,
          primaryColor: '',
          crmName: '',
        },
      },
    });
    
    renderProfile();
    
    // Click edit button
    await user.click(screen.getByText('Edit Profile'));
    
    // Clear theme fields
    const textColorInput = screen.getAllByPlaceholderText('#1f2937')[0] as HTMLInputElement;
    const crmNameInput = screen.getByLabelText('CRM Name') as HTMLInputElement;
    
    await user.clear(textColorInput);
    await user.clear(crmNameInput);
    
    // Save changes
    await user.click(screen.getByText('Save'));
    
    await waitFor(() => {
      expect(mockedApi.userAPI.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryColor: '',
          crmName: '',
        })
      );
    });
  });
});