import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Temporary stub to unblock build.
 * TODO: implement real assignment listing + CRUD.
 */
export default function AssignmentsView({ classData, currentUser }) {
  const courseName = classData?.course?.name || classData?.course?.title || "This class";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <div className="text-lg font-semibold">Assignments</div>
          <div className="text-sm opacity-70">
            {courseName} • Students: {classData?.studentCount ?? "—"}
          </div>
        </div>

        <div className="text-sm">
          AssignmentsView is currently missing from the codebase. This placeholder keeps builds green
          while the real UI/API wiring is implemented.
        </div>

        <div className="flex gap-2">
          <Button size="sm" disabled>
            Create Assignment
          </Button>
          <Button size="sm" variant="outline" disabled>
            Import / Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
