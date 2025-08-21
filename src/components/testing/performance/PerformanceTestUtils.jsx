import React, { useState, useEffect } from 'react';
import { Workshop, WorkshopRegistration, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Video, FileText, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, isAfter, isBefore, addMinutes } from 'date-fns';

export default function WorkshopCenter() {
  const [workshops, setWorkshops] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await User.me();
      setUser(userData);

      const [workshopsData, registrationsData] = await Promise.all([
        Workshop.filter({}, '-scheduled_date'),
        WorkshopRegistration.filter({ user_id: userData.id })
      ]);

      setWorkshops(workshopsData);
      setMyRegistrations(registrationsData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load workshops."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const registerForWorkshop = async (workshopId) => {
    try {
      await WorkshopRegistration.create({
        workshop_id: workshopId,
        user_id: user.id
      });

      // Update workshop participant count
      const workshop = workshops.find(w => w.id === workshopId);
      if (workshop) {
        await Workshop.update(workshopId, {
          current_participants: workshop.current_participants + 1
        });
      }

      toast({
        title: "Registered!",
        description: "You've successfully registered for the workshop."
      });

      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to register for workshop."
      });
    }
  };

  const getWorkshopStatus = (workshop) => {
    const now = new Date();
    const startTime = new Date(workshop.scheduled_date);
    const endTime = addMinutes(startTime, workshop.duration_minutes);

    if (isBefore(now, startTime)) return 'upcoming';
    if (isAfter(now, endTime)) return 'completed';
    return 'live';
  };

  const isRegistered = (workshopId) => {
    return myRegistrations.some(reg => reg.workshop_id === workshopId);
  };

  const WorkshopCard = ({ workshop }) => {
    const status = getWorkshopStatus(workshop);
    const registered = isRegistered(workshop.id);
    const isFull = workshop.current_participants >= workshop.max_participants;

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{workshop.title}</CardTitle>
              <p className="text-gray-600 mt-1">{workshop.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge 
                  className={
                    workshop.topic === 'parenting' ? 'bg-purple-100 text-purple-800' :
                    workshop.topic === 'homework_help' ? 'bg-blue-100 text-blue-800' :
                    workshop.topic === 'behavior_management' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }
                >
                  {workshop.topic.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="outline"
                  className={
                    status === 'live' ? 'border-red-500 text-red-700' :
                    status === 'upcoming' ? 'border-blue-500 text-blue-700' :
                    'border-gray-500 text-gray-700'
                  }
                >
                  {status === 'live' ? 'LIVE NOW' : status}
                </Badge>
                {workshop.is_premium && (
                  <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                )}
              </div>
            </div>
            {registered && (
              <Badge className="bg-green-100 text-green-800">
                Registered
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(workshop.scheduled_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(workshop.scheduled_date), 'h:mm a')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{workshop.current_participants}/{workshop.max_participants} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{workshop.duration_minutes} minutes</span>
                </div>
              </div>
            </div>

            <div className="text-sm">
              <span className="font-medium">Facilitator: </span>
              <span className="text-gray-600">{workshop.facilitator_name}</span>
            </div>

            <div className="flex justify-end gap-2">
              {status === 'live' && registered && workshop.meeting_url && (
                <Button asChild>
                  <a href={workshop.meeting_url} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4 mr-1" />
                    Join Now
                  </a>
                </Button>
              )}
              
              {status === 'upcoming' && !registered && (
                <Button 
                  onClick={() => registerForWorkshop(workshop.id)}
                  disabled={isFull || (workshop.is_premium && user?.subscription_tier !== 'premium')}
                >
                  {isFull ? 'Full' : 'Register'}
                </Button>
              )}

              {status === 'completed' && workshop.recording_url && (
                <Button variant="outline" asChild>
                  <a href={workshop.recording_url} target="_blank" rel="noopener noreferrer">
                    <Video className="w-4 h-4 mr-1" />
                    View Recording
                  </a>
                </Button>
              )}

              {workshop.materials_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={workshop.materials_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-4 h-4 mr-1" />
                    Materials
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading workshops...</div>;
  }

  const upcomingWorkshops = workshops.filter(w => getWorkshopStatus(w) === 'upcoming');
  const liveWorkshops = workshops.filter(w => getWorkshopStatus(w) === 'live');
  const completedWorkshops = workshops.filter(w => getWorkshopStatus(w) === 'completed');
  const myWorkshops = workshops.filter(w => isRegistered(w.id));

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workshop Center</h1>
        <p className="text-gray-600 mt-1">Join live workshops and Q&A sessions with parenting experts</p>
      </div>

      {liveWorkshops.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            Live Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveWorkshops.map(workshop => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="my-workshops">My Workshops</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="topics">Browse by Topic</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingWorkshops.map(workshop => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
            {upcomingWorkshops.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming workshops</h3>
                <p className="text-gray-600">New workshops will be scheduled soon. Check back later!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-workshops" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myWorkshops.map(workshop => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
            {myWorkshops.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No registered workshops</h3>
                <p className="text-gray-600">Register for workshops to see them here!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recordings" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedWorkshops.filter(w => w.recording_url).map(workshop => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
            {completedWorkshops.filter(w => w.recording_url).length === 0 && (
              <div className="col-span-3 text-center py-12">
                <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No recordings available</h3>
                <p className="text-gray-600">Workshop recordings will appear here after sessions are completed.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="topics" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {['parenting', 'homework_help', 'behavior_management', 'communication', 'development', 'health'].map(topic => (
              <Button key={topic} variant="outline" className="h-auto p-4">
                <div className="text-center">
                  <div className="font-medium capitalize">{topic.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {workshops.filter(w => w.topic === topic).length} workshops
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
