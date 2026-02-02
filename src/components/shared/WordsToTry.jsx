import React from 'react';

export const WordsToTry = ({ script }) => {
  return (
    <div className="my-4 rounded-r-lg border-l-4 border-secondary bg-secondary/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Words to try
      </p>
      <p className="text-lg font-heading italic text-primary">"{script}"</p>
    </div>
  );
};
