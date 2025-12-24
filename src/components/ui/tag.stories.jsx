import { Tag } from './tag';

export default {
  title: 'UI/Tag',
  component: Tag,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline'],
    },
  },
};

export const Default = {
  args: {
    children: 'In Progress',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Draft',
  },
};

export const Outline = {
  args: {
    variant: 'outline',
    children: 'Needs Review',
  },
};
