import React, { useState, useEffect } from 'react';
import { Poll, PollVote } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function PTAPolls({ poll, currentUser }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [currentPoll, setCurrentPoll] = useState(poll);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkIfVoted = async () => {
      if (!currentUser) return;
      try {
        const votes = await PollVote.filter({ poll_id: poll.id, user_id: currentUser.id });
        if (votes.length > 0) {
          setHasVoted(true);
          setSelectedOption(votes[0].selected_options[0]);
        }
      } catch (error) {
        console.error("Error checking vote status:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkIfVoted();
  }, [poll.id, currentUser]);

  const handleVote = async () => {
    if (!selectedOption || hasVoted) return;
    setIsLoading(true);
    try {
      await PollVote.create({
        poll_id: poll.id,
        user_id: currentUser.id,
        selected_options: [selectedOption],
      });

      // Optimistically update UI, then fetch real data
      const updatedOptions = currentPoll.options.map(opt => 
        opt.id === selectedOption ? { ...opt, votes: opt.votes + 1 } : opt
      );
      const updatedPoll = { ...currentPoll, options: updatedOptions, total_votes: currentPoll.total_votes + 1 };
      setCurrentPoll(updatedPoll);
      setHasVoted(true);

      // Fetch the updated poll from the server to ensure data consistency
      const freshPoll = await Poll.get(poll.id);
      setCurrentPoll(freshPoll);
      
      toast({ title: "Vote cast successfully!" });
    } catch (error) {
      console.error("Error casting vote:", error);
      toast({ variant: "destructive", title: "Failed to cast vote." });
    } finally {
      setIsLoading(false);
    }
  };

  const isPollClosed = new Date(currentPoll.closes_at) < new Date();

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-800">{currentPoll.question}</h4>
      
      {isPollClosed || hasVoted ? (
        // Results view
        <div className="space-y-3">
          {currentPoll.options.map(option => {
            const percentage = currentPoll.total_votes > 0 ? (option.votes / currentPoll.total_votes) * 100 : 0;
            return (
              <div key={option.id}>
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="font-medium text-gray-700">{option.text}</span>
                  <span className="text-gray-500">{percentage.toFixed(0)}% ({option.votes} votes)</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
          <p className="text-xs text-gray-500 pt-2 border-t mt-3">
            {isPollClosed ? 'Poll closed.' : 'You have voted.'} Total votes: {currentPoll.total_votes}
          </p>
        </div>
      ) : (
        // Voting view
        <>
          <RadioGroup onValueChange={setSelectedOption} value={selectedOption}>
            <div className="space-y-2">
              {currentPoll.options.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="font-normal">{option.text}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          <Button onClick={handleVote} disabled={!selectedOption || isLoading}>
            Submit Vote
          </Button>
        </>
      )}
    </div>
  );
}

export { PTAPolls };
