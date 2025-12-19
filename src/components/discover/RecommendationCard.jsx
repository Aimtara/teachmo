import PropTypes from 'prop-types';
import { BookmarkPlus, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/shared/UltraMinimalToast';

export default function RecommendationCard({ recommendation }) {
  const {
    title,
    summary,
    tags = [],
    subject,
    gradeLevel,
    ctaLabel = 'View details',
    ctaHref
  } = recommendation || {};

  const handleSave = () => {
    showToast('Saved to your list', { description: title || 'Recommendation saved' });
  };

  const handleOpen = () => {
    if (ctaHref) {
      window.open(ctaHref, '_blank', 'noopener,noreferrer');
    } else {
      showToast('More details coming soon', { description: title || 'This card is a preview.' });
    }
  };

  return (
    <Card className="h-full border border-gray-200">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-gray-900">{title || 'Untitled'}</CardTitle>
          <p className="text-sm text-gray-600">{summary || 'A curated learning experience awaits.'}</p>
        </div>
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {subject ? <Badge variant="secondary">{subject}</Badge> : null}
          {gradeLevel ? <Badge variant="secondary">Grade {gradeLevel}</Badge> : null}
          {tags?.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleSave}>
          <BookmarkPlus className="h-4 w-4" />
          Save
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleOpen}>
          {ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

RecommendationCard.propTypes = {
  recommendation: PropTypes.shape({
    title: PropTypes.string,
    summary: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    subject: PropTypes.string,
    gradeLevel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ctaLabel: PropTypes.string,
    ctaHref: PropTypes.string
  })
};
