import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Bookmark, 
  Share2, 
  Copy, 
  ExternalLink,
  ArrowRight,
  MoreHorizontal,
  Send
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function ResultCard({ result, onAction }) {
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!result) return null;

  const handlePrimaryAction = () => {
    if (!result.cta_primary) return;
    
    const action = result.cta_primary.action;
    const data = result.cta_primary.data;
    
    switch (action) {
      case 'add_to_calendar':
        // Integration with calendar system
        toast({
          title: "Added to calendar",
          description: "Activity has been scheduled for your family.",
        });
        break;
        
      case 'navigate':
        if (data?.url) {
          navigate(createPageUrl(data.url.replace('/', '')));
        }
        break;
        
      case 'bookmark':
        toast({
          title: "Saved!",
          description: "This has been added to your saved items.",
        });
        break;
        
      case 'send_message':
        // Would integrate with messaging system
        toast({
          title: "Message ready",
          description: "Your translated message is ready to send.",
        });
        break;
        
      case 'create_activity':
        // Would create a custom activity
        toast({
          title: "Activity created",
          description: "A custom activity has been created for your child.",
        });
        break;
        
      default:
        if (onAction) {
          onAction(action, data);
        }
    }
  };

  const handleSecondaryAction = (actionItem) => {
    const action = actionItem.action;
    const data = actionItem.data;
    
    switch (action) {
      case 'copy_text':
        if (data?.text) {
          navigator.clipboard.writeText(data.text);
          toast({
            title: "Copied!",
            description: "Text copied to clipboard.",
          });
        }
        break;
        
      case 'navigate':
        if (actionItem.url) {
          navigate(createPageUrl(actionItem.url.replace('/', '')));
        }
        break;
        
      case 'bookmark':
        toast({
          title: "Saved!",
          description: "This has been bookmarked for later.",
        });
        break;
        
      default:
        if (onAction) {
          onAction(action, data);
        }
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'add_to_calendar': return Calendar;
      case 'bookmark': return Bookmark;
      case 'send_message': return Send;
      case 'navigate': return ExternalLink;
      case 'copy_text': return Copy;
      case 'share': return Share2;
      default: return ArrowRight;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                {result.title}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                Teachmo™
              </Badge>
            </div>
            {result.cta_secondary && result.cta_secondary.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {result.cta_secondary.map((action, index) => {
                    const IconComponent = getActionIcon(action.action);
                    return (
                      <DropdownMenuItem
                        key={index}
                        onClick={() => handleSecondaryAction(action)}
                      >
                        <IconComponent className="w-4 h-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result.body}
            </div>
          </div>
          
          {result.cta_primary && (
            <div className="flex justify-start">
              <Button 
                onClick={handlePrimaryAction}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {React.createElement(getActionIcon(result.cta_primary.action), { 
                  className: "w-4 h-4 mr-2" 
                })}
                {result.cta_primary.label}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
