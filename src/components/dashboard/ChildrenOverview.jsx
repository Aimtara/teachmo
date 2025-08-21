import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Plus, Calendar, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInYears } from "date-fns";

export default function ChildrenOverview({ children }) {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            My Children
          </CardTitle>
          <Link to={createPageUrl("Children")}>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Child
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {children.length > 0 ? (
          <div className="space-y-3">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl" 
                style={{backgroundColor: 'var(--teachmo-cream)'}}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{backgroundColor: 'var(--teachmo-coral)'}}
                    >
                      {child.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{child.name}</h3>
                      <p className="text-sm text-gray-600">
                        {child.age} years old
                        {child.birth_date && (
                          <span className="ml-2">
                            • Born {format(new Date(child.birth_date), 'MMM yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {child.interests && child.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {child.interests.slice(0, 3).map((interest, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-white/80">
                        {interest}
                      </Badge>
                    ))}
                    {child.interests.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-white/80">
                        +{child.interests.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {child.development_goals && child.development_goals.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Current Focus:</p>
                    <p className="text-xs text-gray-600">
                      {child.development_goals[0]}
                      {child.development_goals.length > 1 && ` +${child.development_goals.length - 1} more`}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Heart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 mb-3">No children added yet</p>
            <Link to={createPageUrl("Children")}>
              <Button size="sm" style={{backgroundColor: 'var(--teachmo-sage)'}}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Child
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
