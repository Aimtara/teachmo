import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlRequest } from '@/lib/graphql';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Search, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminSchoolRequests() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['school-requests', filter],
    queryFn: async () => {
      const query = `
        query GetSchoolRequests($status: String) {
          school_participation_requests(
            where: { status: { _eq: $status } }
            order_by: { created_at: desc }
          ) {
            id
            school_name
            school_domain
            status
            notes
            user {
              id
              display_name
              email
            }
            created_at
          }
        }
      `;
      const result = await graphqlRequest({
        query,
        variables: { status: filter === 'all' ? undefined : filter }
      });
      return result.school_participation_requests;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const query = `
        mutation UpdateRequest($id: uuid!, $status: String!) {
          update_school_participation_requests_by_pk(
            pk_columns: { id: $id },
            _set: { status: $status }
          ) {
            id
            status
          }
        }
      `;
      return graphqlRequest({ query, variables: { id, status } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['school-requests']);
    }
  });

  const filteredRequests =
    requests?.filter(
      (request) =>
        request.school_name.toLowerCase().includes(search.toLowerCase()) ||
        request.user?.email?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">School Requests</h1>
          <p className="text-gray-600">
            Review and approve requests from parents and teachers.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={filter === 'pending' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Badge>
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            All History
          </Badge>
        </div>
      </header>

      <div className="flex items-center space-x-2 bg-white p-2 rounded border border-gray-200">
        <Search className="w-4 h-4 text-gray-400" />
        <Input
          className="border-none shadow-none focus-visible:ring-0"
          placeholder="Search by school name or requester email..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {isLoading ? (
        <p>Loading requests...</p>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.length === 0 && (
            <p className="text-gray-500">No requests found.</p>
          )}

          {filteredRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{request.school_name}</h3>
                    {request.school_domain && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {request.school_domain}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <span>
                      Requested by {request.user?.display_name || 'Unknown'}
                    </span>
                    <span className="flex items-center text-gray-400">
                      <Mail className="w-3 h-3 mr-1" /> {request.user?.email}
                    </span>
                  </div>
                  {request.notes && (
                    <div className="text-sm bg-yellow-50 p-2 rounded text-yellow-800 mt-2 border border-yellow-100">
                      Note: {request.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: request.id,
                            status: 'rejected'
                          })
                        }
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() =>
                          updateStatusMutation.mutate({
                            id: request.id,
                            status: 'approved'
                          })
                        }
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve & Create
                      </Button>
                    </>
                  )}
                  {request.status !== 'pending' && (
                    <Badge
                      variant={request.status === 'approved' ? 'success' : 'secondary'}
                    >
                      {request.status.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
