import React, { useState, useEffect } from 'react';
import { Task, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskCard from '@/components/help-board/TaskCard';
import CreatePostForm from '@/components/community/CreatePostForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function HelpBoard() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Load all volunteer tasks
      const tasksData = await Task.filter({
        category: { $in: ['volunteer', 'fundraising', 'event_help', 'classroom_support', 'pta_general'] }
      });
      setTasks(tasksData);
      setFilteredTasks(tasksData);
    } catch (error) {
      console.error("Failed to load help board data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load volunteer opportunities.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(task => task.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, categoryFilter, statusFilter]);

  const handlePostCreated = () => {
    setShowCreateModal(false);
    loadData();
  };

  if (isLoading) {
    return <div className="p-6">Loading volunteer opportunities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Help Board</h2>
          <p className="text-gray-600">Find volunteer opportunities and help your school community.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Post Volunteer Request
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search volunteer opportunities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="volunteer">General Volunteer</SelectItem>
                <SelectItem value="fundraising">Fundraising</SelectItem>
                <SelectItem value="event_help">Event Help</SelectItem>
                <SelectItem value="classroom_support">Classroom Support</SelectItem>
                <SelectItem value="pta_general">PTA Activities</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Grid */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Volunteer Opportunities</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                ? 'No opportunities match your current filters.' 
                : 'Be the first to post a volunteer opportunity!'}
            </p>
            {(!searchQuery && categoryFilter === 'all' && statusFilter === 'all') && (
              <Button onClick={() => setShowCreateModal(true)} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Post First Opportunity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              currentUser={user}
              onUpdate={loadData}
            />
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Volunteer Opportunity</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <CreatePostForm 
              currentUser={user} 
              onPostCreated={handlePostCreated} 
              initialType="task" 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}