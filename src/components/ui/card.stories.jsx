import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

export default {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};

export const Default = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Workflow Summary</CardTitle>
        <CardDescription>Automation details for the current flow.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Students receive a reminder when they have not completed an assignment in 48 hours.
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm">Review</Button>
      </CardFooter>
    </Card>
  ),
};

export const Hoverable = {
  render: () => (
    <Card className="max-w-sm" isHoverable>
      <CardHeader>
        <CardTitle>Hoverable Card</CardTitle>
        <CardDescription>Highlights when hovered for emphasis.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Useful for dashboard highlights or status cards.</p>
      </CardContent>
    </Card>
  ),
};
