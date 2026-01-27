import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { graphqlRequest } from '@/lib/graphql';
import { createLogger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const logger = createLogger('AdminSISDataManager');

const SIS_TABLES = [
  { name: 'sis_roster_students', columns: ['id', 'student_id', 'student_name', 'grade', 'status'] },
  { name: 'sis_roster_teachers', columns: ['id', 'teacher_id', 'teacher_name', 'status'] },
  { name: 'sis_roster_classes', columns: ['id', 'class_id', 'class_name', 'term', 'status'] },
  { name: 'sis_roster_enrollments', columns: ['id', 'enrollment_id', 'student_id', 'class_id', 'status'] },
];

export default function AdminSISDataManager() {
  const [table, setTable] = useState('sis_roster_students');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchRecords = async (tableName) => {
    try {
      const cols = SIS_TABLES.find((t) => t.name === tableName).columns.join(', ');
      const query = `query GetRecords { ${tableName}(limit: 20) { ${cols} } }`;
      const res = await graphqlRequest(query);
      setRecords(res[tableName]);
    } catch (err) {
      logger.error('Failed to fetch records', err);
      toast.error('Failed to load records');
    }
  };

  useEffect(() => {
    fetchRecords(table);
  }, [table]);

  const handleOpenRecord = (record) => {
    setSelectedRecord(record);
    setIsOpen(true);
  };

  const handleSave = async () => {
    try {
      const columns = SIS_TABLES.find((t) => t.name === table).columns;
      const updates = {};
      columns.forEach((col) => {
        if (col !== 'id') updates[col] = selectedRecord[col];
      });
      const mutation = `mutation UpdateRecord($id: uuid!, $data: ${table}_set_input!) {
        update_${table}_by_pk(pk_columns: {id: $id}, _set: $data) { id }
      }`;
      await graphqlRequest(mutation, { id: selectedRecord.id, data: updates });
      toast.success('Record updated');
      setIsOpen(false);
      await fetchRecords(table);
    } catch (err) {
      logger.error('Failed to update record', err);
      toast.error('Update failed');
    }
  };

  const handleChangeField = (field, value) => {
    setSelectedRecord((prev) => ({ ...prev, [field]: value }));
  };

  const currentColumns = SIS_TABLES.find((t) => t.name === table).columns;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">SIS Data Manager</h1>
      <Card>
        <CardHeader>
          <CardTitle>Select Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm space-y-2">
            <label className="text-sm font-medium">Table</label>
            <Select value={table} onChange={(e) => setTable(e.target.value)}>
              {SIS_TABLES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {currentColumns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.id}>
                  {currentColumns.map((col) => (
                    <TableCell key={`${rec.id}-${col}`}>{rec[col]}</TableCell>
                  ))}
                  <TableCell>
                    <Button size="sm" onClick={() => handleOpenRecord(rec)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedRecord &&
              currentColumns
                .filter((c) => c !== 'id')
                .map((field) => (
                  <div key={field} className="space-y-2">
                    <label className="text-sm font-medium">{field}</label>
                    <Input
                      value={selectedRecord[field] || ''}
                      onChange={(e) => handleChangeField(field, e.target.value)}
                    />
                  </div>
                ))}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
