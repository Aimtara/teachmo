import { Command } from 'cmdk';
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext.js';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { role } = useContext(UserContext);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const commands = [
    { label: 'Home', action: () => navigate('/'), roles: ['student', 'admin'] },
    { label: 'About', action: () => navigate('/about'), roles: ['admin'] }
  ];

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Palette">
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        {commands
          .filter(c => c.roles.includes(role))
          .map(c => (
            <Command.Item key={c.label} onSelect={() => { c.action(); setOpen(false); }}>
              {c.label}
            </Command.Item>
          ))}
      </Command.List>
    </Command.Dialog>
  );
}
