import { Button } from './button';

export default {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export const Default = {
  args: {
    children: 'Primary Action',
  },
};

export const Destructive = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Disabled = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const IconOnly = {
  args: {
    size: 'icon',
    children: '★',
    'aria-label': 'Star',
  },
};
