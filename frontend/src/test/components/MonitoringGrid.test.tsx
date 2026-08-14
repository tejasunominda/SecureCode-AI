import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockSessionList = vi.fn();
vi.mock('@/hooks/useProctoringStream', () => ({
  useProctoringStream: () => ({
    sessionList: mockSessionList(),
    connected: true,
    clearSession: vi.fn(),
  }),
}));

vi.mock('@/lib/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

import { MonitoringGrid } from '@/components/proctoring/MonitoringGrid';

const sessions = [
  {
    sessionId: 'session-1',
    candidateName: 'Alice Johnson',
    riskScore: 25,
    cameraActive: true,
    eventType: 'normal',
    warnings: 0,
  },
  {
    sessionId: 'session-2',
    candidateName: 'Bob Smith',
    riskScore: 75,
    cameraActive: false,
    eventType: 'face_lost',
    warnings: 3,
  },
  {
    sessionId: 'session-3',
    candidateName: 'Charlie Brown',
    riskScore: 50,
    cameraActive: true,
    eventType: 'tab_switch',
    warnings: 1,
  },
];

describe('MonitoringGrid', () => {
  beforeEach(() => {
    mockSessionList.mockReset();
  });

  it('renders all sessions by default', () => {
    mockSessionList.mockReturnValue(sessions);
    render(<MonitoringGrid />);

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('filters by search term on candidate name', () => {
    mockSessionList.mockReturnValue(sessions);
    render(<MonitoringGrid />);

    const searchInput = screen.getByPlaceholderText('Search by name or session ID...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('filters by risk level', () => {
    mockSessionList.mockReturnValue(sessions);
    render(<MonitoringGrid />);

    const riskSelect = screen.getByDisplayValue('All Risk Levels');
    fireEvent.change(riskSelect, { target: { value: 'high' } });

    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('selects multiple sessions via checkboxes', () => {
    mockSessionList.mockReturnValue(sessions);
    render(<MonitoringGrid />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
  });

  it('shows empty state when no sessions match filter', () => {
    mockSessionList.mockReturnValue(sessions);
    render(<MonitoringGrid />);

    const searchInput = screen.getByPlaceholderText('Search by name or session ID...');
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });

    expect(screen.getByText(/no sessions match/i)).toBeInTheDocument();
  });

  it('shows empty state when no sessions exist', () => {
    mockSessionList.mockReturnValue([]);
    render(<MonitoringGrid />);

    expect(screen.getByText(/no active sessions/i)).toBeInTheDocument();
  });
});
