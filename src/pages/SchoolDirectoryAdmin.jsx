import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { populateSchoolDirectory } from '@/api/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, MapPin, Search, Edit2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SchoolDirectoryAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: schools, isLoading } = useQuery({
    queryKey: ['school-directory', search],
    queryFn: async () => {
      const query = `
        query GetSchoolDirectory($search: String) {
          school_directory(
            where: { name: { _ilike: $search } }
            order_by: { name: asc }
            limit: 50
          ) {
            id
            name
            nces_id
            city
            state
            integration_enabled
            created_at
          }
        }
      `;
      const result = await graphqlRequest({
        query,
        variables: { search: `%${search}%` }
      });
      return result.school_directory;
    }
  });

  const updateSchoolMutation = useMutation({
    mutationFn: async ({ id, integration_enabled }) => {
      const query = `
        mutation UpdateSchool($id: uuid!, $integration_enabled: Boolean!) {
          update_school_directory_by_pk(
            pk_columns: { id: $id },
            _set: { integration_enabled: $integration_enabled }
          ) {
            id
            integration_enabled
          }
        }
      `;
      return graphqlRequest({ query, variables: { id, integration_enabled } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['school-directory']);
      toast({ title: 'School updated', description: 'Integration settings saved.' });
      // No local state to reset after saving.
    }
  });

  const handleEtlSync = async () => {
    setIsSyncing(true);
    try {
      const result = await populateSchoolDirectory({ mode: 'delta' });
      toast({
        title: 'Sync Initiated',
        description: `Job ID: ${result?.data?.jobId || 'Unknown'}. Process running in background.`
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            School Directory Management
          </h1>
          <p className="text-gray-600">
            Manage school entities and integration settings.
          </p>
        </div>
        <Button onClick={handleEtlSync} disabled={isSyncing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Run NCES Sync'}
        </Button>
      </header>

      <div className="flex items-center space-x-2 bg-white p-3 rounded border">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          className="border-none shadow-none focus-visible:ring-0"
          placeholder="Search schools..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>NCES ID</TableHead>
              <TableHead>Integrations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading directory...
                </TableCell>
              </TableRow>
            ) : (
              schools?.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell className="text-gray-500">
                    <div className="flex items-center text-xs">
                      <MapPin className="w-3 h-3 mr-1" />
                      {school.city}, {school.state}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {school.nces_id || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={school.integration_enabled ? 'default' : 'secondary'}>
                      {school.integration_enabled
                        ? 'Google Classroom Active'
                        : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit {school.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">
                              Enable Google Classroom Sync
                            </label>
                            <Switch
                              checked={school.integration_enabled}
                              onCheckedChange={(checked) =>
                                updateSchoolMutation.mutate({
                                  id: school.id,
                                  integration_enabled: checked
                                })
                              }
                            />
                          </div>
                          <p className="text-xs text-gray-500">
                            Enabling this allows teachers at this school domain to sync
                            rosters and assignments.
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
