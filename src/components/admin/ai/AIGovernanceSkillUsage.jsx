import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIGovernanceSkillUsage({ skills = [] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {skills.length === 0 ? (
          <div className="text-muted-foreground">No governed skill activity recorded for this window.</div>
        ) : (
          <ul className="space-y-2">
            {skills.map((item) => (
              <li key={item.skill} className="flex items-center justify-between rounded-md border p-3">
                <span>{item.skill}</span>
                <span className="font-semibold">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}


AIGovernanceSkillUsage.propTypes = {
  skills: PropTypes.arrayOf(
    PropTypes.shape({
      skill: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ),
};
