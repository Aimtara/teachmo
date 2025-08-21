
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function WelcomeCard() {
  return (
    <Card className="border-0 shadow-xl overflow-hidden" style={{background: 'linear-gradient(135deg, var(--teachmo-sage), var(--teachmo-sage-light))'}}>
      <CardContent className="p-0">
        <div className="p-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome to Teachmo!</h2>
                <p className="opacity-90">Your AI-powered parenting companion</p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-3">What Teachmo offers:</h3>
              <ul className="space-y-2 text-sm opacity-90">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  Personalized daily parenting tips based on your child's age and interests
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  Age-appropriate activities to boost development and learning
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  Progress tracking to celebrate milestones and growth
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  Research-backed guidance tailored to your parenting goals
                </li>
              </ul>
            </div>

            <Link to={createPageUrl("Settings")}>
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-50 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Users className="w-5 h-5 mr-2" />
                Add Your First Child
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
