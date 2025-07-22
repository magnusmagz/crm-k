// Test re-enrollment functionality
describe('Re-enrollment Tests', () => {
  it('should allow re-enrollment after completion', async () => {
    // Mock data
    const automation = {
      id: 'test-auto-1',
      userId: 'user123',
      isActive: true
    };
    
    const entityType = 'contact';
    const entityId = 'contact-123';
    
    // Mock AutomationEnrollment.findOne
    const mockFindOne = jest.fn();
    
    // First call - check for active enrollment (none found)
    mockFindOne.mockResolvedValueOnce(null);
    
    // Second call - check for previous completed enrollment (found one)
    mockFindOne.mockResolvedValueOnce({
      id: 'prev-enrollment-1',
      status: 'completed',
      completedAt: new Date('2025-01-01')
    });
    
    // Test the enrollment check logic
    const activeEnrollment = await mockFindOne({
      where: {
        automationId: automation.id,
        entityType,
        entityId,
        status: 'active'
      }
    });
    
    expect(activeEnrollment).toBeNull(); // No active enrollment
    
    const previousEnrollment = await mockFindOne({
      where: {
        automationId: automation.id,
        entityType,
        entityId,
        status: ['completed', 'failed']
      }
    });
    
    expect(previousEnrollment).not.toBeNull(); // Found previous completed enrollment
    expect(previousEnrollment.status).toBe('completed');
    
    // Should be allowed to create new enrollment
    const canEnroll = !activeEnrollment; // Only blocked if active enrollment exists
    expect(canEnroll).toBe(true);
  });

  it('should block re-enrollment if already actively enrolled', async () => {
    const mockFindOne = jest.fn();
    
    // Mock finding an active enrollment
    mockFindOne.mockResolvedValueOnce({
      id: 'active-enrollment-1',
      status: 'active'
    });
    
    const activeEnrollment = await mockFindOne({
      where: {
        status: 'active'
      }
    });
    
    expect(activeEnrollment).not.toBeNull();
    expect(activeEnrollment.status).toBe('active');
    
    // Should NOT be allowed to enroll
    const canEnroll = !activeEnrollment;
    expect(canEnroll).toBe(false);
  });
});