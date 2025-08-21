import React, { useState, useEffect } from "react";
import { User, Child } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Target, 
  Clock, 
  Bell, 
  Edit, 
  Mail, 
  CheckCircle2, 
  Sparkles,
  Heart,
  Calendar,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SendEmail } from "@/api/integrations";
import { motion } from "framer-motion";

export default function PersonalizationSummary({ user, onSendEmail }) {
  const [children, setChildren] = useState([]);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const loadChildren = async () => {
      try {
        const childrenData = await Child.list('-created_date');
        setChildren(childrenData);
      } catch (e) {
        console.error("Error loading children:", e);
      }
    };
    loadChildren();
  }, []);

  const handleSendSetupEmail = async () => {
    setIsEmailSending(true);
    try {
      const setupSummary = generateSetupSummary();
      await SendEmail({
        to: user.email,
        subject: "Your Teachmo Setup Summary 🌟",
        body: setupSummary
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (e) {
      console.error("Error sending setup email:", e);
    }
    setIsEmailSending(false);
  };

  const generateSetupSummary = () => {
    const childProfiles = children.map(child => 
      `${child.name}, ${child.age} years old - ${child.interests?.join(', ') || 'Exploring new interests'}`
    ).join('\n');

    const schedule = user.scheduling_preferences 
      ? `${user.scheduling_preferences.days?.join(', ')} at ${user.scheduling_preferences.time_slots?.join(' and ')}`
      : 'Flexible timing';

    const notificationStyle = user.notification_preferences?.preset || 'Default';

    return `Hi ${user.full_name}!

Welcome to Teachmo! Here's your personalized setup:

👨‍👩‍👧‍👦 YOUR CHILDREN:
${childProfiles || 'No child profiles added yet'}

🎯 YOUR PARENTING STYLE:
${user.parenting_style ? user.parenting_style.charAt(0).toUpperCase() + user.parenting_style.slice(1) : 'Not specified yet'}

📅 YOUR SCHEDULE:
${schedule}

🔔 NOTIFICATION STYLE:
${notificationStyle} notifications

🌟 DEVELOPMENT GOALS:
${children.flatMap(c => c.development_goals || []).join(', ') || 'Building well-rounded development'}

Ready to start your parenting journey with us!

Love,
The Teachmo Team ❤️

P.S. You can always update these settings in your profile anytime.`;
  };

  const getScheduleText = () => {
    const prefs = user.scheduling_preferences;
    if (!prefs || !prefs.days || !prefs.time_slots) return "As needed";
    return `${prefs.days.join(', ')} at ${prefs.time_slots.join(' and ')}`;
  };

  const getNotificationText = () => {
    const prefs = user.notification_preferences;
    if (!prefs) return "Default settings";
    return `${prefs.preset} style, ${prefs.frequency} via ${prefs.delivery_method}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 text-2xl font-bold text-gray-900 mb-2"
        >
          <Sparkles className="w-6 h-6" style={{color: 'var(--teachmo-sage)'}} />
          You're all set! 🎉
        </motion.div>
        <p className="text-gray-600">Here's what we've crafted together for your personalized Teachmo experience.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Child Profiles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                Your Children
              </div>
              <Link to={createPageUrl("Settings")}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length > 0 ? (
              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
                      />
                      <span className="font-medium">{child.name}, {child.age} years old</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Interests: {child.interests?.join(', ') || 'Exploring new things'}
                    </p>
                    {child.development_goals && child.development_goals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {child.development_goals.slice(0, 3).map((goal, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {goal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No child profiles added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Parenting Style */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                Your Style
              </div>
              <Link to={createPageUrl("Profile", { tab: 'parenting' })}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user.parenting_style ? (
              <div className="space-y-3">
                <Badge className="bg-purple-100 text-purple-800">
                  {user.parenting_style.charAt(0).toUpperCase() + user.parenting_style.slice(1)} Parenting
                </Badge>
                {user.parenting_philosophy && (
                  <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
                    {user.parenting_philosophy}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Take the parenting style quiz to get personalized recommendations</p>
            )}
          </CardContent>
        </Card>

        {/* Schedule Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                Your Schedule
              </div>
              <Link to={createPageUrl("Profile", { tab: 'preferences' })}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{getScheduleText()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Timezone: {user.timezone || 'Not set'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
                Notifications
              </div>
              <Link to={createPageUrl("Profile", { tab: 'notifications' })}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">{getNotificationText()}</p>
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Preview: "Try this 10-min creativity boost with Maya this afternoon!"
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-gray-200">
        <Button
          onClick={handleSendSetupEmail}
          disabled={isEmailSending}
          variant="outline"
          className="flex items-center gap-2"
        >
          {isEmailSending ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Mail className="w-4 h-4" />
              </motion.div>
              Sending...
            </>
          ) : emailSent ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Email Sent!
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Email Me My Setup
            </>
          )}
        </Button>

        <Link to={createPageUrl("Dashboard")}>
          <Button style={{backgroundColor: 'var(--teachmo-sage)'}} className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Enter Teachmo
          </Button>
        </Link>
      </div>
    </div>
  );
}