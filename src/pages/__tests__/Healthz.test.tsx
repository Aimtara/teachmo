import { render, screen } from '@testing-library/react';
import Healthz from '../Healthz';

describe('Healthz', () => {
  it('renders deploy verification payload without requiring auth', () => {
    render(<Healthz />);

    expect(screen.getByText('Health check')).toBeInTheDocument();
    expect(screen.getByText('Public deploy verification endpoint for ops and automated checks.')).toBeInTheDocument();
    expect(screen.getByText('Raw payload')).toBeInTheDocument();
    expect(screen.getByText('Nhost configured')).toBeInTheDocument();
    expect(screen.getByText('Maintenance mode')).toBeInTheDocument();
  });
});
