import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Loader2, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SuggestedPodTopics({ onGenerate, suggestions, isLoading, onSelectTopic }) {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-purple-600" />
          Need Pod Ideas?
        </CardTitle>
        <CardDescription>
          Get AI-powered suggestions for new pods based on your family's interests and goals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-500" />
            <p className="mt-2 text-sm text-gray-600">Generating personalized ideas...</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{suggestion.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    {suggestion.tags?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {suggestion.tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectTopic(suggestion)}
                    className="shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Click the button to get some fresh ideas!</p>
            <Button onClick={onGenerate} style={{backgroundColor: 'var(--teachmo-sage)'}}>
              <Sparkles className="w-4 h-4 mr-2" />
              Get AI Suggestions
            </Button>
          </div>
        )}
        
        {suggestions.length > 0 && (
          <div className="text-center mt-6">
            <Button variant="ghost" onClick={onGenerate} disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate More Ideas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}